import { Component, viewChild } from '@angular/core';
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
export class HomeComponent {
    public spritePosition = { x: 0, y: 0 };
    public canToggleMovement = false;
    public canAddSprite = false;
    private currentSceneKey: string = '';
    // Movement state tracking per scene
    private menuMoving = false;
    private gameMoving = false;

    public statusLabel = '—';


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
        console.log('Espionage button clicked - calling AI summary');
        // Use the new AI summary functionality instead of just the latest commit
        this.branchSpyService.getAISummaryOfRecentChanges().subscribe({
            next: (summary) => {
                console.log('Received AI summary:', summary);
                // Send the AI summary to the game scene to display
                EventBus.emit('display-espionage-text', summary);
            },
            error: (error) => {
                console.error('Error getting AI summary:', error);
                EventBus.emit('display-espionage-text', 'Error: ' + error.message);
            }
        });
    }

    // Handle movie recommendation requests from Phaser scene
    private handleMovieRecommendationRequest(userPreferences: string): void {
        console.log('Processing movie recommendation request:', userPreferences);
        
        this.aiService.askBrandonForMovieRecommendations(userPreferences).subscribe({
            next: (response) => {
                console.log('AI response received:', response);
                EventBus.emit('ai-movie-response', response);
            },
            error: (error) => {
                console.error('Error getting Brandon movie recommendations:', error);
                const errorResponse = "Bah! *mutters angrily* My poop sock is smarter than this contraption! The electronic talking box isn't working right now. Try again later, and KEEP IT DOWN while you're at it!";
                EventBus.emit('ai-movie-response', errorResponse);
            }
        });
    }

    private updateStatus(): void {
        const movementOn = this.currentSceneKey === 'MainMenu' ? this.menuMoving
                         : this.currentSceneKey === 'MascotPlayground' ? this.gameMoving
                         : false;
        const movementText = movementOn ? 'On' : 'Off';
        const sceneText = this.currentSceneKey || '—';
        this.statusLabel = `Scene: ${sceneText} • Movement: ${movementText}`;
    }
}
