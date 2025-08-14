import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EventBus } from '../../game/EventBus';
import { NewsAgentService } from './news-agent.service';

interface NewsArticle {
    title: string;
    description?: string;
    source: { name?: string } | string;
    url?: string;
    publishedAt?: string;
}

interface SportsGame {
    homeTeam: string;
    awayTeam: string;
    score: string;
    status?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private cache = new Map<string, { data: any, timestamp: number }>();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Using proxy URLs or cached data sources that don't require API keys
    private readonly NEWS_API_PROXY = 'https://saurav.tech/NewsAPI/top-headlines/category';
    private readonly ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports';

    constructor(
        private http: HttpClient,
        private newsAgent: NewsAgentService
    ) {
        console.log('NewsService: Constructor called, setting up event listeners');
        this.setupEventListeners();
    }

    private setupEventListeners() {
        console.log('NewsService: Setting up event listeners');
        EventBus.on('request-news', (data: { category: string }) => {
            this.getNews(data.category).subscribe({
                next: (articles) => EventBus.emit('news-data-received', { articles }),
                error: (error) => EventBus.emit('news-error', { message: error.message })
            });
        });

        EventBus.on('request-sports-scores', () => {
            this.getSportsScores().subscribe({
                next: (games) => EventBus.emit('news-data-received', { games }),
                error: (error) => EventBus.emit('news-error', { message: error.message })
            });
        });

        EventBus.on('search-news', (data: { query: string }) => {
            // For demo purposes, return mock data based on query
            this.searchNews(data.query).subscribe({
                next: (articles) => EventBus.emit('news-data-received', { articles }),
                error: (error) => EventBus.emit('news-error', { message: error.message })
            });
        });

        // New event listeners for NewsAgent
        EventBus.on('request-newscast', (data: { category: string }) => {
            this.newsAgent.generateNewscast(data.category).subscribe({
                next: (newscast) => EventBus.emit('newscast-ready', newscast),
                error: (error) => EventBus.emit('news-error', { message: error.message })
            });
        });

        console.log('NewsService: Setting up process-news-query listener');
        EventBus.on('process-news-query', (data: { query: string }) => {
            console.log('🔥 NewsService: RECEIVED process-news-query event with data:', data);
            console.log('NewsService: Processing news query:', data.query);
            console.log('NewsService: NewsAgent instance:', this.newsAgent);
            this.newsAgent.processRequest(data.query).subscribe({
                next: (response) => {
                    console.log('✅ NewsService: Got response from NewsAgent:', response);
                    console.log('✅ NewsService: Emitting user-question-response event');
                    EventBus.emit('user-question-response', response);
                },
                error: (error) => {
                    console.error('❌ NewsService: Error processing query:', error);
                    EventBus.emit('news-error', { message: error.message });
                }
            });
        });

        EventBus.on('request-ticker-news', () => {
            this.getNews('general').subscribe({
                next: (articles) => EventBus.emit('ticker-news-ready', articles),
                error: (error) => console.warn('Ticker news fetch failed:', error)
            });
        });
    }

    getNews(category: string = 'general'): Observable<NewsArticle[]> {
        const cacheKey = `news-${category}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return of(cached);
        }

        // Using the proxy service that doesn't require API key
        const url = `${this.NEWS_API_PROXY}/${category}/us.json`;
        
        return this.http.get<any>(url).pipe(
            map(response => {
                const articles = response.articles || [];
                this.setCache(cacheKey, articles);
                return articles;
            }),
            catchError(error => {
                console.error('News API error:', error);
                // Return fallback data
                return of(this.getFallbackNews(category));
            })
        );
    }

    getSportsScores(): Observable<SportsGame[]> {
        const cacheKey = 'sports-scores';
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return of(cached);
        }

        // Try ESPN API for NFL scores (no auth required)
        const url = `${this.ESPN_API}/football/nfl/scoreboard`;
        
        return this.http.get<any>(url).pipe(
            map(response => {
                const games: SportsGame[] = [];
                const events = response.events || [];
                
                events.slice(0, 5).forEach((event: any) => {
                    const competition = event.competitions?.[0];
                    if (competition) {
                        const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
                        const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
                        
                        if (homeTeam && awayTeam) {
                            games.push({
                                homeTeam: homeTeam.team?.displayName || 'Home',
                                awayTeam: awayTeam.team?.displayName || 'Away',
                                score: `${homeTeam.score || 0} - ${awayTeam.score || 0}`,
                                status: competition.status?.type?.description || 'Scheduled'
                            });
                        }
                    }
                });
                
                this.setCache(cacheKey, games);
                return games;
            }),
            catchError(error => {
                console.error('Sports API error:', error);
                // Return fallback data
                return of(this.getFallbackSports());
            })
        );
    }

    searchNews(query: string): Observable<NewsArticle[]> {
        // Analyze query to determine best API/category
        const lowerQuery = query.toLowerCase();
        
        // Check for sports-related keywords
        if (this.isSportsQuery(lowerQuery)) {
            return this.getSportsScores().pipe(
                map(games => {
                    // Convert sports games to news articles format
                    return games.map(game => ({
                        title: `${game.homeTeam} vs ${game.awayTeam}`,
                        description: `Score: ${game.score} - Status: ${game.status}`,
                        source: 'ESPN Sports'
                    }));
                })
            );
        }
        
        // Determine news category based on keywords
        const category = this.inferCategory(lowerQuery);
        
        return this.getNews(category).pipe(
            map(articles => {
                // Filter articles based on query if possible
                const filtered = articles.filter(article => 
                    article.title?.toLowerCase().includes(lowerQuery) ||
                    article.description?.toLowerCase().includes(lowerQuery)
                );
                
                // Return filtered results or all results if no matches
                return filtered.length > 0 ? filtered : articles.slice(0, 3);
            })
        );
    }
    
    private isSportsQuery(query: string): boolean {
        const sportsKeywords = [
            'sport', 'game', 'score', 'match', 'team', 'player',
            'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 
            'basketball', 'baseball', 'hockey', 'championship',
            'league', 'tournament', 'espn', 'athlete'
        ];
        
        return sportsKeywords.some(keyword => query.includes(keyword));
    }
    
    private inferCategory(query: string): string {
        const categoryKeywords = {
            technology: ['tech', 'computer', 'software', 'ai', 'app', 'internet', 'cyber', 'digital', 'innovation', 'startup'],
            business: ['business', 'company', 'market', 'stock', 'economy', 'finance', 'trade', 'investment', 'corporate'],
            entertainment: ['movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'hollywood', 'show', 'concert'],
            science: ['science', 'research', 'study', 'space', 'discovery', 'experiment', 'scientist', 'physics', 'biology'],
            health: ['health', 'medical', 'doctor', 'hospital', 'disease', 'treatment', 'medicine', 'covid', 'vaccine'],
            sports: ['sport', 'game', 'team', 'player', 'score', 'match', 'league', 'championship']
        };
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => query.includes(keyword))) {
                return category;
            }
        }
        
        return 'general'; // Default category
    }

    private getFromCache(key: string): any {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    private getFallbackNews(category: string): NewsArticle[] {
        // Fallback data for demo purposes
        const fallbackData: Record<string, NewsArticle[]> = {
            general: [
                { title: 'Breaking: Major Tech Announcement Expected Today', source: 'Tech News', description: 'Industry leaders gather for conference' },
                { title: 'Global Climate Summit Reaches New Agreement', source: 'World News', description: 'Nations commit to ambitious targets' },
                { title: 'Stock Markets Hit Record Highs', source: 'Financial Times', description: 'Investors optimistic about growth' }
            ],
            sports: [
                { title: 'Championship Game Goes to Overtime', source: 'ESPN', description: 'Thrilling finish to season finale' },
                { title: 'Star Player Signs Record Contract', source: 'Sports Daily', description: 'Largest deal in league history' },
                { title: 'Underdog Team Stuns Champions', source: 'Sports News', description: 'Upset victory shocks fans' }
            ],
            technology: [
                { title: 'New AI Breakthrough Announced', source: 'Tech Weekly', description: 'Revolutionary advancement in machine learning' },
                { title: 'Quantum Computing Milestone Achieved', source: 'Science Today', description: 'Researchers solve complex problem' },
                { title: 'Space Mission Discovers New Planet', source: 'Space News', description: 'Potentially habitable world found' }
            ],
            business: [
                { title: 'Major Merger Creates Industry Giant', source: 'Business Daily', description: 'Two companies join forces' },
                { title: 'Startup Raises Billion Dollar Funding', source: 'Venture News', description: 'Record investment in new tech' },
                { title: 'Economic Growth Exceeds Expectations', source: 'Financial Report', description: 'Strong quarterly results' }
            ]
        };
        
        return fallbackData[category] || fallbackData['general'];
    }

    private getFallbackSports(): SportsGame[] {
        return [
            { homeTeam: 'Lakers', awayTeam: 'Celtics', score: '112 - 108', status: 'Final' },
            { homeTeam: 'Yankees', awayTeam: 'Red Sox', score: '5 - 3', status: 'Top 9th' },
            { homeTeam: 'Cowboys', awayTeam: 'Eagles', score: '21 - 17', status: '4th Quarter' },
            { homeTeam: 'Rangers', awayTeam: 'Bruins', score: '3 - 2', status: '3rd Period' }
        ];
    }
}