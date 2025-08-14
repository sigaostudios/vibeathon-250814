import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventBus } from '../../game/EventBus';

@Component({
    selector: 'app-news-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="chat-interface" *ngIf="isNewsSceneActive">
            <div class="chat-header">
                <h4>Ask the News Mascot</h4>
                <button class="close-btn" (click)="toggleChat()">×</button>
            </div>
            <div class="chat-messages">
                <div *ngFor="let message of messages" class="message" [class.user]="message.isUser">
                    <span class="message-author">{{ message.isUser ? 'You' : 'Mascot' }}:</span>
                    <span class="message-text">{{ message.text }}</span>
                </div>
            </div>
            <div class="chat-input">
                <input 
                    type="text" 
                    [(ngModel)]="userInput" 
                    (keyup.enter)="sendMessage()"
                    placeholder="Ask about news or sports..."
                    [disabled]="isLoading"
                />
                <button (click)="sendMessage()" [disabled]="!userInput.trim() || isLoading">
                    Send
                </button>
            </div>
            <div class="quick-questions">
                <p>Quick questions:</p>
                <button *ngFor="let q of quickQuestions" (click)="askQuestion(q)" class="quick-btn">
                    {{ q }}
                </button>
            </div>
        </div>
        <button 
            class="chat-toggle" 
            *ngIf="isNewsSceneActive && !isChatOpen" 
            (click)="toggleChat()">
            💬 Chat
        </button>
    `,
    styles: [`
        .chat-interface {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 350px;
            max-height: 500px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #4a90e2;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            z-index: 1000;
        }

        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: #4a90e2;
            border-radius: 8px 8px 0 0;
        }

        .chat-header h4 {
            margin: 0;
            color: white;
            font-size: 16px;
        }

        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            max-height: 250px;
        }

        .message {
            margin-bottom: 10px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }

        .message.user {
            background: rgba(74, 144, 226, 0.2);
            margin-left: 20px;
        }

        .message-author {
            font-weight: bold;
            color: #4a90e2;
            display: block;
            margin-bottom: 4px;
        }

        .message-text {
            color: white;
            line-height: 1.4;
        }

        .chat-input {
            display: flex;
            padding: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .chat-input input {
            flex: 1;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            color: white;
            margin-right: 10px;
        }

        .chat-input input::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .chat-input button {
            padding: 8px 20px;
            background: #4a90e2;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-weight: bold;
        }

        .chat-input button:hover:not(:disabled) {
            background: #5ba0f2;
        }

        .chat-input button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .quick-questions {
            padding: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .quick-questions p {
            margin: 0 0 8px 0;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
        }

        .quick-btn {
            margin: 2px;
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            color: white;
            font-size: 12px;
            cursor: pointer;
        }

        .quick-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .chat-toggle {
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 12px 20px;
            background: #4a90e2;
            border: none;
            border-radius: 25px;
            color: white;
            font-size: 16px;
            cursor: pointer;
            z-index: 999;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .chat-toggle:hover {
            background: #5ba0f2;
            transform: scale(1.05);
        }
    `]
})
export class NewsChatComponent implements OnInit, OnDestroy {
    isNewsSceneActive = false;
    isChatOpen = false;
    userInput = '';
    isLoading = false;
    messages: { text: string; isUser: boolean }[] = [];
    
    quickQuestions = [
        'Latest tech news?',
        'Sports scores today?',
        'Business headlines?',
        'Weather updates?'
    ];

    ngOnInit() {
        // Listen for scene changes
        EventBus.on('current-scene-ready', this.onSceneReady, this);
        
        // Listen for mascot responses
        EventBus.on('mascot-response', this.onMascotResponse, this);
        
        // Listen for news data to show in chat
        EventBus.on('news-data-received', this.onNewsDataReceived, this);
        
        // Listen for newscast responses
        EventBus.on('newscast-ready', this.onNewscastReady, this);
        
        // Add welcome message
        this.messages.push({
            text: 'Hello! I can help you find news and sports information. What would you like to know?',
            isUser: false
        });
    }

    ngOnDestroy() {
        EventBus.off('current-scene-ready', this.onSceneReady, this);
        EventBus.off('mascot-response', this.onMascotResponse, this);
        EventBus.off('news-data-received', this.onNewsDataReceived, this);
        EventBus.off('newscast-ready', this.onNewscastReady, this);
    }

    private onSceneReady = (scene: any) => {
        this.isNewsSceneActive = scene.scene.key === 'NewsScene';
        if (this.isNewsSceneActive) {
            this.isChatOpen = true; // Auto-open chat in news scene
        } else {
            this.isChatOpen = false;
        }
    }

    private onMascotResponse = (response: string) => {
        this.messages.push({
            text: response,
            isUser: false
        });
        this.isLoading = false;
    }

    private onNewsDataReceived = (data: any) => {
        // Only show in chat if it was a user-initiated search
        if (this.isLoading) {
            let responseText = '';
            
            if (data.articles && data.articles.length > 0) {
                responseText = 'Here\'s what I found:\n\n';
                data.articles.slice(0, 3).forEach((article: any, index: number) => {
                    responseText += `${index + 1}. ${article.title}\n`;
                    if (article.source) {
                        responseText += `   Source: ${article.source.name || article.source}\n`;
                    }
                });
            } else if (data.games && data.games.length > 0) {
                responseText = 'Current sports scores:\n\n';
                data.games.forEach((game: any) => {
                    responseText += `${game.homeTeam} vs ${game.awayTeam}: ${game.score}\n`;
                });
            } else {
                responseText = 'I couldn\'t find specific results for your query, but I\'ll keep checking other sources.';
            }
            
            this.messages.push({
                text: responseText,
                isUser: false
            });
            this.isLoading = false;
        }
    }

    private onNewscastReady = (newscast: any) => {
        // Only show in chat if it was a user-initiated query
        if (this.isLoading && newscast.stories) {
            let responseText = '';
            
            if (newscast.introduction) {
                responseText += `${newscast.introduction}\n\n`;
            }
            
            // Add top stories
            newscast.stories.slice(0, 2).forEach((story: any, index: number) => {
                responseText += `📰 ${story.headline}\n${story.content}\n`;
                if (story.commentary) {
                    responseText += `${story.commentary}\n`;
                }
                responseText += '\n';
            });
            
            if (newscast.signoff) {
                responseText += `${newscast.signoff}`;
            }
            
            this.messages.push({
                text: responseText,
                isUser: false
            });
            this.isLoading = false;
        }
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
    }

    sendMessage() {
        const message = this.userInput.trim();
        if (!message || this.isLoading) return;

        // Add user message
        this.messages.push({
            text: message,
            isUser: true
        });

        // Clear input
        this.userInput = '';
        this.isLoading = true;

        // Send to Phaser scene
        EventBus.emit('user-question', message);

        // Simulate response if no real response comes
        setTimeout(() => {
            if (this.isLoading) {
                this.messages.push({
                    text: 'Let me search for that information...',
                    isUser: false
                });
                this.isLoading = false;
            }
        }, 3000);
    }

    askQuestion(question: string) {
        this.userInput = question;
        this.sendMessage();
    }
}