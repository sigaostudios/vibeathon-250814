import { Component, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PhaserGameComponent } from '../phaser-game.component';
import { MainMenu } from '../../game/scenes/MainMenu';
import { Game as GameScene } from '../../game/scenes/Game';
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
    public canToggleMovement = false;
    public canAddSprite = false;
    private currentSceneKey: string = '';

    // Get the PhaserGame component instance
    phaserRef = viewChild.required(PhaserGameComponent);

    constructor() {
        // Track the active scene and enable/disable controls accordingly
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
            this.currentSceneKey = scene.scene.key;

            // Enable movement in MainMenu (logo tween) and Game (sprite motion)
            this.canToggleMovement = this.currentSceneKey === 'MainMenu' || this.currentSceneKey === 'Game';

            // Only allow adding sprites in the Game scene
            this.canAddSprite = this.currentSceneKey === 'Game';
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
        } else if (this.currentSceneKey === 'Game') {
            const game = current as unknown as GameScene;
            if (typeof (game as any).toggleMovement === 'function') {
                (game as any).toggleMovement(({ x, y }: { x: number; y: number }) => {
                    this.spritePosition = { x, y };
                });
            }
        }
    }

    public addSprite(): void {
        if (this.currentSceneKey === 'Game') {
            // Delegate sprite creation to the Phaser scene via EventBus
            EventBus.emit('add-sprite');
        }
    }
}
