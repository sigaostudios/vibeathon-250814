import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { StorageService } from '../storage.service';
import { GameConfig } from '../configuration/configuration.component';

export interface CommitInfo {
  message: string;
  sha: string;
  author: string;
  date: string;
}

export interface CommitWithDiff extends CommitInfo {
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }[];
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
   * Fetches the last 3 commits from the prompt-puppies branch
   * @returns Observable with array of commit information
   */
  getLastThreeCommits(): Observable<CommitInfo[]> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?sha=${this.targetBranch}&per_page=3`;
    
    return from(this.storageService.getItem<GameConfig>('gameConfig')).pipe(
      switchMap(config => {
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
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
      map((commits: any[]) => {
        return commits.map(commit => ({
          message: commit.commit.message,
          sha: commit.sha,
          author: commit.commit.author.name,
          date: commit.commit.author.date
        } as CommitInfo));
      }),
      catchError(error => {
        console.error('Error fetching commits from prompt-puppies branch:', error);
        return of([]);
      })
    );
  }

  /**
   * Fetches detailed commit information including file diffs for a specific commit
   * @param sha The commit SHA
   * @returns Observable with detailed commit information
   */
  getCommitDetails(sha: string): Observable<CommitWithDiff | null> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits/${sha}`;
    
    return from(this.storageService.getItem<GameConfig>('gameConfig')).pipe(
      switchMap(config => {
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
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
          date: data.commit.author.date,
          files: data.files?.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch
          })) || []
        } as CommitWithDiff;
      }),
      catchError(error => {
        console.error('Error fetching commit details:', error);
        return of(null);
      })
    );
  }

  /**
   * Fetches the last 3 commits with their detailed diff information
   * @returns Observable with array of detailed commit information
   */
  getLastThreeCommitsWithDiffs(): Observable<CommitWithDiff[]> {
    return this.getLastThreeCommits().pipe(
      switchMap(commits => {
        if (commits.length === 0) {
          return of([]);
        }
        
        const detailObservables = commits.map(commit => 
          this.getCommitDetails(commit.sha)
        );
        
        return forkJoin(detailObservables);
      }),
      map(commitDetails => commitDetails.filter(commit => commit !== null) as CommitWithDiff[]),
      catchError(error => {
        console.error('Error fetching commit details:', error);
        return of([]);
      })
    );
  }

  /**
   * Uses AI to summarize functionality changes from the last 3 commits
   * @returns Observable with AI-generated summary
   */
  getAISummaryOfRecentChanges(): Observable<string> {
    return this.getLastThreeCommitsWithDiffs().pipe(
      switchMap(commits => {
        if (commits.length === 0) {
          return of('No recent commits found to analyze.');
        }

        // Prepare the prompt for AI analysis
        const commitSummary = commits.map(commit => {
          const fileChanges = commit.files.map(file => 
            `- ${file.filename}: ${file.status} (+${file.additions}/-${file.deletions})`
          ).join('\n');
          
          return `Commit: ${commit.message}\nAuthor: ${commit.author}\nDate: ${commit.date}\nFiles:\n${fileChanges}`;
        }).join('\n\n');

        const prompt = `Analyze these recent git commits and summarize what functionality changed. Focus on user-facing features, bug fixes, and significant code changes. Be concise but informative:\n\n${commitSummary}`;

        // For now, return a structured summary. In a real implementation, 
        // you would call an AI service here
        return this.generateSimpleSummary(commits);
      })
    );
  }

  /**
   * Generates a simple summary without AI (placeholder for actual AI integration)
   * @param commits Array of commits with diff information
   * @returns Observable with summary string
   */
  private generateSimpleSummary(commits: CommitWithDiff[]): Observable<string> {
    let summary = `📊 Analysis of last ${commits.length} commits:\n\n`;
    
    commits.forEach((commit, index) => {
      const totalFiles = commit.files.length;
      const totalAdditions = commit.files.reduce((sum, f) => sum + f.additions, 0);
      const totalDeletions = commit.files.reduce((sum, f) => sum + f.deletions, 0);
      
      summary += `${index + 1}. "${commit.message}"\n`;
      summary += `   📁 ${totalFiles} files changed (+${totalAdditions}/-${totalDeletions})\n`;
      
      if (commit.files.length > 0) {
        const mainFiles = commit.files.slice(0, 3);
        summary += `   📝 Key files: ${mainFiles.map(f => f.filename).join(', ')}\n`;
      }
      summary += '\n';
    });

    summary += `🔍 Overall: ${commits.reduce((sum, c) => sum + c.files.length, 0)} files affected across ${commits.length} commits`;
    
    return of(summary);
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