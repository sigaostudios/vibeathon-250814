import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventBus } from '../../game/EventBus';
import { StorageService } from '../storage.service';
import { AutoZipCodeService, LocationResult } from '../services/flight-tracking/auto-zipcode.service';

export interface GameConfig {
    gameTitle: string;
    soundEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
    difficulty: 'easy' | 'medium' | 'hard';
    playerName: string;
    githubToken: string;
    groqApiKey: string;
    zipCode: string;
}

@Component({
    selector: 'app-configuration',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './configuration.component.html',
    styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {
    config: GameConfig = {
        gameTitle: 'Vibeathon',
        soundEnabled: true,
        musicVolume: 70,
        sfxVolume: 80,
        difficulty: 'medium',
        playerName: 'Player',
        githubToken: '',
        groqApiKey: '',
        zipCode: ''
    };

    savedMessage = '';
    isDetectingLocation = false;
    detectedLocation: LocationResult | null = null;

    constructor(
        private storage: StorageService,
        private autoZipCodeService: AutoZipCodeService
    ) {}

    ngOnInit(): void {
        this.storage.getItem<GameConfig>('gameConfig').then((saved) => {
            if (saved) {
                this.config = saved;
                
                // If ZIP code is empty, auto-detect it
                if (!this.config.zipCode) {
                    this.autoDetectZipCode();
                }
            } else {
                // No saved config, auto-detect ZIP code for new users
                this.autoDetectZipCode();
            }
        });
    }

    async autoDetectZipCode(): Promise<void> {
        if (this.isDetectingLocation) return;
        
        this.isDetectingLocation = true;
        console.log('🗺️ Auto-detecting location for ZIP code...');

        try {
            const locationResult = await this.autoZipCodeService.getZipCodeFromLocation();
            
            if (locationResult) {
                this.detectedLocation = locationResult;
                this.config.zipCode = locationResult.zipCode;
                
                console.log(`✅ Location detected: ${locationResult.city}, ${locationResult.state} (${locationResult.zipCode}) via ${locationResult.source}`);
                
                // Auto-save the detected ZIP code
                await this.saveConfiguration();
                
                // Show success message with location info
                this.savedMessage = `📍 Auto-detected: ${locationResult.city}, ${locationResult.state} (${locationResult.zipCode})`;
                setTimeout(() => {
                    this.savedMessage = '';
                }, 5000);
            } else {
                console.warn('❌ Could not detect location, using fallback');
                this.detectedLocation = this.autoZipCodeService.getFallbackOptions()[0];
                this.config.zipCode = this.detectedLocation.zipCode;
                await this.saveConfiguration();
            }
        } catch (error) {
            console.error('Location detection failed:', error);
            this.detectedLocation = this.autoZipCodeService.getFallbackOptions()[0];
            this.config.zipCode = this.detectedLocation.zipCode;
            await this.saveConfiguration();
        } finally {
            this.isDetectingLocation = false;
        }
    }

    onSoundToggle(): void {
        EventBus.emit('toggle-sound', this.config.soundEnabled);
    }

    onMusicVolumeChange(): void {
        EventBus.emit('music-volume-changed', this.config.musicVolume / 100);
    }

    onSfxVolumeChange(): void {
        EventBus.emit('sfx-volume-changed', this.config.sfxVolume / 100);
    }

    onDifficultyChange(): void {
        EventBus.emit('difficulty-changed', this.config.difficulty);
    }

    async saveConfiguration(): Promise<void> {
        await this.storage.setItem<GameConfig>('gameConfig', this.config);
        this.savedMessage = 'Configuration saved successfully!';

        EventBus.emit('config-saved', this.config);
        EventBus.emit('zipcode-updated', this.config.zipCode);

        setTimeout(() => {
            this.savedMessage = '';
        }, 3000);
    }

    detectLocationAgain(): void {
        this.autoDetectZipCode();
    }

    resetToDefaults(): void {
        this.config = {
            gameTitle: 'Vibeathon',
            soundEnabled: true,
            musicVolume: 70,
            sfxVolume: 80,
            difficulty: 'medium',
            playerName: 'Player',
            githubToken: '',
            groqApiKey: '',
            zipCode: ''
        };
        this.saveConfiguration();
    }
}
