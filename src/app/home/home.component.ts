import { Component, viewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { MascotPlayground } from '../../game/scenes/MascotPlayground';
import { EventBus } from '../../game/EventBus';
import { StocksService } from '../stocks.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, PhaserGameComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
    public spritePosition = { x: 0, y: 0 };
    public canToggleMovement = false;
    public canAddSprite = false;
    private currentSceneKey: string = '';
    // Movement state tracking per scene
    private menuMoving = false;
    private gameMoving = false;
    
    // Stock chat mode
    public stockChatActive = false;

    public statusLabel = '—';

    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    constructor(private stocksService: StocksService) {
        // Track the active scene and enable/disable controls accordingly
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
            this.currentSceneKey = scene.scene.key;

            // Enable movement in MainMenu (logo tween) and MascotPlayground (mascot tween)
            this.canToggleMovement = this.currentSceneKey === 'MainMenu' || this.currentSceneKey === 'MascotPlayground';

            // Only allow adding sprites in the MascotPlayground scene
            this.canAddSprite = this.currentSceneKey === 'MascotPlayground';

            // Reset movement indicators when the scene changes
            if (this.currentSceneKey === 'MainMenu') {
                this.menuMoving = false;
            } else if (this.currentSceneKey === 'MascotPlayground') {
                this.gameMoving = false;
            }

            this.updateStatus();
        });
    }

    ngOnInit() {
        // Listen for stock chat close events
        EventBus.on('close-stock-chat', () => {
            this.closeStockChat();
        });
        
        // Listen for stock queries from Phaser scene
        EventBus.on('process-stock-query', (message: string) => {
            this.processUserMessage(message);
        });
    }

    ngOnDestroy() {
        EventBus.off('close-stock-chat');
        EventBus.off('process-stock-query');
    }

    public changeScene(): void {
        const current = this.phaserRef().scene as Phaser.Scene | undefined;
        if (!current) { return; }

        // Context-aware scene changing
        if (this.currentSceneKey === 'StockChat') {
            // From StockChat, go back to MascotPlayground
            this.phaserRef().game?.scene.start('MascotPlayground');
            this.stockChatActive = false;
        } else {
            // For other scenes, use their changeScene method
            const s: any = current as any;
            if (typeof s.changeScene === 'function') {
                s.changeScene();
            }
        }
        this.updateStatus();
    }

    public toggleMovement(): void {
        const current = this.phaserRef().scene as Phaser.Scene | undefined;
        if (!current) { return; }

        if (this.currentSceneKey === 'MainMenu') {
            const menu = current as unknown as MainMenu;
            menu.moveLogo(({ x, y }) => {
                this.spritePosition = { x, y };
            });
            this.menuMoving = !this.menuMoving;
            this.updateStatus();
        } else if (this.currentSceneKey === 'MascotPlayground') {
            const game = current as unknown as MascotPlayground;
            if (typeof (game as any).toggleMovement === 'function') {
                (game as any).toggleMovement(({ x, y }: { x: number; y: number }) => {
                    this.spritePosition = { x, y };
                });
                // Try to reflect actual scene state if available
                if (typeof (game as any).spritesMoving === 'boolean') {
                    this.gameMoving = (game as any).spritesMoving as boolean;
                } else {
                    this.gameMoving = !this.gameMoving;
                }
                this.updateStatus();
            }
        }
    }

    public addSprite(): void {
        if (this.currentSceneKey === 'MascotPlayground') {
            // Delegate sprite creation to the Phaser scene via EventBus
            EventBus.emit('add-sprite');
        }
    }
    
    public toggleStockChat(): void {
        // Navigate to dedicated StockChat scene from any current scene
        const phaserGame = this.phaserRef().game;
        if (phaserGame && phaserGame.scene) {
            phaserGame.scene.start('StockChat');
            this.stockChatActive = true;
            this.updateStatus();
        }
    }
    
    public closeStockChat(): void {
        // Navigate back to MascotPlayground
        const phaserGame = this.phaserRef().scene;
        if (phaserGame) {
            phaserGame.start('MascotPlayground');
        }
        this.stockChatActive = false;
        this.updateStatus();
    }


    private updateStatus(): void {
        const movementOn = this.currentSceneKey === 'MainMenu' ? this.menuMoving
                         : this.currentSceneKey === 'MascotPlayground' ? this.gameMoving
                         : false;
        const movementText = movementOn ? 'On' : 'Off';
        const sceneText = this.currentSceneKey || '—';
        // Update stockChatActive based on current scene
        this.stockChatActive = this.currentSceneKey === 'StockChat';
        const stockChatText = this.stockChatActive ? 'Active' : 'Inactive';
        this.statusLabel = `Scene: ${sceneText} • Movement: ${movementText} • Stock Chat: ${stockChatText}`;
    }
    
    private processUserMessage(message: string): void {
        const lowerMessage = message.toLowerCase();
        
        // Detect stock-related queries
        const hasStockKeyword = ['stock', 'price', 'market', 'shares', 'trading', 'value', 'worth', 'cost', 'buy', 'sell', 'how is', 'what is', 'show me', 'tell me about'].some(keyword => lowerMessage.includes(keyword));
        const mentionedTicker = this.extractTicker(lowerMessage);
        
        if (hasStockKeyword || mentionedTicker) {
            this.handleStockQuery(message, mentionedTicker);
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            this.sendMascotResponse('Hello! I\'m your stock market companion. Ask me about any stock like AAPL, GOOGL, or MSFT!');
        } else if (lowerMessage.includes('help')) {
            this.sendMascotResponse('I can help you with stock prices! Try asking:\\n• "What\'s the price of AAPL?"\\n• "Show me Microsoft stock"\\n• "How is Tesla doing?"\\n• "Get all stocks"');
        } else {
            this.sendMascotResponse('I\'m not sure about that. Try asking me about stocks like AAPL, GOOGL, or MSFT!');
        }
    }
    
    private extractTicker(message: string): string | null {
        const tickerMap: { [key: string]: string } = {
            'apple': 'AAPL', 'aapl': 'AAPL',
            'google': 'GOOGL', 'googl': 'GOOGL', 'alphabet': 'GOOGL',
            'microsoft': 'MSFT', 'msft': 'MSFT',
            'amazon': 'AMZN', 'amzn': 'AMZN',
            'tesla': 'TSLA', 'tsla': 'TSLA'
        };
        
        const words = message.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (tickerMap[word]) {
                return tickerMap[word];
            }
        }
        
        const upperMatch = message.match(/\b(AAPL|GOOGL|MSFT|AMZN|TSLA)\b/i);
        if (upperMatch) {
            return upperMatch[1].toUpperCase();
        }
        
        return null;
    }
    
    private handleStockQuery(message: string, ticker: string | null): void {
        if (message.toLowerCase().includes('all') || message.toLowerCase().includes('everything')) {
            this.stocksService.getAllTickersSnapshot(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']).subscribe({
                next: (data) => {
                    if (data.tickers && data.tickers.length > 0) {
                        let response = 'Here are all the stocks:\\n\\n';
                        data.tickers.forEach(stock => {
                            const price = stock.day?.c || 0;
                            const change = stock.todaysChange || 0;
                            const changePercent = stock.todaysChangePerc || 0;
                            const emoji = change >= 0 ? '📈' : '📉';
                            response += `${emoji} ${stock.ticker}: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)\\n`;
                        });
                        this.sendMascotResponse(response);
                    }
                },
                error: () => this.sendMascotResponse('Sorry, I couldn\'t fetch the stock data right now.')
            });
        } else if (ticker) {
            if (message.toLowerCase().includes('history') || message.toLowerCase().includes('chart')) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                
                this.stocksService.getAggregates(ticker, 1, 'day', thirtyDaysAgo.toISOString().split('T')[0], now.toISOString().split('T')[0]).subscribe({
                    next: (data) => {
                        if (data.results && data.results.length > 0) {
                            const first = data.results[0];
                            const last = data.results[data.results.length - 1];
                            const change = last.c - first.c;
                            const changePercent = (change / first.c) * 100;
                            const emoji = change >= 0 ? '📈' : '📉';
                            
                            this.sendMascotResponse(
                                `${ticker} 30-day history:\\n\\n` +
                                `Start: $${first.c.toFixed(2)}\\n` +
                                `Current: $${last.c.toFixed(2)}\\n` +
                                `Change: ${emoji} ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
                            );
                        }
                    },
                    error: () => this.sendMascotResponse(`Sorry, I couldn't fetch the history for ${ticker}.`)
                });
            } else {
                this.stocksService.getSnapshot(ticker).subscribe({
                    next: (data) => {
                        if (data.ticker) {
                            const price = data.ticker.day?.c || 0;
                            const change = data.ticker.todaysChange || 0;
                            const changePercent = data.ticker.todaysChangePerc || 0;
                            const emoji = change >= 0 ? '📈' : '📉';
                            
                            this.sendMascotResponse(
                                `${ticker} is currently at $${price.toFixed(2)} ${emoji}\\n\\n` +
                                `Today's change: ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
                            );
                        }
                    },
                    error: () => this.sendMascotResponse(`Sorry, I couldn't fetch data for ${ticker}.`)
                });
            }
        } else {
            this.sendMascotResponse('Which stock would you like to know about? Try AAPL, GOOGL, MSFT, AMZN, or TSLA.');
        }
    }
    
    private sendMascotResponse(message: string): void {
        EventBus.emit('mascot-speak', message);
    }
    
}
