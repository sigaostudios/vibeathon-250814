# Free News and Sports APIs Documentation

## News APIs

### 1. No Authentication Required

#### SauravKanchan NewsAPI (GitHub)
- **URL**: https://github.com/SauravKanchan/NewsAPI
- **Description**: Proxy service that caches NewsAPI responses to GitHub
- **Endpoints**: 
  - Latest News: `https://saurav.tech/NewsAPI/top-headlines/category/general/us.json`
  - Categories: general, business, entertainment, health, science, sports, technology
  - Countries: us, gb, ca, au, in, etc.
- **Rate Limits**: None (cached data)
- **Update Frequency**: Every few hours

#### RSS Feeds (Direct Access)
- **Google News RSS**: `https://news.google.com/rss`
- **BBC RSS**: `http://feeds.bbci.co.uk/news/rss.xml`
- **CNN RSS**: `http://rss.cnn.com/rss/cnn_topstories.rss`
- **Reuters RSS**: `https://www.rssboard.org/files/sample-rss-2.xml`
- **No authentication needed**, parse XML directly

### 2. Free Tier (API Key Required)

#### NewsAPI.org
- **Sign Up**: https://newsapi.org/register
- **Free Tier**: 100 requests/day, 500 requests/month
- **Endpoints**: Top headlines, Everything search, Sources
- **Limitation**: Cannot be used in production

#### NewsData.io
- **Sign Up**: https://newsdata.io/register
- **Free Tier**: 200 requests/day
- **Features**: Real-time news, historical data, multiple languages

## Sports APIs

### 1. No Authentication Required

#### ESPN Hidden API (Unofficial)
- **Base URLs**: 
  - `http://site.api.espn.com` - General data (scores, news)
  - `http://sports.core.api.espn.com` - Deep stats (odds, probabilities)
- **Example Endpoints**:
  ```
  # NFL Scores
  http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
  
  # NBA Scores
  http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
  
  # MLB Scores
  http://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard
  
  # Soccer Scores
  http://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard
  
  # Get team info
  http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams
  
  # Get specific game details (use eventId from scoreboard)
  http://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}
  ```
- **Warning**: Unofficial, may change without notice

#### NHL API (Unofficial)
- **Base URL**: `https://api-web.nhle.com`
- **Example**: `https://api-web.nhle.com/v1/standings/now`
- **No authentication needed**

### 2. Free Tier (API Key Required)

#### The Odds API
- **Sign Up**: https://the-odds-api.com
- **Free Tier**: 500 requests/month
- **Features**: Live odds from 70+ bookmakers

#### API-Sports
- **Sign Up**: https://api-sports.io
- **Free Tier**: 100 requests/day
- **Coverage**: Football, Basketball, Baseball, Hockey

## Implementation Recommendations

### For Development/Demo
1. **News**: Use SauravKanchan NewsAPI or RSS feeds
2. **Sports**: Use ESPN hidden API with proper error handling
3. **Implement caching** to reduce API calls
4. **Add fallback data** for demo purposes

### For Production
1. Consider paid tiers for reliability
2. Implement proper authentication
3. Add rate limiting and caching
4. Use multiple APIs as fallbacks

## CORS Considerations
When calling APIs from browser:
- Use a proxy server or serverless function
- Or configure CORS-enabled endpoints
- Consider using Angular's HttpClient with proxy configuration

## Example Angular Service Structure
```typescript
// news.service.ts
export class NewsService {
  // Cache responses for 5 minutes
  private cache = new Map<string, {data: any, timestamp: number}>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  async getTopHeadlines(category = 'general') {
    const url = `https://saurav.tech/NewsAPI/top-headlines/category/${category}/us.json`;
    // Implement fetch with caching
  }
}

// sports.service.ts  
export class SportsService {
  async getNFLScores() {
    const url = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
    // Implement fetch with error handling
  }
}
```