import { Component, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { EventBus } from '../../game/EventBus';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterLink, PhaserGameComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    public spritePosition = { x: 0, y: 0 };
    public canMoveSprite = false;

    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    constructor() {
        // Set up EventBus subscriptions
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
            this.canMoveSprite = scene.scene.key !== 'MainMenu';
        });
    }

    public changeScene(): void {
        const scene = this.phaserRef().scene as MainMenu;
        if (scene) {
            scene.changeScene();
        }
    }

    public moveSprite(): void {
        const scene = this.phaserRef().scene as MainMenu;
        if (scene) {
            scene.moveLogo(({ x, y }) => {
                this.spritePosition = { x, y };
            });
        }
    }

    public addSprite(): void {
        // Delegate sprite creation to the Phaser scene via EventBus
        EventBus.emit('add-sprite');
    }
}
