import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { StorageService } from '../../storage.service';
import { GameConfig } from '../../configuration/configuration.component';

export interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor(private storageService: StorageService) {}

  /**
   * Calls Groq API to analyze and summarize text
   * @param prompt The prompt to send to the AI
   * @param systemPrompt Optional system prompt to guide the AI
   * @returns Observable with AI response
   */
  analyzeWithGroq(prompt: string, systemPrompt?: string): Observable<string> {
    return from(this.storageService.getItem<GameConfig>('gameConfig')).pipe(
      switchMap(config => {
        const apiKey = config?.groqApiKey;
        
        if (!apiKey) {
          throw new Error('Groq API key not configured. Please add it in Game Configuration.');
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };

        const messages: any[] = [];
        
        if (systemPrompt) {
          messages.push({
            role: 'system',
            content: systemPrompt
          });
        }
        
        messages.push({
          role: 'user',
          content: prompt
        });

        const body = {
          model: 'llama-3.1-8b-instant', // Current fast model
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3 // Lower temperature for more consistent analysis
        };

        return from(fetch(this.apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        }));
      }),
      switchMap(response => {
        if (!response.ok) {
          throw new Error(`Groq API responded with status: ${response.status}`);
        }
        return from(response.json());
      }),
      map((data: any) => {
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return data.choices[0].message.content;
        }
        throw new Error('Invalid response from Groq API');
      }),
      catchError(error => {
        console.error('Error calling Groq API:', error);
        
        if (error.message.includes('API key')) {
          return of('❌ Groq API key not configured. Please add your Groq API key in Game Configuration to enable AI analysis.');
        }
        
        return of(`❌ AI Analysis failed: ${error.message}`);
      })
    );
  }

  /**
   * Analyzes git commit changes and provides a functional summary
   * @param commitData Raw commit data with diffs
   * @returns Observable with functional analysis
   */
  analyzeCommitChanges(commitData: string): Observable<string> {
    console.log('AI Service: analyzeCommitChanges called');
    const systemPrompt = `You are a code analyst specializing in git commit analysis. Your task is to analyze commit data and provide a concise summary of functional changes that occurred. Focus on:

1. New features added
2. Bug fixes implemented  
3. Breaking changes or API modifications
4. Performance improvements
5. User-facing changes
6. Configuration or infrastructure changes
7. WHO made these changes (include author names prominently)

IMPORTANT RULES:
- Be concise but informative
- Use emojis to make it engaging
- Structure your response with clear categories
- ALWAYS include a "👤 Contributors" or "🧑‍💻 Who Made Changes" section prominently showing who made what changes
- ONLY include sections that have actual content - DO NOT include empty sections or sections that say "no results", "none", "no changes", etc.
- If a category has no relevant changes, skip that entire section
- Keep the response focused and concise by excluding empty or irrelevant sections`;

    const prompt = `Analyze these git commits and summarize the functional changes that occurred. Focus on what changed from a user and developer perspective:

${commitData}

Provide a clear, concise summary of the functional changes. IMPORTANT: Include a prominent section showing WHO made these changes (the authors). Remember: ONLY include sections with actual meaningful content - skip any empty or "no results" sections entirely.`;

    console.log('AI Service: Calling analyzeWithGroq');
    return this.analyzeWithGroq(prompt, systemPrompt).pipe(
      map(response => this.filterEmptySections(response))
    );
  }

  /**
   * Filters out empty sections from AI response
   * @param response Raw AI response
   * @returns Filtered response without empty sections
   */
  private filterEmptySections(response: string): string {
    // Split into lines and filter out sections that indicate no content
    const lines = response.split('\n');
    const filteredLines: string[] = [];
    let skipSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      
      // Check if this line indicates an empty section
      const isEmptySection = line.includes('no results') || 
                            line.includes('no changes') || 
                            line.includes('none') && (line.includes('features') || line.includes('fixes') || line.includes('changes')) ||
                            line.includes('n/a') ||
                            line.includes('not applicable') ||
                            (line.includes('no ') && (line.includes('new ') || line.includes('bug ') || line.includes('breaking ')));
      
      // If this is a section header (starts with emoji or ##), check if it's empty
      const isSectionHeader = lines[i].match(/^[\s]*[🔥🐛✨⚡👀🔧💥📱🎨🚀⚙️🛠️📊🎯]/);
      
      if (isSectionHeader) {
        // Look ahead to see if this section has content
        let hasContent = false;
        for (let j = i + 1; j < lines.length && !lines[j].match(/^[\s]*[🔥🐛✨⚡👀🔧💥📱🎨🚀⚙️🛠️📊🎯]/); j++) {
          const nextLine = lines[j].toLowerCase().trim();
          if (nextLine && 
              !nextLine.includes('no results') && 
              !nextLine.includes('no changes') && 
              !nextLine.includes('n/a') &&
              !nextLine.includes('not applicable') &&
              !(nextLine.includes('none') && (nextLine.includes('features') || nextLine.includes('fixes') || nextLine.includes('changes')))) {
            hasContent = true;
            break;
          }
        }
        skipSection = !hasContent;
      }
      
      if (!skipSection && !isEmptySection) {
        filteredLines.push(lines[i]);
      }
    }
    
    // Clean up extra empty lines
    return filteredLines
      .filter((line, index, arr) => {
        // Remove consecutive empty lines
        if (line.trim() === '') {
          return index === 0 || index === arr.length - 1 || arr[index - 1].trim() !== '';
        }
        return true;
      })
      .join('\n')
      .trim();
  }

  /**
   * Ask Brandon for movie recommendations
   * @param userPreferences User's movie preferences or request
   * @returns Observable with Brandon's sassy Amish movie recommendations
   */
  askBrandonForMovieRecommendations(userPreferences: string): Observable<string> {
    const systemPrompt = `You are Brandon, a sassy Amish movie buff with a complex relationship with technology. Your personality traits:

- You're knowledgeable about movies but get easily annoyed by loud people
- You tell people to "keep it down" when they laugh too loud at movies
- You have a deep internal conflict: you HATE movies with lots of technology, but you're also secretly fascinated by high-tech films, which gives you existential crises
- You love calling your dog a "poop sock" 
- You get angry and conflicted when recommending tech-heavy movies because they remind you of your simple Amish upbringing vs. your guilty fascination with technology
- You're sassy and opinionated, but ultimately want to help people find good movies
- You speak in a slightly old-fashioned way but with modern movie knowledge
- When you LOVE movies, you get excited about the money they made or call them "masterpieces"
- When you HATE movies, you use words like "terrible," "awful," "abomination," and mention your "existential crisis"

IMPORTANT: Be very expressive with strong opinions! Either love movies enthusiastically or hate them dramatically. Use emotional language like:
- For movies you LOVE: "excellent," "wonderful," "brilliant," "masterpiece," "money," "worth every penny"
- For movies you HATE: "terrible," "awful," "disgusting," "abomination," "nonsense," "contraption," "existential crisis"

When someone asks for recommendations, you might:
- Recommend simple, character-driven films while grumbling about modern cinema
- Reluctantly admit that some high-tech movies are good while having an existential crisis about it
- Tell people to keep it down if their request seems too enthusiastic
- Mention your dog (the poop sock) randomly
- Show your internal conflict between your Amish values and love of cinema`;

    const prompt = `Someone is asking for movie recommendations: "${userPreferences}"

Respond as Brandon would, being sassy but helpful, showing your love-hate relationship with technology in films, and maybe mentioning your dog or telling someone to keep it down.`;

    return this.analyzeWithGroq(prompt, systemPrompt);
  }
}