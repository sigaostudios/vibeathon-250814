import { Component, OnInit, OnDestroy } from '@angular/core';
import Phaser from 'phaser';
import StartGame from '../game/main';
import { EventBus } from '../game/EventBus';
import { StorageService } from './storage.service';

@Component({
    selector: 'app-phaser-game',
    template: '<div id="game-container"></div>',
    standalone: true,
})
export class PhaserGameComponent implements OnInit, OnDestroy
{
    scene: Phaser.Scene;
    game: Phaser.Game;
    sceneCallback: (scene: Phaser.Scene) => void;
    private loadedConfig: any;

    constructor(private storage: StorageService) {}

    ngOnInit ()
    {
        this.game = StartGame('game-container');

        // Load any saved game configuration (if present)
        this.storage.getItem<any>('gameConfig').then(cfg => {
            this.loadedConfig = cfg;
        });

        EventBus.on('current-scene-ready', (scene: Phaser.Scene) =>
        {
            this.scene = scene;

            if (this.sceneCallback)
            {
                this.sceneCallback(scene);
            }
        });
    }

    ngOnDestroy ()
    {
        if (this.game)
        {
            this.game.destroy(true);
        }
    }
}
