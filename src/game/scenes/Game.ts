import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    sprites: Phaser.GameObjects.Sprite[];
    spritesMoving: boolean = false;
    moverTween?: Phaser.Tweens.Tween;

    constructor ()
    {
        super('Game');
        this.sprites = [];
    }

    create ()
    {
        this.camera = this.cameras.main;

        this.background = this.add.image(512, 384, 'office');

        this.gameText = this.add.text(512, 50, 'Animal Sprites Demo', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.anims.create({
            key: 'bird-fly',
            frames: this.anims.generateFrameNumbers('bird', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'frog-idle',
            frames: this.anims.generateFrameNumbers('frog', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'dog-bark',
            frames: this.anims.generateFrameNumbers('dog', { start: 0, end: 10 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'cat-jump',
            frames: this.anims.generateFrameNumbers('cat', { start: 0, end: 12 }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'rabbit-jump',
            frames: this.anims.generateFrameNumbers('rabbit', { start: 0, end: 10 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'pig-idle',
            frames: this.anims.generateFrameNumbers('pig', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });

        const bird = this.add.sprite(200, 200, 'bird');
        bird.play('bird-fly');
        bird.setScale(3);
        this.sprites.push(bird);

        const frog = this.add.sprite(400, 300, 'frog');
        frog.play('frog-idle');
        frog.setScale(2);
        this.sprites.push(frog);

        const dog = this.add.sprite(600, 400, 'dog');
        dog.play('dog-bark');
        this.sprites.push(dog);

        const cat = this.add.sprite(800, 300, 'cat');
        cat.play('cat-jump');
        cat.setScale(2);
        this.sprites.push(cat);

        const rabbit = this.add.sprite(300, 500, 'rabbit');
        rabbit.play('rabbit-jump');
        rabbit.setScale(2);
        this.sprites.push(rabbit);

        const pig = this.add.sprite(700, 550, 'pig');
        pig.play('pig-idle');
        this.sprites.push(pig);

        EventBus.emit('current-scene-ready', this);

        // Listen for requests from Angular to add a random sprite
        const onAddSprite = () => {
            const x = Phaser.Math.Between(64, this.scale.width - 64);
            const y = Phaser.Math.Between(64, this.scale.height - 64);

            const animalSprites: { key: string; animation: string; scale?: number }[] = [
                { key: 'bird', animation: 'bird-fly', scale: 3 },
                { key: 'frog', animation: 'frog-idle', scale: 2 },
                { key: 'dog', animation: 'dog-bark' },
                { key: 'cat', animation: 'cat-jump', scale: 2 },
                { key: 'rabbit', animation: 'rabbit-jump', scale: 2 },
                { key: 'pig', animation: 'pig-idle' }
            ];

            const randomAnimal = Phaser.Math.RND.pick(animalSprites);
            const sprite = this.add.sprite(x, y, randomAnimal.key);

            // Ensure scale and animation start immediately
            if (randomAnimal.scale) {
                sprite.setScale(randomAnimal.scale);
            }
            sprite.play(randomAnimal.animation);

            // Optional gentle idle movement so it's not static on-screen
            this.add.tween({
                targets: sprite,
                duration: 2000 + Math.random() * 2000,
                x: x + Phaser.Math.Between(-100, 100),
                y: y + Phaser.Math.Between(-100, 100),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.sprites.push(sprite);
        };

        EventBus.on('add-sprite', onAddSprite);

        // Clean up listener when scene shuts down or is destroyed
        this.events.on('shutdown', () => EventBus.off('add-sprite', onAddSprite));
        this.events.on('destroy', () => EventBus.off('add-sprite', onAddSprite));
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }

    toggleMovement (cb?: ({ x, y }: { x: number, y: number }) => void)
    {
        this.spritesMoving = !this.spritesMoving;

        if (this.spritesMoving) {
            this.startMovementTween(cb);
        } else {
            this.stopMovementTween();
        }
    }

    private startMovementTween (cb?: ({ x, y }: { x: number, y: number }) => void)
    {
        this.stopMovementTween();

        this.moverTween = this.tweens.addCounter({
            from: 0,
            to: Math.PI * 2,
            duration: 2000,
            repeat: -1,
            yoyo: true,
            onUpdate: (tw) => {
                const t = tw.getValue() as number;
                this.sprites.forEach((s, idx) => {
                    s.x += Math.cos(t + idx) * 0.8;
                    s.y += Math.sin(t + idx) * 0.6;
                });
                if (cb && this.sprites[0]) {
                    cb({ x: Math.floor(this.sprites[0].x), y: Math.floor(this.sprites[0].y) });
                }
            }
        });
    }

    private stopMovementTween ()
    {
        if (this.moverTween) {
            this.moverTween.stop();
            this.moverTween.remove();
            this.moverTween = undefined;
        }
    }
}
