import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    private gameTitle: string = 'Vibeathon';

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'office');

        this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        // Title pulled from config (updates via EventBus)
        this.title = this.add.text(512, 80, this.gameTitle, {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        const applyConfig = (config: any) => {
            if (config && typeof config.gameTitle === 'string' && config.gameTitle.trim() !== '') {
                this.gameTitle = config.gameTitle.trim();
                this.title.setText(this.gameTitle);
            }
        };

        EventBus.on('config-loaded', applyConfig);
        EventBus.on('config-saved', applyConfig);

        this.events.on('shutdown', () => {
            EventBus.off('config-loaded', applyConfig);
            EventBus.off('config-saved', applyConfig);
        });
        this.events.on('destroy', () => {
            EventBus.off('config-loaded', applyConfig);
            EventBus.off('config-saved', applyConfig);
        });

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        this.scene.stop('MainMenu');
        this.scene.start('MascotPlayground');
    }

    moveLogo (vueCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (vueCallback)
                    {
                        vueCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
