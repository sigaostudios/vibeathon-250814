import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { GameConfig } from '../configuration/configuration.component';
import { StorageService } from '../storage.service';

export interface CommitInfo {
  message: string;
  sha: string;
  author: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchSpyService {
  private readonly repoOwner = 'sigaostudios';
  private readonly repoName = 'vibeathon-250814';
  private readonly targetBranch = 'prompt-puppies';
  
  constructor(private storageService: StorageService) { }

  /**
   * Fetches the most recent commit message from the prompt-puppies branch
   * @returns Observable with the commit information
   */
  getLatestCommitFromPromptPuppies(): Observable<CommitInfo | null> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits/${this.targetBranch}`;
    
    return from(this.storageService.getItem<GameConfig>('gameConfig')).pipe(
      switchMap(config => {
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        // Add authorization header if token is provided
        const githubToken = config?.githubToken;
        if (githubToken) {
          headers['Authorization'] = `Bearer ${githubToken}`;
        }
        
        return from(fetch(apiUrl, { headers }));
      }),
      switchMap(response => {
        if (!response.ok) {
          throw new Error(`GitHub API responded with status: ${response.status}`);
        }
        return from(response.json());
      }),
      map((data: any) => {
        return {
          message: data.commit.message,
          sha: data.sha,
          author: data.commit.author.name,
          date: data.commit.author.date
        } as CommitInfo;
      }),
      catchError(error => {
        console.error('Error fetching commit from prompt-puppies branch:', error);
        
        // Check if the error might be due to missing GitHub token
        return from(this.storageService.getItem<GameConfig>('gameConfig')).pipe(
          map(config => {
            if (!config?.githubToken) {
              console.warn('No GitHub token configured. For private repos, add your token in Game Configuration');
              console.warn('Generate a token at: https://github.com/settings/tokens with "repo" scope');
            }
            return null;
          }),
          catchError(() => of(null))
        );
      })
    );
  }

  /**
   * Fetches the most recent commit message as a simple string
   * @returns Observable with just the commit message string
   */
  getLatestCommitMessage(): Observable<string> {
    return this.getLatestCommitFromPromptPuppies().pipe(
      map(commitInfo => commitInfo ? commitInfo.message : 'Unable to fetch commit message')
    );
  }
}