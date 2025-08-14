import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MascotPlayground extends Scene {
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    titleText!: Phaser.GameObjects.Text;
    mascot!: Phaser.GameObjects.Sprite;
    vibeTween?: Phaser.Tweens.Tween;
    sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
    sprites: Phaser.GameObjects.Sprite[] = [];
    spritesMoving = false;
    private gameTitle = 'Vibeathon Mascot';
    private pulseEnabled = true;
    private music?: Phaser.Sound.BaseSound;
    private musicVolume = 0.04; // very soft
    private sfxVolume = 0.35;   // fairly soft by default
    private speechBubble?: Phaser.GameObjects.Container;
    private speechText?: Phaser.GameObjects.Text;
    private speechBg?: Phaser.GameObjects.Graphics;
    private speechTween?: Phaser.Tweens.Tween;
    private isTalking = false;

    constructor() {
        super('MascotPlayground');
    }

    create() {
        this.camera = this.cameras.main;
        this.background = this.add.image(512, 384, 'office');

        // Title driven by config
        this.titleText = this.add.text(512, 50, this.gameTitle, {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Simple global animations (in case Preloader didn't create them elsewhere)
        // Dog animation removed; using orb instead
        if (!this.anims.exists('bird-fly')) {
            this.anims.create({ key: 'bird-fly', frames: this.anims.generateFrameNumbers('bird', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
        }
        if (!this.anims.exists('frog-idle')) {
            this.anims.create({ key: 'frog-idle', frames: this.anims.generateFrameNumbers('frog', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        }

        // Central mascot
        this.mascot = this.add.sprite(512, 420, 'orb');
        if (!this.anims.exists('orb-glow')) {
            this.anims.create({ key: 'orb-glow', frames: this.anims.generateFrameNumbers('orb', { start: 0, end: 8 }), frameRate: 4, repeat: -1, yoyo: true });
        }
        this.mascot.play('orb-glow');
        this.mascot.setScale(1);
        this.sprites.push(this.mascot);

        // Removed vibe ring for a cleaner orb presentation

        // Particles: Use emitter-returning overload (Phaser 3.80+), per docs
        this.sparkle = this.add.particles(0, 0, 'star', {
            speed: { min: -80, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 900,
            frequency: -1, // burst-only
            quantity: 10,
            blendMode: 'ADD'
        } as any) as Phaser.GameObjects.Particles.ParticleEmitter;

        // Mouse / pointer drag demo
        this.mascot.setInteractive({ useHandCursor: true, draggable: true } as any);
        this.input.setDraggable(this.mascot, true);
        this.input.on('drag', (_pointer: any, obj: any, x: number, y: number) => {
            obj.setPosition(x, y);
        });

        // Allow Angular to add companion sprites
        const onAddSprite = () => {
            const x = Phaser.Math.Between(80, this.scale.width - 80);
            const y = Phaser.Math.Between(120, this.scale.height - 80);
            const options: { key: string; anim: string; scale?: number }[] = [
                { key: 'bird', anim: 'bird-fly', scale: 3 },
                { key: 'frog', anim: 'frog-idle', scale: 2 }
            ];
            const pick = Phaser.Math.RND.pick(options);
            const s = this.add.sprite(x, y, pick.key);
            if (pick.scale) s.setScale(pick.scale);
            s.play(pick.anim);

            // Gentle float tween to make it feel alive
            this.tweens.add({
                targets: s,
                y: y + Phaser.Math.Between(-30, 30),
                duration: 1600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            this.sprites.push(s);
        };

        EventBus.on('add-sprite', onAddSprite);
        EventBus.on('config-loaded', this.applyConfig, this);
        EventBus.on('config-saved', this.applyConfig, this);
        EventBus.on('stock-data-received', this.handleStockData, this);
        EventBus.on('stock-api-error', this.handleStockError, this);
        EventBus.on('mascot-speak', this.showSpeechBubble, this);
        EventBus.on('music-volume-changed', (v: number) => {
            this.musicVolume = Phaser.Math.Clamp(v, 0, 1);
            if (this.music) {
                (this.music as any).setVolume ? (this.music as any).setVolume(this.musicVolume) : ((this.music as any).volume = this.musicVolume);
            }
        });
        EventBus.on('sfx-volume-changed', (v: number) => {
            this.sfxVolume = Phaser.Math.Clamp(v, 0, 1);
        });
        EventBus.on('toggle-sound', (enabled: boolean) => {
            this.sound.mute = !enabled;
        });
        // Removed sound-specific handlers (dog bark)

        // Scene lifecycle cleanup
        this.events.on('shutdown', () => {
            EventBus.off('add-sprite', onAddSprite);
            EventBus.off('config-loaded', this.applyConfig, this);
            EventBus.off('config-saved', this.applyConfig, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
            EventBus.off('mascot-speak', this.showSpeechBubble, this);
        });
        this.events.on('destroy', () => {
            EventBus.off('add-sprite', onAddSprite);
            EventBus.off('config-loaded', this.applyConfig, this);
            EventBus.off('config-saved', this.applyConfig, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
            EventBus.off('mascot-speak', this.showSpeechBubble, this);
        });

        EventBus.emit('current-scene-ready', this);

        // Background music (very soft): add + play with config per Phaser audio docs
        this.music = this.sound.add('bgm');
        const playMusic = () => {
            if (this.music && !(this.music as any).isPlaying) {
                this.music.play({ loop: true, volume: this.musicVolume } as any);
            }
        };
        if (this.sound.locked) {
            this.sound.once('unlocked', playMusic);
        } else {
            playMusic();
        }

        // Schedule periodic sparkle pulses (no sound)
        this.scheduleNextPulse();

        // Schedule random orb SFX at slow random intervals
        if (this.sound.locked) {
            this.sound.once('unlocked', () => this.scheduleNextOrbSound());
        } else {
            this.scheduleNextOrbSound();
        }

        // Create speech bubble container
        this.createSpeechBubble();
    }
    
    private createSpeechBubble() {
        this.speechBubble = this.add.container(0, 0);
        
        // Create speech bubble background
        this.speechBg = this.add.graphics();
        this.speechBubble.add(this.speechBg);
        
        // Create speech text
        this.speechText = this.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#333333',
            align: 'center',
            wordWrap: { width: 300, useAdvancedWrap: true }
        });
        this.speechBubble.add(this.speechText);
        
        this.speechBubble.setDepth(200);
        this.speechBubble.setVisible(false);
    }

    changeScene() {
        this.scene.stop('MascotPlayground');
        this.scene.start('MainMenu');
    }

    toggleMovement(cb?: ({ x, y }: { x: number; y: number }) => void) {
        this.spritesMoving = !this.spritesMoving;

        if (!this.spritesMoving) {
            // stop
            if (this.vibeTween) {
                this.vibeTween.stop();
                this.vibeTween.remove();
                this.vibeTween = undefined;
            }
            return;
        }

        // Start a subtle bob + pulse tween on the mascot
        const startY = this.mascot.y;
        this.vibeTween = this.tweens.add({
            targets: [this.mascot],
            props: {
                y: { value: startY - 12, duration: 900, ease: 'Sine.easeInOut' },
                scale: { value: 1.05, duration: 900, ease: 'Sine.easeInOut' }
            },
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
                cb?.({ x: Math.floor(this.mascot.x), y: Math.floor(this.mascot.y) });
            }
        });

        // Sparkles only appear on barks; no continuous emission here
    }

    private applyConfig(config: any) {
        if (config && typeof config.gameTitle === 'string' && config.gameTitle.trim() !== '') {
            this.gameTitle = config.gameTitle.trim();
            if (this.titleText) {
                this.titleText.setText(this.gameTitle);
            }
        }
    }

    private scheduleNextPulse() {
        const delay = Phaser.Math.Between(3500, 7000);
        this.time.delayedCall(delay, () => {
            if (this.pulseEnabled) {
                this.sparkle.explode(18, this.mascot.x, this.mascot.y);
            }
            this.scheduleNextPulse();
        });
    }

    private scheduleNextOrbSound() {
        const delay = Phaser.Math.Between(8000, 16000);
        this.time.delayedCall(delay, () => {
            // Pick one of the orb sounds at random
            const key = Phaser.Math.RND.pick(['orb1', 'orb2', 'orb3']);
            // Play via the cache (no need to pre-add), passing volume
            try {
                this.sound.play(key, { volume: this.sfxVolume } as any);
            } catch {}
            this.scheduleNextOrbSound();
        });
    }

    
    private showSpeechBubble(message: string) {
        if (!this.speechBubble || !this.speechText || !this.speechBg) return;
        
        // Stop any existing speech
        if (this.speechTween) {
            this.speechTween.destroy();
        }
        
        // Set the text
        this.speechText.setText(message);
        
        // Calculate bubble dimensions - smaller and more proportional
        const textBounds = this.speechText.getBounds();
        const padding = 12; // Smaller padding
        const bubbleWidth = Math.min(textBounds.width + (padding * 2), 280); // Smaller max width
        const bubbleHeight = textBounds.height + (padding * 2);
        const tailHeight = 20;
        
        // Position relative to mascot
        const bubbleX = this.mascot.x + 100; // Position to the right of mascot
        const bubbleY = this.mascot.y - bubbleHeight - tailHeight;
        
        // Draw speech bubble background
        this.speechBg.clear();
        this.speechBg.fillStyle(0xffffff, 0.95);
        this.speechBg.lineStyle(2, 0x333333, 0.8); // Always neutral gray border
        
        // Main bubble
        this.speechBg.fillRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 15);
        this.speechBg.strokeRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 15);
        
        // Tail pointing to mascot
        const tailX = -50; // Point towards mascot
        const tailY = bubbleHeight/2 - 10;
        this.speechBg.beginPath();
        this.speechBg.moveTo(tailX - 15, tailY);
        this.speechBg.lineTo(tailX + 5, tailY - 10);
        this.speechBg.lineTo(tailX + 5, tailY + 10);
        this.speechBg.closePath();
        this.speechBg.fillPath();
        this.speechBg.strokePath();
        
        // Position the bubble
        this.speechBubble.setPosition(bubbleX, bubbleY);
        
        // Update text wrapping and position
        this.speechText.setStyle({
            ...this.speechText.style,
            wordWrap: { width: bubbleWidth - (padding * 2), useAdvancedWrap: true }
        });
        
        // Re-calculate text bounds after wrapping
        const newTextBounds = this.speechText.getBounds();
        this.speechText.setPosition(-newTextBounds.width/2, -newTextBounds.height/2);
        
        // Show with animation
        this.speechBubble.setVisible(true);
        this.speechBubble.setScale(0);
        this.speechBubble.setAlpha(0);
        
        // Start talking animation for appropriate mascot
        this.startTalkingAnimation();
        
        this.speechTween = this.tweens.add({
            targets: this.speechBubble,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Auto-hide after reading time
                const words = message.split(' ').length;
                const readingTime = Math.max(4000, (words / 120) * 60 * 1000);
                
                this.time.delayedCall(readingTime, () => {
                    this.hideSpeechBubble();
                });
            }
        });
        
        // Also emit response to Angular for chat history
        EventBus.emit('mascot-response', message);
    }
    
    private hideSpeechBubble() {
        if (!this.speechBubble || !this.speechTween) return;
        
        this.stopTalkingAnimation();
        
        this.speechTween = this.tweens.add({
            targets: this.speechBubble,
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.speechBubble!.setVisible(false);
            }
        });
    }
    
    private startTalkingAnimation() {
        this.isTalking = true;
        
        const targetMascot = this.mascot;
        
        // Subtle bounce animation
        this.tweens.add({
            targets: targetMascot,
            scaleY: targetMascot.scaleY * 1.1,
            duration: 200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Gentle glow effect - keep neutral
        targetMascot.setTint(0xffffff); // No tint, keep original colors
    }
    
    private stopTalkingAnimation() {
        this.isTalking = false;
        
        const targetMascot = this.mascot;
        
        // Stop bounce animation
        this.tweens.killTweensOf(targetMascot);
        
        this.mascot.setScale(1);
        
        // Remove tint
        targetMascot.clearTint();
    }
    
    private handleStockData(data: any) {
        // Handle incoming stock data
        console.log('Stock data received:', data);
    }
    
    private handleStockError(error: any) {
        // Handle stock API errors
        console.log('Stock API error:', error);
    }
    
}
