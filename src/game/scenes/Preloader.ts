import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.image('office', 'office.png');
        
        this.load.spritesheet('bird', 'sprites/BirdFly.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('frog', 'sprites/FrogIdle.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('dog', 'sprites/GoldenBarking.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('cat', 'sprites/JumpCattt.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('rabbit', 'sprites/Jumping.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('pig', 'sprites/PigIdle.png', { frameWidth: 64, frameHeight: 64 });

        // Orb mascot (3x3 = 9 frames, 237x213 per frame)
        this.load.spritesheet('orb', 'orb.png', { frameWidth: 237, frameHeight: 213 });
        
        // Amish Brandon mascots - different expressions
        this.load.image('amish-brandon', 'sprites/AmishBrandonMoney.png');
        this.load.image('amish-brandon-money', 'sprites/AmishBrandonMoney.png');
        this.load.image('amish-brandon-disapproval', 'sprites/AmishBrandonDisapproval.png');
        this.load.image('amish-brandon-movie', 'sprites/AmishBrandonMovie.png');
        this.load.image('amish-brandon-spy', 'sprites/AmishBrandonSpy.png');
        this.load.image('amish-brandon-face', 'sprites/ABFace.png'); // Alternative neutral face
        
        // Sprite Fanta can
        this.load.image('sprite-can', 'sprites/imgbin-sprite-fizzy-drinks-coca-cola-fanta-beverage-can-fanta-sprite-easy-open-can-illustration-be9j6i4QyWc9apqwAvp5TY1Ad.png');
        
        // Airplane sprite for flight tracking
        this.load.svg('airplane', 'sprites/airplane.svg', { width: 32, height: 32 });
        // Background music + Orb SFX
        this.load.audio('bgm', 'sounds/bg.mp3');
        this.load.audio('orb1', 'sounds/orbsound1.mp3');
        this.load.audio('orb2', 'sounds/orbsound2.wav');
        this.load.audio('orb3', 'sounds/orbsound3.wav');
    }

    create ()
    {
        // Optionally display a title from config while leaving preloader
        const title = this.add.text(512, 40, 'Vibeathon', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(100);

        const applyConfig = (config: any) => {
            if (config && typeof config.gameTitle === 'string' && config.gameTitle.trim() !== '') {
                title.setText(config.gameTitle.trim());
            }
        };

        // Update if Angular has loaded config already
        // Note: Preloader is brief; title is best visible in menu + game
        // wire-up anyway to be consistent across scenes
        EventBus.on('config-loaded', applyConfig);
        EventBus.on('config-saved', applyConfig);
        this.events.on('shutdown', () => {
            EventBus.off('config-loaded', applyConfig);
            EventBus.off('config-saved', applyConfig);
        });

        //  Move to the MascotPlayground scene directly
        this.scene.start('MascotPlayground');
    }
}
