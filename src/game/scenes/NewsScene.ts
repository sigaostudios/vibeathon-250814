import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class NewsScene extends Scene {
    private background!: Phaser.GameObjects.Image;
    private titleText!: Phaser.GameObjects.Text;
    private mascot!: Phaser.GameObjects.Sprite;
    private speechBubble!: Phaser.GameObjects.Graphics;
    private speechText!: Phaser.GameObjects.Text;
    private newsContainer!: Phaser.GameObjects.Container;
    private isLoading: boolean = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;
    private currentText: string = '';
    private targetText: string = '';
    private newsCategories = ['general', 'technology', 'sports', 'business', 'entertainment', 'science'];
    private currentCategoryIndex = 0;
    private autoReadTimer?: Phaser.Time.TimerEvent;
    private currentNewsResponse: any = null;
    private currentStoryIndex = 0;
    private isInAutoMode = true;
    private mascotNameText!: Phaser.GameObjects.Text;
    private tickerText!: Phaser.GameObjects.Text;
    private tickerNewsItems: string[] = [];
    private currentTickerIndex: number = 0;

    constructor() {
        super('NewsScene');
    }

    create() {
        this.background = this.add.image(512, 384, 'office');

        // Sigao News Network branding
        this.titleText = this.add.text(512, 30, '📺 SIGAO NEWS NETWORK', {
            fontFamily: 'Arial Black', 
            fontSize: 36, 
            color: '#ffffff',
            stroke: '#ff0000', 
            strokeThickness: 8, 
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Add "LIVE" indicator
        const liveIndicator = this.add.rectangle(850, 30, 60, 25, 0xff0000);
        this.add.text(850, 30, 'LIVE', {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(101);

        // Pulsing animation for LIVE indicator
        this.tweens.add({
            targets: liveIndicator,
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Create mascot (news anchor)
        this.mascot = this.add.sprite(200, 400, 'orb');
        if (this.anims.exists('orb-glow')) {
            this.mascot.play('orb-glow');
        }
        this.mascot.setScale(0.8);

        // Add name plate for mascot
        this.add.rectangle(200, 480, 150, 30, 0x000000, 0.7);
        this.mascotNameText = this.add.text(200, 480, 'Max Sterling', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(100);

        // Create speech bubble container
        this.newsContainer = this.add.container(0, 0);
        
        // Speech bubble background (positioned near mascot's mouth)
        this.speechBubble = this.add.graphics();
        this.drawSpeechBubble(300, 200, 600, 350);
        this.newsContainer.add(this.speechBubble);

        // Speech text (news content)
        this.speechText = this.add.text(320, 230, '', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#1a1a1a',
            wordWrap: { width: 560 },
            lineSpacing: 8,
            backgroundColor: 'transparent'
        });
        this.newsContainer.add(this.speechText);

        // News ticker at bottom
        const ticker = this.add.rectangle(512, 650, 1024, 40, 0x000000, 0.8);
        this.tickerText = this.add.text(1024, 650, 'Loading breaking news...', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffff00'
        }).setOrigin(0, 0.5);

        // Initialize ticker with breaking news
        this.initializeTicker();

        // Animate ticker - start from far right edge of screen
        this.tweens.add({
            targets: this.tickerText,
            x: -1200,
            duration: 20000,
            repeat: -1,
            onRepeat: () => {
                this.tickerText.x = 1024; // Reset to far right edge
                this.updateTickerContent();
            }
        });

        // Create back button
        const backButton = this.add.text(50, 720, '← Exit Newsroom', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            this.stopAutoRead();
            this.scene.start('MascotPlayground');
        });

        backButton.on('pointerover', () => {
            backButton.setScale(1.1);
        });

        backButton.on('pointerout', () => {
            backButton.setScale(1);
        });

        // Help text
        this.add.text(900, 720, 'Ask me anything!', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);

        // Listen for news data from Angular
        EventBus.on('newscast-ready', this.handleNewscast, this);
        EventBus.on('user-question-response', this.handleUserQuestionResponse, this);
        EventBus.on('news-error', this.handleNewsError, this);
        EventBus.on('user-question', this.handleUserQuestion, this);
        
        // Test EventBus connectivity
        EventBus.on('test-angular-event', (data: any) => {
            console.log('🎮 NewsScene: Received test-angular-event from Angular:', data);
        });

        // Cleanup
        this.events.on('shutdown', () => {
            this.stopAutoRead();
            EventBus.off('newscast-ready', this.handleNewscast, this);
            EventBus.off('user-question-response', this.handleUserQuestionResponse, this);
            EventBus.off('news-error', this.handleNewsError, this);
            EventBus.off('user-question', this.handleUserQuestion, this);
            EventBus.off('ticker-news-ready', this.handleTickerNews, this);
        });

        EventBus.emit('current-scene-ready', this);
        
        // Add test functions to global scope for debugging
        (window as any).testNewsQuestion = (question: string) => {
            console.log('Test: Emitting user-question with:', question);
            EventBus.emit('user-question', question);
        };
        
        (window as any).testProcessQuery = (query: string) => {
            console.log('Test: Emitting process-news-query with:', query);
            EventBus.emit('process-news-query', { query });
        };
        
        (window as any).testEventBus = () => {
            console.log('Test: Testing EventBus functionality');
            EventBus.emit('test-event', 'test-data');
            EventBus.on('test-event', (data: any) => console.log('Test: Received test-event:', data));
            EventBus.emit('test-event', 'verification-data');
        };
        
        (window as any).testDirectAPI = async (question: string) => {
            console.log('Test: Making direct API call to backend...');
            try {
                const response = await fetch('/api/llm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: question })
                });
                const data = await response.json();
                console.log('Test: Direct API response:', data);
                return data;
            } catch (error) {
                console.error('Test: Direct API error:', error);
            }
        };
        
        // Start the newscast
        this.startNewscast();
    }

    private drawSpeechBubble(x: number, y: number, width: number, height: number) {
        this.speechBubble.clear();
        
        // Modern speech bubble with gradient and shadow effect
        // Shadow
        this.speechBubble.fillStyle(0x000000, 0.2);
        this.speechBubble.fillRoundedRect(x + 5, y + 5, width, height, 20);
        
        // Main bubble background
        this.speechBubble.fillStyle(0xffffff, 0.98);
        this.speechBubble.lineStyle(3, 0x4a90e2, 1);
        this.speechBubble.fillRoundedRect(x, y, width, height, 20);
        this.speechBubble.strokeRoundedRect(x, y, width, height, 20);
        
        // Header bar with Sigao News branding
        this.speechBubble.fillStyle(0x4a90e2, 1);
        this.speechBubble.fillRoundedRect(x, y, width, 35, { tl: 20, tr: 20, bl: 0, br: 0 });
        
        // Add "LIVE" indicator in header
        this.speechBubble.fillStyle(0xff0000, 1);
        this.speechBubble.fillRoundedRect(x + width - 60, y + 5, 50, 25, 12);
        
        // Speech pointer (tail) pointing to mascot
        this.speechBubble.fillStyle(0xffffff, 0.98);
        this.speechBubble.fillTriangle(
            x - 30, y + height - 100,
            x, y + height - 80,
            x, y + height - 120
        );
        this.speechBubble.lineStyle(3, 0x4a90e2, 1);
        this.speechBubble.strokeTriangle(
            x - 30, y + height - 100,
            x, y + height - 80,
            x, y + height - 120
        );
        
        // Add header text
        const headerText = this.add.text(x + 15, y + 17, '📺 MAX STERLING - SIGAO NEWS', {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: '#ffffff'
        }).setDepth(110);
        this.newsContainer.add(headerText);
        
        // Add LIVE text
        const liveText = this.add.text(x + width - 35, y + 17, 'LIVE', {
            fontFamily: 'Arial Black',
            fontSize: 12,
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(110);
        this.newsContainer.add(liveText);
    }

    private initializeTicker() {
        // Request breaking news for ticker
        EventBus.emit('request-ticker-news');
        
        // Set up listener for ticker news
        EventBus.on('ticker-news-ready', this.handleTickerNews, this);
        
        // Fallback ticker content
        this.tickerNewsItems = [
            'BREAKING: Sigao News Network launches interactive news experience',
            'MARKETS: Tech stocks show mixed performance in early trading',
            'WEATHER: Partly cloudy skies expected across major metropolitan areas',
            'SPORTS: Championship playoffs continue with exciting matchups',
            'TECH: New AI developments changing the digital landscape',
            'WORLD: International leaders gather for climate summit',
            'BREAKING: Local mascot Max Sterling wins "Best News Anchor" award'
        ];
        this.updateTickerContent();
    }

    private handleTickerNews = (articles: any[]) => {
        // Convert news articles to ticker format (up to 10 stories)
        if (articles && articles.length > 0) {
            this.tickerNewsItems = articles.slice(0, 10).map(article => 
                `BREAKING: ${article.title || 'News update available'}`
            );
            this.currentTickerIndex = 0;
            this.updateTickerContent();
        }
    }

    private updateTickerContent() {
        if (this.tickerNewsItems.length > 0) {
            // Cycle through stories in order
            const currentNews = this.tickerNewsItems[this.currentTickerIndex];
            this.tickerText.setText(`${currentNews} • `);
            
            // Move to next story, wrap around to beginning when we reach the end
            this.currentTickerIndex = (this.currentTickerIndex + 1) % this.tickerNewsItems.length;
        }
    }

    private startNewscast() {
        this.isInAutoMode = true;
        this.requestNextCategory();
    }

    private requestNextCategory() {
        if (this.isLoading) return;
        
        const category = this.newsCategories[this.currentCategoryIndex];
        this.currentCategoryIndex = (this.currentCategoryIndex + 1) % this.newsCategories.length;
        
        this.isLoading = true;
        
        // Request newscast from the NewsAgent
        EventBus.emit('request-newscast', { category });
    }

    private handleNewscast(response: any) {
        console.log('NewsScene: Received newscast response:', response);
        
        // Check if this is actually a user question response (backup handling)
        if (!this.isInAutoMode) {
            console.log('NewsScene: Not in auto mode, treating as user question response');
            this.handleUserQuestionResponse(response);
            return;
        }
        
        this.isLoading = false;
        this.currentNewsResponse = response;
        this.currentStoryIndex = 0;
        
        // Start with introduction
        if (response.introduction) {
            this.typewriterEffect(response.introduction, () => {
                // Pause before starting stories
                this.autoReadTimer = this.time.delayedCall(2000, () => {
                    this.readNextStory();
                });
            });
            
            // Anchor animation for introduction
            this.animateAnchor('greeting');
        }
    }

    private readNextStory() {
        if (!this.currentNewsResponse || !this.currentNewsResponse.stories) {
            this.scheduleNextCategory();
            return;
        }

        if (this.currentStoryIndex >= this.currentNewsResponse.stories.length) {
            // Done with stories, show signoff
            if (this.currentNewsResponse.signoff) {
                this.typewriterEffect(this.currentNewsResponse.signoff, () => {
                    this.scheduleNextCategory();
                });
                this.animateAnchor('signoff');
            } else {
                this.scheduleNextCategory();
            }
            return;
        }

        const story = this.currentNewsResponse.stories[this.currentStoryIndex];
        
        // Format the story with headline and content
        let storyText = `📰 ${story.headline}\n\n${story.content}`;
        
        // Add commentary if available
        if (story.commentary) {
            storyText += `\n\n${story.commentary}`;
        }
        
        // Display with typewriter effect
        this.typewriterEffect(storyText, () => {
            this.currentStoryIndex++;
            
            // Wait before next story
            this.autoReadTimer = this.time.delayedCall(3500, () => {
                this.readNextStory();
            });
        });
        
        // Animate anchor for story
        this.animateAnchor('story');
    }

    private scheduleNextCategory() {
        if (!this.isInAutoMode) return;
        
        // Wait 4 seconds before moving to next category
        this.autoReadTimer = this.time.delayedCall(4000, () => {
            this.requestNextCategory();
        });
    }

    private typewriterEffect(text: string, onComplete?: () => void) {
        console.log('🎮 NewsScene: Starting typewriter effect for text:', text);
        // Stop any existing typewriter
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }
        
        this.currentText = '';
        this.targetText = text;
        this.speechText.setText('');
        
        let charIndex = 0;
        const charDelay = 25; // Slightly faster for news delivery
        
        this.typewriterEvent = this.time.addEvent({
            delay: charDelay,
            callback: () => {
                if (charIndex < this.targetText.length) {
                    this.currentText += this.targetText[charIndex];
                    this.speechText.setText(this.currentText);
                    charIndex++;
                } else {
                    // Finished typing
                    console.log('🎮 NewsScene: Typewriter effect complete, calling onComplete callback');
                    this.typewriterEvent?.destroy();
                    this.typewriterEvent = undefined;
                    if (onComplete) {
                        onComplete();
                    }
                }
            },
            repeat: this.targetText.length
        });
    }

    private animateAnchor(type: 'greeting' | 'story' | 'signoff' | 'error') {
        // Different animations based on content type
        switch(type) {
            case 'greeting':
                // Professional nod
                this.tweens.add({
                    targets: this.mascot,
                    y: this.mascot.y - 5,
                    duration: 400,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                break;
            
            case 'story':
                // Slight movement for emphasis
                this.tweens.add({
                    targets: this.mascot,
                    scale: 0.82,
                    duration: 300,
                    yoyo: true,
                    ease: 'Power1'
                });
                break;
            
            case 'signoff':
                // Friendly wave motion
                this.tweens.add({
                    targets: this.mascot,
                    angle: 5,
                    duration: 400,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut'
                });
                break;
            
            case 'error':
                // Confused shrug
                this.tweens.add({
                    targets: this.mascot,
                    angle: -5,
                    duration: 200,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Power2'
                });
                break;
        }
    }

    private handleNewsError(error: any) {
        this.isLoading = false;
        const errorMessage = `This just in: Technical difficulties. ${error.message || ''} We blame the interns.`;
        
        this.typewriterEffect(errorMessage, () => {
            if (this.isInAutoMode) {
                this.scheduleNextCategory();
            }
        });
        
        this.animateAnchor('error');
    }

    private handleUserQuestion = (question: string) => {
        console.log('🎮 NewsScene: Received user question:', question);
        
        // Stop auto-mode when user asks a question
        this.isInAutoMode = false;
        this.stopAutoRead();
        
        // Show that we're processing the question
        this.typewriterEffect(`Excellent question! Let me check my sources...`, () => {
            console.log('🎮 NewsScene: Typewriter complete, emitting process-news-query for:', question);
            // Request answer from NewsAgent
            EventBus.emit('process-news-query', { query: question });
            console.log('🎮 NewsScene: process-news-query event emitted');
        });
        
        // Failsafe: If typewriter doesn't complete within 3 seconds, emit anyway
        this.time.delayedCall(3000, () => {
            console.log('🎮 NewsScene: Failsafe - ensuring process-news-query is emitted');
            EventBus.emit('process-news-query', { query: question });
        });
        
        this.animateAnchor('story');
    }

    private handleUserQuestionResponse = (response: any) => {
        console.log('🎯 NewsScene: Received user question response:', response);
        console.log('🎯 NewsScene: Response type:', typeof response);
        console.log('🎯 NewsScene: Response keys:', Object.keys(response || {}));
        console.log('🎯 NewsScene: Stories:', response?.stories);
        
        // Handle the response to a user question
        this.currentNewsResponse = response;
        this.currentStoryIndex = 0;
        
        // Start with introduction
        if (response && response.introduction) {
            console.log('🎯 NewsScene: Has introduction, starting typewriter for:', response.introduction);
            this.typewriterEffect(response.introduction, () => {
                console.log('🎯 NewsScene: Introduction typewriter complete, moving to stories');
                // Pause before starting stories
                this.autoReadTimer = this.time.delayedCall(1500, () => {
                    this.readUserQuestionStories();
                });
            });
            
            // Anchor animation for user response
            this.animateAnchor('greeting');
        } else {
            console.log('🎯 NewsScene: No introduction, going straight to stories');
            // If no introduction, go straight to stories
            this.readUserQuestionStories();
        }
    }

    private readUserQuestionStories() {
        console.log('🎯 NewsScene: readUserQuestionStories called');
        console.log('🎯 NewsScene: currentNewsResponse:', this.currentNewsResponse);
        console.log('🎯 NewsScene: stories array:', this.currentNewsResponse?.stories);
        console.log('🎯 NewsScene: currentStoryIndex:', this.currentStoryIndex);
        
        if (!this.currentNewsResponse || !this.currentNewsResponse.stories) {
            console.log('🎯 NewsScene: No response or stories, showing ready message');
            this.showReadyForQuestionsMessage();
            return;
        }

        if (this.currentStoryIndex >= this.currentNewsResponse.stories.length) {
            console.log('🎯 NewsScene: All stories read, showing signoff');
            // Done with stories, show signoff and wait for more questions
            if (this.currentNewsResponse.signoff) {
                this.typewriterEffect(this.currentNewsResponse.signoff, () => {
                    this.showReadyForQuestionsMessage();
                });
                this.animateAnchor('signoff');
            } else {
                this.showReadyForQuestionsMessage();
            }
            return;
        }

        const story = this.currentNewsResponse.stories[this.currentStoryIndex];
        console.log('🎯 NewsScene: Current story:', story);
        
        // Format the story with headline and content
        let storyText = `📰 ${story.headline}\n\n${story.content}`;
        
        // Add commentary if available
        if (story.commentary) {
            storyText += `\n\n${story.commentary}`;
        }
        
        console.log('🎯 NewsScene: About to display story text:', storyText);
        console.log('🎯 NewsScene: Story text length:', storyText.length);
        
        // Display with typewriter effect
        this.typewriterEffect(storyText, () => {
            console.log('🎯 NewsScene: Story typewriter complete, moving to next');
            this.currentStoryIndex++;
            
            // Wait before next story
            this.autoReadTimer = this.time.delayedCall(2500, () => {
                this.readUserQuestionStories();
            });
        });
        
        // Animate anchor for story
        this.animateAnchor('story');
    }

    private showReadyForQuestionsMessage() {
        // Show that Max is ready for more questions
        this.autoReadTimer = this.time.delayedCall(2000, () => {
            this.typewriterEffect("That's your answer! Got any other burning questions for me? I'm all ears... well, metaphorically speaking.", () => {
                // Ready for next question
            });
            this.animateAnchor('greeting');
        });
    }

    private stopAutoRead() {
        if (this.autoReadTimer) {
            this.autoReadTimer.destroy();
            this.autoReadTimer = undefined;
        }
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
            this.typewriterEvent = undefined;
        }
    }
}