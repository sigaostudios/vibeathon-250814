import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventBus } from '../../game/EventBus';
import { StorageService } from '../storage.service';

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

    constructor(private storage: StorageService) {}

    ngOnInit(): void {
        this.storage.getItem<GameConfig>('gameConfig').then((saved) => {
            if (saved) {
                this.config = saved;
            }
        });
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
