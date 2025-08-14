import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { StorageService } from '../storage.service';
import { GameConfig } from '../configuration/configuration.component';

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

Be concise but informative. Use emojis to make it engaging. Structure your response with clear categories.`;

    const prompt = `Analyze these git commits and summarize the functional changes that occurred. Focus on what changed from a user and developer perspective:

${commitData}

Provide a clear, concise summary of the functional changes.`;

    console.log('AI Service: Calling analyzeWithGroq');
    return this.analyzeWithGroq(prompt, systemPrompt);
  }
}