import { Component, viewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { MascotPlayground } from '../../game/scenes/MascotPlayground';
import { EventBus } from '../../game/EventBus';
import { StocksService } from '../stocks.service';
import { Subscription } from 'rxjs';
import { WeatherService } from '../services/weather.service';

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
    public currentSceneKey: string = '';
    // Movement state tracking per scene
    private menuMoving = false;
    private gameMoving = false;
    
    // Stock chat mode
    public stockChatActive = false;

    public statusLabel = '—';
    
    // Weather properties
    public currentWeather: string = '';
    public weatherLocation: string = '';
    public canSwitchToWeather = false;
    public isWeatherScene = false;
    private weatherService = inject(WeatherService);

    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    private sceneReadyHandler = (scene: Phaser.Scene) => {
        console.log('Scene ready:', scene.scene.key); // Debug log
        this.currentSceneKey = scene.scene.key;

        // Enable movement in MainMenu (logo tween) and MascotPlayground (mascot tween)
        this.canToggleMovement = this.currentSceneKey === 'MainMenu' || this.currentSceneKey === 'MascotPlayground';

            // Only allow adding sprites in the MascotPlayground scene
            this.canAddSprite = this.currentSceneKey === 'MascotPlayground';

            // Enable weather scene switching from any scene
            this.canSwitchToWeather = true;

            // Track if we're in the weather scene
            this.isWeatherScene = this.currentSceneKey === 'WeatherPlayground';

        // Reset movement indicators when the scene changes
        if (this.currentSceneKey === 'MainMenu') {
            this.menuMoving = false;
        } else if (this.currentSceneKey === 'MascotPlayground') {
            this.gameMoving = false;
        }

        this.updateStatus();
    };

    constructor(private stocksService: StocksService) {
        // Track the active scene and enable/disable controls accordingly
        EventBus.on('current-scene-ready', this.sceneReadyHandler);
        EventBus.on('weather-data-received', (weatherData: any) => {
            this.currentWeather = weatherData.condition;
            this.weatherLocation = weatherData.location;
            console.log('Weather update in Angular:', weatherData);
        });

        EventBus.on('weather-error', (error: any) => {
            this.currentWeather = 'unavailable';
            this.weatherLocation = 'Unknown';
            console.warn('Weather error in Angular:', error);
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
        EventBus.off('current-scene-ready', this.sceneReadyHandler);
        EventBus.off('close-stock-chat');
        EventBus.off('process-stock-query');
    }

    public changeScene(): void {
        const phaserGame = this.phaserRef().game;
        if (!phaserGame) { return; }

        console.log('Changing scene from:', this.currentSceneKey); // Debug log
        
        // Context-aware scene changing using game instance for reliability
        if (this.currentSceneKey === 'StockChat') {
            // From StockChat, go back to MascotPlayground
            phaserGame.scene.stop('StockChat');
            phaserGame.scene.start('MascotPlayground');
            this.stockChatActive = false;
        } else if (this.currentSceneKey === 'MainMenu') {
            // From MainMenu, go to MascotPlayground
            phaserGame.scene.stop('MainMenu');
            phaserGame.scene.start('MascotPlayground');
        } else if (this.currentSceneKey === 'MascotPlayground') {
            // From MascotPlayground, go to MainMenu
            phaserGame.scene.stop('MascotPlayground');
            phaserGame.scene.start('MainMenu');
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
        const phaserGame = this.phaserRef().game;
        if (phaserGame && phaserGame.scene) {
            console.log('Toggle stock chat - current scene:', this.currentSceneKey, 'stockChatActive:', this.stockChatActive); // Debug log
            
            if (this.stockChatActive || this.currentSceneKey === 'StockChat') {
                // Close stock chat and return to MascotPlayground
                console.log('Closing stock chat, returning to MascotPlayground'); // Debug log
                phaserGame.scene.stop('StockChat');
                phaserGame.scene.start('MascotPlayground');
                this.stockChatActive = false;
            } else {
                // Open stock chat scene
                console.log('Opening stock chat scene'); // Debug log
                if (this.currentSceneKey) {
                    phaserGame.scene.stop(this.currentSceneKey);
                }
                phaserGame.scene.start('StockChat');
                this.stockChatActive = true;
            }
            this.updateStatus();
        }
    }
    
    public closeStockChat(): void {
        // Navigate back to MascotPlayground
        const phaserGame = this.phaserRef().game;
        if (phaserGame) {
            phaserGame.scene.stop('StockChat');
            phaserGame.scene.start('MascotPlayground');
        }
        this.stockChatActive = false;
        this.updateStatus();
    }


    public switchToWeatherScene(): void {
        const current = this.phaserRef().scene;
        if (current) {
            current.scene.start('WeatherPlayground');
        }
    }
    
    public switchToMascotScene(): void {
        const current = this.phaserRef().scene;
        if (current) {
            current.scene.start('MascotPlayground');
        }
    }

    public switchToMainMenu(): void {
        const current = this.phaserRef().scene;
        if (current) {
            current.scene.start('MainMenu');
        }
    }

    public cityInput: string = '';
    public stateInput: string = '';
    public isSettingLocation: boolean = false;
    public locationError: string = '';

    public async setLocationFromInputs(): Promise<void> {
        if (!this.cityInput.trim() || !this.stateInput.trim()) {
            this.locationError = 'Please enter both city and state';
            return;
        }

        this.isSettingLocation = true;
        this.locationError = '';

        try {
            // Combine city and state with comma for the weather service
            const locationString = `${this.cityInput.trim()}, ${this.stateInput.trim()}`;
            const success = await this.weatherService.setLocationByName(locationString);
            
            if (success) {
                this.cityInput = '';
                this.stateInput = '';
                this.locationError = '';
                console.log('Location set successfully');
            } else {
                this.locationError = 'Location not found. Please check city and state spelling.';
            }
        } catch (error) {
            this.locationError = 'Failed to set location. Please try again.';
            console.error('Location setting error:', error);
        }

        this.isSettingLocation = false;
    }

    public getCurrentLocationName(): string {
        return this.weatherService.getCurrentLocationName();
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
        console.log('Home: Processing user message:', message); // Debug
        const lowerMessage = message.toLowerCase();
        
        // Detect stock-related queries
        const hasStockKeyword = ['stock', 'price', 'market', 'shares', 'trading', 'value', 'worth', 'cost', 'buy', 'sell', 'how is', 'what is', 'show me', 'tell me about'].some(keyword => lowerMessage.includes(keyword));
        const mentionedTicker = this.extractTicker(lowerMessage);
        
        console.log('Home: Has stock keyword:', hasStockKeyword, 'Mentioned ticker:', mentionedTicker); // Debug
        
        if (hasStockKeyword || mentionedTicker) {
            console.log('Home: Calling handleStockQuery'); // Debug
            this.handleStockQuery(message, mentionedTicker);
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            this.sendMascotResponse('Hello! I\'m your stock market companion. Ask me about any stock like AAPL, GOOGL, or MSFT!');
        } else if (lowerMessage.includes('help')) {
            this.sendMascotResponse('I can help you with stock prices! Try asking:\\n• "What\'s the price of AAPL?"\\n• "Show me Microsoft stock"\\n• "How is Tesla doing?"\\n• "Get all stocks"');
        } else {
            console.log('Home: No stock query detected, sending generic response'); // Debug
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
        console.log('Home: Processing stock query:', message, 'ticker:', ticker); // Debug
        
        if (message.toLowerCase().includes('all') || message.toLowerCase().includes('everything')) {
            this.stocksService.getAllTickersSnapshot(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']).subscribe({
                next: (data) => {
                    console.log('Home: Received all stocks data:', data); // Debug
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
                        
                        // Also emit individual stock data for StockChat scene
                        const firstStock = data.tickers[0];
                        if (firstStock && firstStock.day) {
                            EventBus.emit('stock-data-received', {
                                symbol: firstStock.ticker,
                                price: firstStock.day.c || 0,
                                change: firstStock.todaysChange || 0,
                                changePercent: firstStock.todaysChangePerc || 0,
                                volume: firstStock.day.v || 0
                            });
                        }
                    }
                },
                error: (error) => {
                    console.error('Home: Stock service error:', error); // Debug
                    this.sendMascotResponse('Sorry, I couldn\'t fetch the stock data right now.');
                    EventBus.emit('stock-api-error', 'Failed to fetch all stocks data');
                }
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
                            
                            const response = `${ticker} 30-day history:\\n\\n` +
                                `Start: $${first.c.toFixed(2)}\\n` +
                                `Current: $${last.c.toFixed(2)}\\n` +
                                `Change: ${emoji} ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
                            
                            this.sendMascotResponse(response);
                            
                            // Emit stock data for StockChat scene
                            EventBus.emit('stock-data-received', {
                                symbol: ticker,
                                price: last.c,
                                change: change,
                                changePercent: changePercent,
                                volume: last.v || 0
                            });
                        }
                    },
                    error: (error) => {
                        console.error('Home: Stock history error:', error); // Debug
                        this.sendMascotResponse(`Sorry, I couldn't fetch the history for ${ticker}.`);
                        EventBus.emit('stock-api-error', `Failed to fetch history for ${ticker}`);
                    }
                });
            } else {
                this.stocksService.getSnapshot(ticker).subscribe({
                    next: (data) => {
                        console.log('Home: Received stock data for', ticker, ':', data); // Debug
                        if (data.ticker && data.status === 'OK') {
                            const snapshot = data.ticker;
                            const price = snapshot.day?.c || 0;
                            const change = snapshot.todaysChange || 0;
                            const changePercent = snapshot.todaysChangePerc || 0;
                            const volume = snapshot.day?.v || 0;
                            const high = snapshot.day?.h || 0;
                            const low = snapshot.day?.l || 0;
                            const open = snapshot.day?.o || 0;
                            const emoji = change >= 0 ? '📈' : '📉';
                            
                            const response = `${ticker} is currently at $${price.toFixed(2)} ${emoji}\\n\\n` +
                                `Today's change: ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)\\n` +
                                `High: $${high.toFixed(2)} | Low: $${low.toFixed(2)}\\n` +
                                `Volume: ${volume.toLocaleString()}`;
                            
                            this.sendMascotResponse(response);
                            
                            // Emit comprehensive stock data for StockChat scene
                            EventBus.emit('stock-data-received', {
                                symbol: ticker,
                                price: price,
                                change: change,
                                changePercent: changePercent,
                                volume: volume,
                                high: high,
                                low: low,
                                open: open,
                                bid: snapshot.lastQuote?.bid || 0,
                                ask: snapshot.lastQuote?.ask || 0,
                                lastTradePrice: snapshot.lastTrade?.price || price,
                                lastTradeSize: snapshot.lastTrade?.size || 0,
                                updated: snapshot.updated || Date.now(),
                                fmv: snapshot.fmv
                            });
                        }
                    },
                    error: (error) => {
                        console.error('Home: Stock snapshot error:', error); // Debug
                        this.sendMascotResponse(`Sorry, I couldn't fetch data for ${ticker}.`);
                        EventBus.emit('stock-api-error', `Failed to fetch data for ${ticker}`);
                    }
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
