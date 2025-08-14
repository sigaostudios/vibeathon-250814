import { Component, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { MascotPlayground } from '../../game/scenes/MascotPlayground';
import { EventBus } from '../../game/EventBus';
import { WeatherService } from '../services/weather.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, PhaserGameComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    public spritePosition = { x: 0, y: 0 };
    public canToggleMovement = false;
    public canAddSprite = false;
    public currentSceneKey: string = '';
    // Movement state tracking per scene
    private menuMoving = false;
    private gameMoving = false;

    public statusLabel = '—';
    
    // Weather properties
    public currentWeather: string = '';
    public weatherLocation: string = '';
    public canSwitchToWeather = false;
    public isWeatherScene = false;
    private weatherService = inject(WeatherService);

    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    constructor() {
        // Track the active scene and enable/disable controls accordingly
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
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
        });

        // Listen for weather updates
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

    public locationInput: string = '';
    public isSettingLocation: boolean = false;
    public locationError: string = '';

    public async setLocationFromInput(): Promise<void> {
        if (!this.locationInput.trim()) {
            this.locationError = 'Please enter a city name';
            return;
        }

        this.isSettingLocation = true;
        this.locationError = '';

        try {
            const success = await this.weatherService.setLocationByName(this.locationInput.trim());
            
            if (success) {
                this.locationInput = '';
                this.locationError = '';
                console.log('Location set successfully');
            } else {
                this.locationError = 'Location not found. Try "City, State" format.';
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
        this.statusLabel = `Scene: ${sceneText} • Movement: ${movementText}`;
    }
}
