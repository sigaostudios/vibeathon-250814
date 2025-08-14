import { Injectable, Injector } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface NewsResponse {
    introduction?: string;
    stories: Array<{
        headline: string;
        content: string;
        commentary?: string;
    }>;
    signoff?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NewsAgentService {
    private readonly anchorName = 'Max Sterling';
    private readonly networkName = 'Sigao News';
    
    // Witty remarks database - SNL Weekend Update style
    private readonly wittyRemarks = {
        technology: [
            "And in other news, robots still can't fold fitted sheets. So we're safe... for now.",
            "Scientists say AI will never replace humans. The AI responded, 'That's cute.'",
            "Meanwhile, my printer still jams every time I actually need it. The future is now, folks!",
            "In related news, turning it off and on again remains humanity's greatest tech support strategy.",
            "Experts predict flying cars by 2030. I'm still waiting for a phone battery that lasts all day.",
            "And remember folks, the cloud is just someone else's computer. Sleep tight!"
        ],
        sports: [
            "In other news, my fantasy team continues to be more fantasy than team.",
            "Analysts are calling it the upset of the century. The century started Tuesday, but still...",
            "Meanwhile, I pulled a hamstring just watching that replay.",
            "Sports scientists confirm what we all suspected: the referee was indeed blind.",
            "In related news, couch coaching remains undefeated.",
            "And remember, it's not whether you win or lose, it's how you blame the refs."
        ],
        business: [
            "In other news, my portfolio is so diversified, even I don't know what I own anymore.",
            "Wall Street reacted to the news by doing that thing where they panic in expensive suits.",
            "Meanwhile, cryptocurrency remains as stable as a house of cards in a wind tunnel.",
            "Economists predict... well, let's be honest, they're just guessing like the rest of us.",
            "In related news, 'synergy' is still not a real word, no matter what your boss says.",
            "And remember folks, a bull market is when your stocks go up. A bear market is when your neighbor's do."
        ],
        entertainment: [
            "In other news, Hollywood ran out of original ideas sometime in 1987.",
            "Critics are calling it 'unmissable.' I'm calling it 'Tuesday.'",
            "Meanwhile, the real drama was in the parking lot trying to leave the theater.",
            "Sources close to the celebrity said... wait, who has sources close to celebrities?",
            "In related news, reality TV continues to be neither real nor television. Discuss.",
            "And that's why we can't have nice things, folks."
        ],
        general: [
            "In other news, Florida Man has been suspiciously quiet today. We're concerned.",
            "Meanwhile, local man discovers life hack: it's called 'reading the instructions.'",
            "Scientists confirm what we all knew: Monday is, in fact, the worst.",
            "In related news, correlation still doesn't imply causation, but it does waggle its eyebrows suggestively.",
            "And remember, we're all just making it up as we go along. Even me. Especially me.",
            "This just in: Everything is fine. We checked. It's not, but we checked."
        ],
        science: [
            "In other news, scientists discover new element: Surprise. It wasn't on the periodic table.",
            "Meanwhile, flat earthers around the globe continue to disagree.",
            "Researchers spent $2 million to discover people don't like being wet when it's cold. Groundbreaking.",
            "In related news, the scientific method is just fancy trial and error. Change my mind.",
            "Quantum physicists still can't explain why socks disappear in the dryer. Priorities, people!",
            "And remember, correlation doesn't imply causation, but it does give it meaningful looks."
        ],
        health: [
            "In other news, standing desks are the new sitting desks, which were the new standing desks.",
            "Doctors recommend 8 hours of sleep. I recommend winning the lottery. We all have dreams.",
            "Meanwhile, WebMD continues to diagnose everyone with everything.",
            "New study shows worrying about your health is bad for your health. Great, thanks.",
            "In related news, an apple a day keeps anyone away if you throw it hard enough.",
            "And remember folks, laughter is the best medicine. Unless you have appendicitis."
        ]
    };

    private readonly greetings = [
        "Good evening, I'm {{name}} and you're watching {{network}} - where the news is real and the commentary is questionable.",
        "Live from our state-of-the-art broom closet, I'm {{name}} with {{network}}.",
        "Welcome to {{network}}. I'm {{name}}, and I've been told I have a face for radio.",
        "This is {{network}}, I'm {{name}}, and yes, this is my real hair.",
        "Broadcasting from somewhere between panic and caffeine, I'm {{name}} with {{network}}."
    ];

    private readonly transitions = [
        "But wait, there's more...",
        "In a shocking turn of events that surprised no one...",
        "Meanwhile, in the real world...",
        "But here's where it gets interesting...",
        "And because 2024 wasn't weird enough already...",
        "In what can only be described as 'Tuesday'...",
        "Hold onto your keyboards, folks...",
        "And in today's episode of 'What Could Possibly Go Wrong'..."
    ];

    private readonly signoffs = [
        "This has been {{network}}. I'm {{name}}, and I'll be here all week. Unfortunately.",
        "For {{network}}, I'm {{name}}. Good night, and good luck figuring all this out.",
        "I'm {{name}}, and that's the news. Or at least what we're calling news these days.",
        "This is {{name}} signing off. Remember, if you didn't see it here, it probably still happened.",
        "Until next time, I'm {{name}}. Stay informed, stay confused, stay tuned to {{network}}."
    ];

    constructor(private injector: Injector) {}

    private callLLM(prompt: string): Observable<string> {
        console.log('🔴 NewsAgentService: callLLM called with prompt:', prompt);
        return from(this.makeLLMRequest(prompt)).pipe(
            catchError(error => {
                console.warn('🔴 LLM request failed, falling back to static content:', error);
                return of(this.getFallbackResponse(prompt));
            })
        );
    }

    private async makeLLMRequest(prompt: string): Promise<string> {
        console.log('🟡 NewsAgentService: Making LLM request to /api/llm');
        console.log('🟡 Prompt being sent:', prompt.substring(0, 200) + '...');
        try {
            console.log('🟡 About to fetch /api/llm...');
            const response = await fetch('/api/llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });
            
            console.log('🟢 NewsAgentService: LLM response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('🟢 NewsAgentService: LLM response data:', data);
                console.log('🟢 NewsAgentService: Response text:', data.response);
                return data.response || this.getFallbackResponse(prompt);
            } else {
                console.warn('⚠️ NewsAgentService: LLM response not ok:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('❌ NewsAgentService: LLM endpoint error:', error);
        }
        
        console.log('⚠️ NewsAgentService: Using fallback response');
        return this.getFallbackResponse(prompt);
    }

    private getFallbackResponse(prompt: string): string {
        // Fallback responses based on prompt type
        if (prompt.includes('witty remark')) {
            return "And that's the news, folks. I'd make a joke, but reality is already pretty funny.";
        }
        if (prompt.includes('parse intent')) {
            return 'general news';
        }
        if (prompt.includes('greeting')) {
            return `Good evening, I'm ${this.anchorName} with ${this.networkName}. Where the news is real and the commentary is questionable.`;
        }
        return "That's all for now, stay informed!";
    }

    processRequest(query: string): Observable<NewsResponse> {
        console.log('🎤 NewsAgentService: Processing request for query:', query);
        
        // Create a prompt for Claude to answer the user's question
        const claudePrompt = `You are Max Sterling, a witty news anchor from Sigao News Network in the style of SNL Weekend Update. 

User asked: "${query}"

Please provide a witty, informative response about this topic. Include some actual information if possible, but make it entertaining with your signature sarcastic commentary. Keep it conversational and engaging, around 2-3 sentences.`;

        console.log('🎤 NewsAgentService: Calling Claude with prompt');
        
        return this.callLLM(claudePrompt).pipe(
            map(claudeResponse => {
                console.log('🎤 NewsAgentService: Got Claude response:', claudeResponse);
                console.log('🎤 NewsAgentService: Response length:', claudeResponse?.length);
                
                // Make sure we have a valid response
                const responseText = claudeResponse || `Let me check my sources about "${query}"... Actually, my teleprompter just went blank. Classic Tuesday!`;
                
                const response: NewsResponse = {
                    introduction: `Great question! Let me break this down for you:`,
                    stories: [{
                        headline: `Max Sterling Responds`,
                        content: responseText,
                        commentary: ""
                    }],
                    signoff: "That's your answer straight from the Sigao News desk!"
                };
                
                console.log('🎤 NewsAgentService: Final formatted response:', JSON.stringify(response));
                return response;
            }),
            catchError(error => {
                console.error('❌ NewsAgentService: Error in processRequest:', error);
                return of({
                    introduction: "Technical difficulties!",
                    stories: [{
                        headline: "Error",
                        content: `I tried to get you info about "${query}" but my brain circuits are a bit fried right now. Try asking again!`,
                        commentary: "And that's why we have backup generators, folks."
                    }],
                    signoff: "We'll be right back after these technical difficulties..."
                });
            })
        );
    }

    private formatUserQueryResponse(data: any[], intent: any, originalQuery: string): NewsResponse {
        console.log('NewsAgentService: formatUserQueryResponse - this should call Claude API!');
        
        // Create a prompt for Claude to answer the user's question
        const claudePrompt = `You are Max Sterling, a witty news anchor from Sigao News Network in the style of SNL Weekend Update. 
        
User asked: "${originalQuery}"

Please provide a witty, informative response about this topic. Include some actual information if possible, but make it entertaining with your signature sarcastic commentary. Keep it conversational and engaging, around 2-3 sentences.`;

        const response: NewsResponse = {
            stories: [{
                headline: `Max Sterling Responds`,
                content: `Let me get you an answer about "${originalQuery}"...`,
                commentary: "Hold on, let me channel my inner news anchor wisdom..."
            }]
        };
        
        // This is wrong - I need to make this async and call Claude!
        // For now, using a direct fetch call
        this.callLLM(claudePrompt).subscribe({
            next: (claudeResponse) => {
                console.log('NewsAgentService: Got Claude response:', claudeResponse);
                response.stories[0].content = claudeResponse;
                response.stories[0].commentary = "";
            },
            error: (error) => {
                console.error('NewsAgentService: Claude call failed:', error);
                response.stories[0].content = `I tried to get you info about "${originalQuery}" but my brain circuits are a bit fried right now. Try asking again!`;
                response.stories[0].commentary = this.getRandomRemark(intent.category);
            }
        });
        
        response.introduction = `Great question about "${originalQuery.substring(0, 30)}${originalQuery.length > 30 ? '...' : ''}"! Let me see what I can dig up.`;
        response.signoff = "That's your answer straight from the news desk!";
        
        return response;
    }

    private getQueryBasedGreeting(query: string, category: string): string {
        const queryGreetings = [
            `Great question about ${category}! Let me see what I can find...`,
            `You asked about "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}" - here's what I've got:`,
            `Interesting question! I've dug into my ${category} sources for you:`,
            `Let me break down what I found about your question:`,
            `You know, that's exactly what everyone's been asking about. Here's the scoop:`
        ];
        
        return this.getRandomItem(queryGreetings);
    }

    private getQueryBasedSignoff(query: string): string {
        const querySignoffs = [
            `Hope that answers your question! Keep 'em coming.`,
            `And that's your answer, straight from the news desk.`,
            `There you have it! Any other burning questions?`,
            `That's the latest on your question. This is Max Sterling, keeping you informed.`,
            `Hope that helps! Remember, I'm here for all your news needs.`
        ];
        
        return this.getRandomItem(querySignoffs);
    }

    private parseIntent(query: string): { type: string; category: string; specific?: string } {
        const lowerQuery = query.toLowerCase();
        
        // Check for specific requests
        if (lowerQuery.includes('score') || lowerQuery.includes('game') || lowerQuery.includes('match')) {
            // Look for specific teams
            const teams = this.extractTeams(lowerQuery);
            return { type: 'sports', category: 'sports', specific: teams.join(' ') };
        }
        
        // Check for category keywords
        const categories = {
            technology: ['tech', 'ai', 'artificial intelligence', 'software', 'computer', 'internet', 'app', 'startup', 'silicon valley', 'digital', 'innovation'],
            sports: ['sport', 'nfl', 'nba', 'mlb', 'hockey', 'soccer', 'football', 'basketball', 'baseball', 'athlete', 'team', 'championship', 'league'],
            business: ['business', 'stock', 'market', 'economy', 'company', 'earnings', 'wall street', 'finance', 'money', 'corporate', 'trade'],
            entertainment: ['movie', 'film', 'music', 'celebrity', 'hollywood', 'tv', 'show', 'actor', 'singer', 'entertainment', 'concert'],
            science: ['science', 'research', 'space', 'nasa', 'discovery', 'study', 'scientist', 'experiment', 'physics', 'biology'],
            health: ['health', 'medical', 'covid', 'vaccine', 'doctor', 'hospital', 'medicine', 'disease', 'wellness', 'treatment']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => lowerQuery.includes(keyword))) {
                return { type: 'news', category, specific: query };
            }
        }
        
        // Default to general news
        return { type: 'news', category: 'general', specific: query };
    }

    private extractTeams(query: string): string[] {
        // Common team names - expand this list as needed
        const teams = [
            'lakers', 'celtics', 'warriors', 'heat', 'bulls', 'knicks',
            'yankees', 'red sox', 'dodgers', 'giants', 'cubs',
            'patriots', 'cowboys', 'packers', 'chiefs', 'bills',
            'rangers', 'bruins', 'penguins', 'lightning'
        ];
        
        return teams.filter(team => query.includes(team));
    }

    private fetchNewsForIntent(intent: any, _originalQuery: string): Observable<any[]> {
        // For now, return mock data to break the circular dependency
        // This can be refactored later to use a proper data service
        return of(this.getMockNews(intent.category));
    }

    // No longer needed - using direct LLM calls instead
    private _formatNewsResponseWithLLM(data: any[], intent: any, originalQuery: string): Observable<NewsResponse> {
        // Generate entire news response with Claude in one call for better coherence
        const fullPrompt = `You are ${this.anchorName}, a witty news anchor from ${this.networkName} in the style of SNL Weekend Update.

User query: "${originalQuery}"
Category: ${intent.category}

Provide a complete news response with:
1. Opening greeting (witty, 1-2 sentences)
2. Main content addressing the query with your signature sarcastic commentary (2-3 sentences)
3. A memorable signoff (1 sentence)

Be entertaining, informative, and full of personality. Keep it conversational and funny.`;

        return this.callLLM(fullPrompt).pipe(
            map(claudeResponse => {
                console.log('🎯 NewsAgentService: Full LLM response:', claudeResponse);
                
                // Split response into sections
                const paragraphs = claudeResponse.split('\n').filter(p => p.trim());
                
                const response: NewsResponse = {
                    introduction: paragraphs[0] || `Good evening, I'm ${this.anchorName} with ${this.networkName}.`,
                    stories: [{
                        headline: `${this.anchorName} Reports`,
                        content: paragraphs.slice(1, -1).join(' ') || claudeResponse,
                        commentary: ''
                    }],
                    signoff: paragraphs[paragraphs.length - 1] || `That's all from ${this.networkName}!`
                };
                
                return response;
            }),
            catchError(() => {
                // Fallback to static response if LLM fails
                return of(this.formatNewsResponse(data, intent));
            })
        );
    }

    // No longer needed - using direct LLM calls instead
    /* private _formatStoriesWithLLMCommentary(data: any[], category: string): Observable<Array<{headline: string; content: string; commentary?: string}>> {
        // Method deprecated - using generateNewscast instead
        return of([]);
    } */

    private formatNewsResponse(data: any[], intent: any): NewsResponse {
        const response: NewsResponse = {
            stories: []
        };
        
        // Add greeting
        response.introduction = this.getGreeting();
        
        // Format stories with commentary
        if (Array.isArray(data) && data.length > 0) {
            // Check if it's sports scores
            if (data[0].hasOwnProperty('homeTeam')) {
                response.stories = this.formatSportsScores(data);
            } else {
                response.stories = this.formatNewsStories(data, intent.category);
            }
        } else {
            response.stories = [{
                headline: "Breaking News: No News",
                content: "In an unprecedented turn of events, nothing happened today. Experts are baffled. We're looking into it, but honestly, we're just as confused as you are.",
                commentary: "And that's why I drink coffee, folks."
            }];
        }
        
        // Add signoff
        response.signoff = this.getSignoff();
        
        return response;
    }

    private formatSportsScores(games: any[]): any[] {
        const stories = games.slice(0, 3).map((game, index) => {
            const headline = `${game.homeTeam} vs ${game.awayTeam}`;
            const content = `The score is ${game.score}. ${game.status || 'Game in progress'}.`;
            
            // Add witty commentary for each score
            const commentary = index === games.length - 1 
                ? this.getRandomRemark('sports')
                : this.getTransition();
            
            return { headline, content, commentary };
        });
        
        return stories;
    }

    private formatNewsStories(articles: any[], category: string): any[] {
        const stories = articles.slice(0, 3).map((article, index) => {
            const headline = article.title || "Mysterious Headline Missing";
            const content = article.description || 
                "Our sources tell us something happened. What exactly? Your guess is as good as ours.";
            
            // Add witty commentary after each story
            const commentary = index === articles.length - 1
                ? this.getRandomRemark(category)
                : this.getTransition();
            
            return { headline, content, commentary };
        });
        
        return stories;
    }

    private getGreeting(): string {
        const greeting = this.getRandomItem(this.greetings);
        return this.replacePlaceholders(greeting);
    }

    private getSignoff(): string {
        const signoff = this.getRandomItem(this.signoffs);
        return this.replacePlaceholders(signoff);
    }

    private getTransition(): string {
        return this.getRandomItem(this.transitions);
    }

    private getRandomRemark(category: string): string {
        const remarks = this.wittyRemarks[category as keyof typeof this.wittyRemarks] 
            || this.wittyRemarks.general;
        return this.getRandomItem(remarks);
    }

    private replacePlaceholders(text: string): string {
        return text
            .replace(/{{name}}/g, this.anchorName)
            .replace(/{{network}}/g, this.networkName);
    }

    private getRandomItem<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    private getMockNews(category: string): any[] {
        const mockData: Record<string, any[]> = {
            general: [
                { title: 'Breaking: Major Tech Announcement Expected Today', description: 'Industry leaders gather for conference' },
                { title: 'Global Climate Summit Reaches New Agreement', description: 'Nations commit to ambitious targets' },
                { title: 'Stock Markets Hit Record Highs', description: 'Investors optimistic about growth' }
            ],
            sports: [
                { homeTeam: 'Lakers', awayTeam: 'Celtics', score: '112 - 108', status: 'Final' },
                { homeTeam: 'Yankees', awayTeam: 'Red Sox', score: '5 - 3', status: 'Top 9th' },
                { homeTeam: 'Cowboys', awayTeam: 'Eagles', score: '21 - 17', status: '4th Quarter' }
            ],
            technology: [
                { title: 'New AI Breakthrough Announced', description: 'Revolutionary advancement in machine learning' },
                { title: 'Quantum Computing Milestone Achieved', description: 'Researchers solve complex problem' },
                { title: 'Space Mission Discovers New Planet', description: 'Potentially habitable world found' }
            ],
            business: [
                { title: 'Major Merger Creates Industry Giant', description: 'Two companies join forces' },
                { title: 'Startup Raises Billion Dollar Funding', description: 'Record investment in new tech' },
                { title: 'Economic Growth Exceeds Expectations', description: 'Strong quarterly results' }
            ]
        };
        
        return mockData[category] || mockData['general'];
    }

    // Generate a full newscast for auto-play mode
    generateNewscast(category: string): Observable<NewsResponse> {
        console.log('🎬 NewsAgentService: Generating newscast for category:', category);
        
        // Create a comprehensive prompt for Claude to generate a full newscast
        const newsCastPrompt = `You are Max Sterling, a witty news anchor from Sigao News Network in the style of SNL Weekend Update.

Generate a complete ${category} newscast with:
1. A witty opening greeting (1-2 sentences)
2. Three current ${category} news stories with your signature sarcastic commentary
3. A memorable signoff (1 sentence)

Format each story as:
- Headline: [catchy headline]
- Content: [2-3 sentences about the story]
- Commentary: [Your witty take on it, 1 sentence]

Make it entertaining, informative, and full of personality. Include real-world references when possible but keep it light and funny.`;

        return this.callLLM(newsCastPrompt).pipe(
            map(claudeResponse => {
                console.log('🎬 NewsAgentService: Got Claude newscast response:', claudeResponse);
                
                // Parse the Claude response into our NewsResponse format
                const lines = claudeResponse.split('\n').filter(line => line.trim());
                const response: NewsResponse = {
                    introduction: '',
                    stories: [],
                    signoff: ''
                };
                
                // Extract introduction (first line or two)
                if (lines.length > 0) {
                    response.introduction = lines[0];
                    if (lines[1] && !lines[1].includes('Headline:')) {
                        response.introduction += ' ' + lines[1];
                    }
                }
                
                // Parse stories
                let currentStory: any = {};
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('Headline:') || line.includes('Headline:')) {
                        if (currentStory.headline) {
                            response.stories.push(currentStory);
                        }
                        currentStory = { headline: line.replace(/^.*Headline:\s*/, '').trim() };
                    } else if (line.startsWith('Content:') || line.includes('Content:')) {
                        currentStory.content = line.replace(/^.*Content:\s*/, '').trim();
                    } else if (line.startsWith('Commentary:') || line.includes('Commentary:')) {
                        currentStory.commentary = line.replace(/^.*Commentary:\s*/, '').trim();
                    } else if (i === lines.length - 1 || i === lines.length - 2) {
                        // Last line or two might be the signoff
                        if (!response.signoff) {
                            response.signoff = line;
                        } else {
                            response.signoff += ' ' + line;
                        }
                    }
                }
                
                // Add the last story if exists
                if (currentStory.headline) {
                    response.stories.push(currentStory);
                }
                
                // If parsing didn't work well, create a simpler format
                if (response.stories.length === 0) {
                    response.stories = [{
                        headline: `Latest ${category} Update`,
                        content: claudeResponse,
                        commentary: ''
                    }];
                }
                
                console.log('🎬 NewsAgentService: Parsed newscast response:', response);
                return response;
            }),
            catchError(error => {
                console.error('🎬 NewsAgentService: Error generating newscast:', error);
                // Emergency fallback with minimal static content
                return of({
                    introduction: `Good evening, I'm Max Sterling with Sigao News. Technical difficulties aside, here's what we've got for you.`,
                    stories: [{
                        headline: `${category} News Update`,
                        content: `We're experiencing some technical difficulties getting the latest ${category} news. Our interns are working on it - which means we should have it fixed by next Tuesday.`,
                        commentary: "And that's why we can't have nice things."
                    }],
                    signoff: `That's all for now. I'm Max Sterling, reminding you that even when the tech fails, the news must go on!`
                });
            })
        );
    }

    /* No longer needed - using direct LLM calls instead
    private _getNewsCastIntro(category: string): string {
        const intros: { [key: string]: string[] } = {
            general: [
                "Good evening, I'm {{name}} with {{network}}. Tonight's top stories will make you question everything. Or nothing. We're not sure yet.",
                "This is {{network}}. I'm {{name}}, and tonight we're asking the important questions. Like, 'Really? This again?'"
            ],
            technology: [
                "Welcome to {{network}} Tech Desk. I'm {{name}}, reporting live from the future. Well, technically the present, but it feels futuristic.",
                "This is {{name}} with {{network}}. Tonight: robots, rockets, and reasons to update your passwords again."
            ],
            sports: [
                "Live from {{network}} Sports Center, I'm {{name}}. Where we turn athletic achievements into sarcastic commentary.",
                "Welcome to {{network}} Sports. I'm {{name}}, and yes, I did play JV basketball in high school. Why do you ask?"
            ],
            business: [
                "From the {{network}} Financial Desk, I'm {{name}}. The market did things today. Were they good things? We'll find out.",
                "This is {{network}} Business. I'm {{name}}, and my portfolio is a cryptocurrency I made up called 'HopeCoin'."
            ]
        };
        
        const categoryIntros = intros[category] || intros['general'];
        return this.replacePlaceholders(this.getRandomItem(categoryIntros));
    } */
}