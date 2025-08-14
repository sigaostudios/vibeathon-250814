export class VibeathonMascot extends Phaser.GameObjects.Sprite {
    private speed: number = 150;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'orb');
        
        scene.add.existing(this);
        this.setInteractive({ useHandCursor: true });
        
        if (!scene.anims.exists('mascot-idle')) {
            scene.anims.create({
                key: 'mascot-idle',
                frames: scene.anims.generateFrameNumbers('orb', { start: 0, end: 8 }),
                frameRate: 4,
                repeat: -1,
                yoyo: true
            });
        }
        
        this.play('mascot-idle');
        this.setScale(0.8);
    }

    updateMovement(cursors?: Phaser.Types.Input.Keyboard.CursorKeys) {
        if (!cursors) return;
        
        if (cursors.left?.isDown) {
            this.x -= this.speed * this.scene.game.loop.delta / 1000;
        }
        if (cursors.right?.isDown) {
            this.x += this.speed * this.scene.game.loop.delta / 1000;
        }
        if (cursors.up?.isDown) {
            this.y -= this.speed * this.scene.game.loop.delta / 1000;
        }
        if (cursors.down?.isDown) {
            this.y += this.speed * this.scene.game.loop.delta / 1000;
        }
        
        this.x = Phaser.Math.Clamp(this.x, 32, this.scene.scale.width - 32);
        this.y = Phaser.Math.Clamp(this.y, 32, this.scene.scale.height - 32);
    }
}