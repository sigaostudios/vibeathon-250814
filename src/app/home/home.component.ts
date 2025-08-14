import { Component, viewChild, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { MascotPlayground } from '../../game/scenes/MascotPlayground';
import { EventBus } from '../../game/EventBus';
import { FlightNotificationComponent } from '../services/flight-tracking/flight-notification.component';
import { BranchSpyService } from '../services/branch-spy/branch-spy.service';
import { AIService } from '../services/ai/ai.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterLink, PhaserGameComponent, FlightNotificationComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
    public spritePosition = { x: 0, y: 0 };
    public canToggleMovement = false;
    public canAddSprite = false;
    private currentSceneKey: string = '';
    // Movement state tracking per scene
    private menuMoving = false;
    private gameMoving = false;

    public statusLabel = '—';
    
    // Konami code sequence: up, up, down, down, left, right, left, right, b, a
    private konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    private konamiInput: string[] = [];
    private konamiTimeoutId?: number;


    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    constructor(private branchSpyService: BranchSpyService, private aiService: AIService) {
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

        // Listen for movie recommendation requests from Phaser
        EventBus.on('request-movie-recommendations', (userPreferences: string) => {
            this.handleMovieRecommendationRequest(userPreferences);
        });
    }

    public changeScene(): void {
        const current = this.phaserRef().scene as Phaser.Scene | undefined;
        if (!current) { return; }

        // Defer to a scene-provided changeScene method if present
        const s: any = current as any;
        if (typeof s.changeScene === 'function') {
            s.changeScene();
        }
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

    public engageInEspionage(): void {
        console.log('Espionage activated via Konami code - calling AI summary');
        
        // Enter spy mode immediately when espionage starts
        EventBus.emit('enter-spy-mode');
        
        // Show Brandon's speech bubble while fetching
        EventBus.emit('show-brandon-speech', 'Engaging in super top secret espionage');
        
        // Use the new AI summary functionality instead of just the latest commit
        this.branchSpyService.getAISummaryOfRecentChanges().subscribe({
            next: (summary) => {
                console.log('Received AI summary:', summary);
                // Ensure speech bubble stays for at least 5 seconds
                setTimeout(() => {
                    EventBus.emit('hide-brandon-speech');
                    EventBus.emit('display-espionage-text', summary);
                }, 5000);
            },
            error: (error) => {
                console.error('Error getting AI summary:', error);
                // Ensure speech bubble stays for at least 5 seconds even on error
                setTimeout(() => {
                    EventBus.emit('hide-brandon-speech');
                    EventBus.emit('display-espionage-text', 'Error: ' + error.message);
                }, 5000);
            }
        });
    }

    // Handle movie recommendation requests from Phaser scene
    private handleMovieRecommendationRequest(userPreferences: string): void {
        console.log('Processing movie recommendation request:', userPreferences);
        
        this.aiService.askBrandonForMovieRecommendations(userPreferences).subscribe({
            next: (response) => {
                console.log('AI response received:', response);
                
                // Analyze Brandon's response for approval/disapproval
                this.analyzeBrandonSentiment(response);
                
                EventBus.emit('ai-movie-response', response);
            },
            error: (error) => {
                console.error('Error getting Brandon movie recommendations:', error);
                const errorResponse = "Bah! *mutters angrily* My poop sock is smarter than this contraption! The electronic talking box isn't working right now. Try again later, and KEEP IT DOWN while you're at it!";
                
                // Error responses should show disapproval
                EventBus.emit('brandon-disapprove-movie');
                
                EventBus.emit('ai-movie-response', errorResponse);
            }
        });
    }

    private analyzeBrandonSentiment(response: string): void {
        const lowerResponse = response.toLowerCase();
        
        // Check for money-related content first (highest priority)
        const moneyKeywords = ['money', 'million', 'billion', 'box office', 'gross', '$', 'earned', 'made', 'revenue', 'profit'];
        let hasMoney = false;
        let hasHighGross = false;
        
        moneyKeywords.forEach(word => {
            if (lowerResponse.includes(word)) {
                console.log(`Found money keyword: "${word}"`);
                hasMoney = true;
            }
        });
        
        // Check for specific dollar amounts over $100 million
        const dollarMatches = response.match(/\$(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|billion)/gi);
        if (dollarMatches) {
            dollarMatches.forEach(match => {
                console.log(`Found dollar amount: ${match}`);
                const numberPart = match.replace(/[$,\s]/g, '').match(/(\d+(?:\.\d+)?)/);
                if (numberPart) {
                    const amount = parseFloat(numberPart[1]);
                    const isBillion = match.toLowerCase().includes('billion');
                    const totalAmount = isBillion ? amount * 1000 : amount; // Convert billions to millions
                    
                    if (totalAmount >= 100) {
                        console.log(`High grossing movie detected: $${totalAmount} million`);
                        hasHighGross = true;
                    }
                }
            });
        }
        
        // Also check for general "over X million" patterns
        const grossPatterns = [
            /over (\d+) million/gi,
            /more than (\d+) million/gi,
            /grossed (\d+) million/gi,
            /made (\d+) million/gi
        ];
        
        grossPatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    console.log(`Found gross pattern: ${match}`);
                    const amount = parseInt(match.match(/(\d+)/)?.[1] || '0');
                    if (amount >= 100) {
                        console.log(`High grossing movie detected from pattern: ${amount} million`);
                        hasHighGross = true;
                    }
                });
            }
        });
        
        // If money or high grosses are mentioned, show money Brandon
        if (hasMoney || hasHighGross) {
            console.log('💰 IMAGE SELECTION: AmishBrandonMoney.png');
            console.log('💰 REASON: Money or high grosses detected');
            console.log('💰 DETAILS:', {
                hasMoney: hasMoney,
                hasHighGross: hasHighGross,
                detectedKeywords: moneyKeywords.filter(word => lowerResponse.includes(word)),
                response: response.substring(0, 200) + '...'
            });
            EventBus.emit('brandon-show-money');
            return; // Don't check other sentiments if money is involved
        }
        
        // Regular sentiment analysis if no money detected
        const approvalWords = ['excellent', 'wonderful', 'brilliant', 'masterpiece', 'worth every penny', 'love', 'great', 'fantastic', 'amazing', 'perfect', 'good', 'solid', 'recommend', 'classic'];
        const disapprovalWords = ['terrible', 'awful', 'disgusting', 'abomination', 'nonsense', 'contraption', 'existential crisis', 'hate', 'horrible', 'stupid', 'ridiculous'];
        
        let approvalCount = 0;
        let disapprovalCount = 0;
        
        // Count approval words
        approvalWords.forEach(word => {
            if (lowerResponse.includes(word)) {
                console.log(`Found approval word: "${word}"`);
                approvalCount++;
            }
        });
        
        // Count disapproval words  
        disapprovalWords.forEach(word => {
            if (lowerResponse.includes(word)) {
                console.log(`Found disapproval word: "${word}"`);
                disapprovalCount++;
            }
        });
        
        console.log(`Brandon sentiment analysis: ${approvalCount} approval words, ${disapprovalCount} disapproval words`);
        
        // Determine Brandon's mood based on word counts
        if (approvalCount > disapprovalCount && approvalCount > 0) {
            console.log('👍 IMAGE SELECTION: AmishBrandonApproval.png');
            console.log('👍 REASON: More approval words than disapproval words detected');
            console.log('👍 DETAILS:', {
                approvalCount: approvalCount,
                disapprovalCount: disapprovalCount,
                approvalWords: approvalWords.filter(word => lowerResponse.includes(word)),
                response: response.substring(0, 200) + '...'
            });
            EventBus.emit('brandon-approve-movie');
        } else if (disapprovalCount > approvalCount && disapprovalCount > 0) {
            console.log('👎 IMAGE SELECTION: AmishBrandonDisapproval.png');
            console.log('👎 REASON: More disapproval words than approval words detected');
            console.log('👎 DETAILS:', {
                approvalCount: approvalCount,
                disapprovalCount: disapprovalCount,
                disapprovalWords: disapprovalWords.filter(word => lowerResponse.includes(word)),
                response: response.substring(0, 200) + '...'
            });
            EventBus.emit('brandon-disapprove-movie');
        } else {
            console.log('😐 IMAGE SELECTION: No change (staying current expression)');
            console.log('😐 REASON: Equal or insufficient sentiment words detected');
            console.log('😐 DETAILS:', {
                approvalCount: approvalCount,
                disapprovalCount: disapprovalCount,
                response: response.substring(0, 200) + '...'
            });
            // Keep current expression
        }
    }

    private updateStatus(): void {
        const movementOn = this.currentSceneKey === 'MainMenu' ? this.menuMoving
                         : this.currentSceneKey === 'MascotPlayground' ? this.gameMoving
                         : false;
        const movementText = movementOn ? 'On' : 'Off';
        const sceneText = this.currentSceneKey || '—';
        this.statusLabel = `Scene: ${sceneText} • Movement: ${movementText}`;
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        // Clear existing timeout
        if (this.konamiTimeoutId) {
            clearTimeout(this.konamiTimeoutId);
        }

        // Add the pressed key to the input sequence
        this.konamiInput.push(event.code);

        // Keep only the last 10 keys (length of Konami sequence)
        if (this.konamiInput.length > this.konamiSequence.length) {
            this.konamiInput.shift();
        }

        // Check if the current sequence matches the Konami code
        if (this.konamiInput.length === this.konamiSequence.length) {
            const isKonamiCode = this.konamiInput.every((key, index) => key === this.konamiSequence[index]);
            
            if (isKonamiCode) {
                console.log('Konami code detected! Engaging espionage...');
                this.engageInEspionage();
                this.konamiInput = []; // Reset sequence
                return;
            }
        }

        // Set timeout to reset sequence after 3 seconds of inactivity
        this.konamiTimeoutId = window.setTimeout(() => {
            this.konamiInput = [];
        }, 3000);
    }

    ngOnDestroy(): void {
        if (this.konamiTimeoutId) {
            clearTimeout(this.konamiTimeoutId);
        }
    }
}
