import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class StockChat extends Scene {
    private camera!: Phaser.Cameras.Scene2D.Camera;
    private background!: Phaser.GameObjects.Image;
    private mascot!: Phaser.GameObjects.Sprite;
    private chatContainer!: Phaser.GameObjects.Container;
    private quickButtonsContainer?: Phaser.GameObjects.Container;
    private chatInputText!: Phaser.GameObjects.Text;
    private chatPromptText!: Phaser.GameObjects.Text;
    private backButton!: Phaser.GameObjects.Container;
    private currentInput: string = '';
    private isInputActive: boolean = true;
    
    // Speech bubble
    private speechBubble?: Phaser.GameObjects.Container;
    private speechText?: Phaser.GameObjects.Text;
    private speechBg?: Phaser.GameObjects.Graphics;
    private speechTween?: Phaser.Tweens.Tween;
    private isTalking = false;
    
    // Stock display
    private stockDisplay?: Phaser.GameObjects.Container;
    private stockText?: Phaser.GameObjects.Text;
    
    constructor() {
        super('StockChat');
    }

    create() {
        this.camera = this.cameras.main;
        
        // Same background as MascotPlayground
        this.background = this.add.image(512, 384, 'office');

        // Title
        this.add.text(512, 50, 'Stock Market Chat', {
            fontFamily: 'Arial', fontSize: '32px', color: '#2c3e50',
            stroke: '#ffffff', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5);

        // Create mascot - positioned for conversation
        this.mascot = this.add.sprite(300, 350, 'orb');
        if (!this.anims.exists('orb-glow')) {
            this.anims.create({ 
                key: 'orb-glow', 
                frames: this.anims.generateFrameNumbers('orb', { start: 0, end: 8 }), 
                frameRate: 4, 
                repeat: -1, 
                yoyo: true 
            });
        }
        this.mascot.play('orb-glow');
        this.mascot.setScale(1.2); // Slightly larger for conversation
        this.mascot.setDepth(100);
        
        // Start mascot idle animation
        this.startMascotIdle();

        // Create speech bubble
        this.createSpeechBubble();
        
        // Create stock display area
        this.createStockDisplay();

        // Create chat interface
        this.createChatInterface();
        
        // Create back button
        this.createBackButton();

        // Set up event listeners
        this.setupEventListeners();

        // Set up keyboard input
        this.setupKeyboardInput();
        
        // Show welcome message
        this.time.delayedCall(500, () => {
            this.showSpeechBubble('Hello! I\'m your stock market assistant. Ask me about any stock like AAPL, GOOGL, MSFT, AMZN, or TSLA!');
        });

        // Signal scene is ready
        EventBus.emit('current-scene-ready', this);
    }
    
    private startMascotIdle() {
        // Gentle floating animation
        this.tweens.add({
            targets: this.mascot,
            y: this.mascot.y - 8,
            duration: 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    private createSpeechBubble() {
        this.speechBubble = this.add.container(0, 0);
        
        // Create speech bubble background
        this.speechBg = this.add.graphics();
        this.speechBubble.add(this.speechBg);
        
        // Create speech text
        this.speechText = this.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#2c3e50',
            align: 'center',
            wordWrap: { width: 250, useAdvancedWrap: true }
        });
        this.speechBubble.add(this.speechText);
        
        this.speechBubble.setDepth(200);
        this.speechBubble.setVisible(false);
    }
    
    private createStockDisplay() {
        this.stockDisplay = this.add.container(750, 200);
        this.stockDisplay.setDepth(150);
        this.stockDisplay.setVisible(false);
        
        // Background for stock data
        const bg = this.add.rectangle(0, 0, 320, 400, 0xffffff, 0.95);
        bg.setStrokeStyle(2, 0x3498db);
        this.stockDisplay.add(bg);
        
        // Stock text display
        this.stockText = this.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#2c3e50',
            align: 'left',
            wordWrap: { width: 300, useAdvancedWrap: true }
        }).setOrigin(0.5);
        this.stockDisplay.add(this.stockText);
    }

    private createChatInterface() {
        // Create container for chat UI elements
        this.chatContainer = this.add.container(650, 550);
        this.chatContainer.setDepth(200);
        
        // Chat prompt text
        this.chatPromptText = this.add.text(0, -80, 'Ask me about stocks and press ENTER:', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#2c3e50',
            align: 'center',
            stroke: '#ffffff',
            strokeThickness: 2,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.chatContainer.add(this.chatPromptText);
        
        // Input area with background
        const inputBg = this.add.rectangle(0, 0, 400, 45, 0xffffff, 0.95);
        inputBg.setStrokeStyle(2, 0x3498db);
        this.chatContainer.add(inputBg);
        
        // Current input text display
        this.chatInputText = this.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#2c3e50',
            align: 'center'
        }).setOrigin(0.5);
        this.chatContainer.add(this.chatInputText);
        
        // Create quick action buttons
        this.createQuickButtons();
        
        // Update display
        this.updateInputDisplay();
    }
    
    private createQuickButtons() {
        this.quickButtonsContainer = this.add.container(0, 70);
        if (this.chatContainer) {
            this.chatContainer.add(this.quickButtonsContainer);
        }
        
        const buttonData = [
            { text: 'All Stocks', query: 'Show me all stocks', x: -120 },
            { text: 'AAPL', query: 'How is AAPL doing?', x: -40 },
            { text: 'Tesla', query: 'Tell me about Tesla', x: 40 },
            { text: 'Help', query: 'Help', x: 120 }
        ];
        
        buttonData.forEach(btn => {
            const button = this.add.rectangle(btn.x, 0, 70, 32, 0x3498db, 0.9)
                .setStrokeStyle(2, 0x2980b9)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.handleQuickQuery(btn.query))
                .on('pointerover', () => {
                    button.setFillStyle(0x5dade2, 1);
                    button.setScale(1.05);
                })
                .on('pointerout', () => {
                    button.setFillStyle(0x3498db, 0.9);
                    button.setScale(1);
                });
            
            const buttonText = this.add.text(btn.x, 0, btn.text, {
                fontFamily: 'Arial',
                fontSize: '11px',
                color: '#ffffff',
                align: 'center',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            if (this.quickButtonsContainer) {
                this.quickButtonsContainer.add([button, buttonText]);
            }
        });
    }
    
    private createBackButton() {
        this.backButton = this.add.container(80, 60);
        this.backButton.setDepth(300);
        
        // Button background
        const buttonBg = this.add.rectangle(0, 0, 120, 40, 0xe74c3c, 0.9)
            .setStrokeStyle(2, 0xc0392b)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.goBack())
            .on('pointerover', () => {
                buttonBg.setFillStyle(0xec7063, 1);
                buttonBg.setScale(1.05);
            })
            .on('pointerout', () => {
                buttonBg.setFillStyle(0xe74c3c, 0.9);
                buttonBg.setScale(1);
            });
        
        const buttonText = this.add.text(0, 0, '← Back', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.backButton.add([buttonBg, buttonText]);
    }

    private setupEventListeners() {
        // Stock data handling
        EventBus.on('stock-data-received', this.handleStockData, this);
        EventBus.on('stock-api-error', this.handleStockError, this);
        
        // Clean up on destroy
        this.events.on('destroy', () => {
            EventBus.off('stock-data-received', this.handleStockData, this);
            EventBus.off('stock-api-error', this.handleStockError, this);
        });
    }
    
    private setupKeyboardInput() {
        // Enable keyboard input
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (!this.isInputActive) return;
            
            if (event.key === 'Backspace') {
                this.currentInput = this.currentInput.slice(0, -1);
                this.updateInputDisplay();
            } else if (event.key === 'Enter') {
                if (this.currentInput.trim()) {
                    this.handleUserInput(this.currentInput.trim());
                    this.currentInput = '';
                    this.updateInputDisplay();
                }
            } else if (event.key.length === 1 && this.currentInput.length < 50) {
                this.currentInput += event.key;
                this.updateInputDisplay();
            }
        });
        
        // Cursor blinking
        this.startCursorBlink();
    }
    
    private startCursorBlink() {
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.isInputActive && this.chatInputText) {
                    const showCursor = this.chatInputText.text.endsWith('|');
                    
                    if (this.currentInput) {
                        this.chatInputText.setText(showCursor ? this.currentInput : this.currentInput + '|');
                        this.chatInputText.setColor('#2c3e50');
                    } else {
                        this.chatInputText.setText(showCursor ? 'Type here...' : 'Type here...|');
                        this.chatInputText.setColor('#7f8c8d');
                    }
                    
                    this.startCursorBlink();
                }
            }
        });
    }
    
    private updateInputDisplay() {
        if (this.chatInputText) {
            const displayText = this.currentInput || 'Type here...';
            const color = this.currentInput ? '#2c3e50' : '#7f8c8d';
            this.chatInputText.setText(displayText);
            this.chatInputText.setColor(color);
        }
    }
    
    private handleQuickQuery(query: string) {
        this.currentInput = query;
        this.updateInputDisplay();
        this.time.delayedCall(100, () => {
            this.handleUserInput(query);
            this.currentInput = '';
            this.updateInputDisplay();
        });
    }
    
    private handleUserInput(input: string) {
        // Show user input in speech bubble briefly
        this.hideSpeechBubble();
        this.time.delayedCall(200, () => {
            this.showSpeechBubble(`Processing: "${input}"`);
        });
        
        // Process the query
        EventBus.emit('stock-query', input);
    }
    
    private handleStockData(data: any) {
        // Display stock data
        if (this.stockDisplay && this.stockText) {
            let displayText = `${data.symbol}\n`;
            displayText += `Price: $${data.price}\n`;
            displayText += `Change: ${data.change > 0 ? '+' : ''}${data.change}\n`;
            displayText += `Change %: ${data.changePercent > 0 ? '+' : ''}${data.changePercent}%\n`;
            displayText += `Volume: ${data.volume}`;
            
            this.stockText.setText(displayText);
            this.stockDisplay.setVisible(true);
        }
        
        // Show response in speech bubble
        const responseText = `${data.symbol} is trading at $${data.price}. ` +
            `${data.change > 0 ? 'Up' : 'Down'} ${Math.abs(data.changePercent)}% today.`;
        this.showSpeechBubble(responseText);
    }
    
    private handleStockError(error: string) {
        this.showSpeechBubble(`Sorry, I couldn't get that stock data. ${error}`);
        if (this.stockDisplay) {
            this.stockDisplay.setVisible(false);
        }
    }
    
    private showSpeechBubble(message: string) {
        if (!this.speechBubble || !this.speechText || !this.speechBg) return;
        
        // Stop any existing speech
        if (this.speechTween) {
            this.speechTween.destroy();
        }
        
        // Set the text
        this.speechText.setText(message);
        
        // Calculate bubble dimensions
        const textBounds = this.speechText.getBounds();
        const padding = 15;
        const bubbleWidth = Math.min(textBounds.width + (padding * 2), 300);
        const bubbleHeight = textBounds.height + (padding * 2);
        
        // Clear and redraw bubble
        this.speechBg.clear();
        this.speechBg.fillStyle(0xffffff, 0.95);
        this.speechBg.lineStyle(2, 0x3498db, 1);
        
        // Main bubble
        this.speechBg.fillRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12);
        this.speechBg.strokeRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12);
        
        // Tail pointing to mascot
        const tailX = -bubbleWidth/2 + 30;
        const tailY = bubbleHeight/2 - 5;
        this.speechBg.beginPath();
        this.speechBg.moveTo(tailX, tailY);
        this.speechBg.lineTo(tailX - 15, tailY + 15);
        this.speechBg.lineTo(tailX + 15, tailY + 15);
        this.speechBg.closePath();
        this.speechBg.fillPath();
        this.speechBg.strokePath();
        
        // Position bubble above mascot
        const bubbleX = this.mascot.x + 120;
        const bubbleY = this.mascot.y - 80;
        this.speechBubble.setPosition(bubbleX, bubbleY);
        
        // Update text position
        this.speechText.setPosition(-textBounds.width/2, -textBounds.height/2);
        
        // Show with animation
        this.speechBubble.setVisible(true);
        this.speechBubble.setScale(0);
        this.speechBubble.setAlpha(0);
        
        this.speechTween = this.tweens.add({
            targets: this.speechBubble,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Auto-hide after reading time
                const words = message.split(' ').length;
                const readingTime = Math.max(3000, (words / 120) * 60 * 1000);
                
                this.time.delayedCall(readingTime, () => {
                    this.hideSpeechBubble();
                });
            }
        });
    }
    
    private hideSpeechBubble() {
        if (!this.speechBubble || !this.speechTween) return;
        
        this.speechTween = this.tweens.add({
            targets: this.speechBubble,
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.speechBubble!.setVisible(false);
            }
        });
    }
    
    private goBack() {
        this.scene.start('MascotPlayground');
    }
    
    changeScene() {
        this.scene.start('MascotPlayground');
    }
}