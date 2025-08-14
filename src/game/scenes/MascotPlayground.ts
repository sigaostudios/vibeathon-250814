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
    private espionageText?: Phaser.GameObjects.Text;
    private flightTexts: Phaser.GameObjects.Text[] = [];
    private airplaneSprites: Phaser.GameObjects.Sprite[] = [];
    private flightData: Map<Phaser.GameObjects.Sprite, any> = new Map();

    constructor() {
        super('MascotPlayground');
    }

    create() {
        this.camera = this.cameras.main;
        this.background = this.add.image(512, 384, 'office');

        // Title removed - no text display

        // Simple global animations (in case Preloader didn't create them elsewhere)
        // Dog animation removed; using orb instead
        if (!this.anims.exists('bird-fly')) {
            this.anims.create({ key: 'bird-fly', frames: this.anims.generateFrameNumbers('bird', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
        }
        if (!this.anims.exists('frog-idle')) {
            this.anims.create({ key: 'frog-idle', frames: this.anims.generateFrameNumbers('frog', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        }

        // Central mascot - Amish Brandon Money
        this.mascot = this.add.sprite(512, 420, 'amish-brandon');
        this.mascot.setScale(0.5);
        this.sprites.push(this.mascot);

        // Make Amish Brandon bounce up and down
        this.tweens.add({
            targets: this.mascot,
            y: 390,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

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

        // Mouse / pointer interaction - both drag and click
        this.mascot.setInteractive({ useHandCursor: true, draggable: true } as any);
        this.input.setDraggable(this.mascot, true);
        
        // Drag functionality
        this.input.on('drag', (_pointer: any, obj: any, x: number, y: number) => {
            obj.setPosition(x, y);
        });

        // Click functionality for movie recommendations
        this.mascot.on('pointerdown', (pointer: any) => {
            // Only trigger on left click (not during drag)
            if (pointer.leftButtonDown() && !pointer.justMoved) {
                EventBus.emit('brandon-clicked');
            }
        });

        // Allow Angular to add companion sprites
        const onAddSprite = () => {
            const x = Phaser.Math.Between(80, this.scale.width - 80);
            const y = Phaser.Math.Between(120, this.scale.height - 80);
            
            // Add Sprite Fanta can
            const s = this.add.sprite(x, y, 'sprite-can');
            s.setScale(0.3); // Scale down the can to appropriate size
            
            // Make it clickable for removal
            s.setInteractive({ useHandCursor: true });
            s.on('pointerdown', () => {
                // Remove from sprites array
                const index = this.sprites.indexOf(s);
                if (index > -1) {
                    this.sprites.splice(index, 1);
                }
                // Stop any tweens targeting this sprite
                this.tweens.killTweensOf(s);
                // Destroy the sprite
                s.destroy();
            });

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
        EventBus.on('display-espionage-text', this.displayEspionageText, this);
        EventBus.on('display-overhead-flights', this.displayOverheadFlights, this);
        EventBus.on('clear-overhead-flights', this.clearOverheadFlights, this);
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
            EventBus.off('display-espionage-text', this.displayEspionageText, this);
            EventBus.off('display-overhead-flights', this.displayOverheadFlights, this);
            EventBus.off('clear-overhead-flights', this.clearOverheadFlights, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
        });
        this.events.on('destroy', () => {
            EventBus.off('add-sprite', onAddSprite);
            EventBus.off('config-loaded', this.applyConfig, this);
            EventBus.off('config-saved', this.applyConfig, this);
            EventBus.off('display-espionage-text', this.displayEspionageText, this);
            EventBus.off('display-overhead-flights', this.displayOverheadFlights, this);
            EventBus.off('clear-overhead-flights', this.clearOverheadFlights, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
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
    }

    changeScene() {
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
        // Config handling removed since title text is no longer displayed
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

    private displayEspionageText(message: string) {
        // Remove existing espionage text if any
        if (this.espionageText) {
            this.espionageText.destroy();
        }

        // Create new text object to display the commit message
        this.espionageText = this.add.text(512, 250, message, {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: 700 }
        }).setOrigin(0.5).setDepth(200);

        // Add a fade-in effect
        this.espionageText.setAlpha(0);
        this.tweens.add({
            targets: this.espionageText,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // Auto-hide after 10 seconds
        this.time.delayedCall(10000, () => {
            if (this.espionageText) {
                this.tweens.add({
                    targets: this.espionageText,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.espionageText) {
                            this.espionageText.destroy();
                            this.espionageText = undefined;
                        }
                    }
                });
            }
        });
    }

    private displayOverheadFlights(flightTexts: string[]) {
        // Clear any existing flight displays
        this.clearOverheadFlights();

        // Create airplane sprites for each overhead flight
        flightTexts.forEach((text, index) => {
            // Parse flight data from the text string
            const flightInfo = this.parseFlightInfo(text);
            
            // Create airplane sprite
            const startX = -50; // Start off-screen left
            const endX = this.scale.width + 50; // End off-screen right
            const y = 100 + (index * 60); // Different altitudes for multiple flights
            
            const airplane = this.add.sprite(startX, y, 'airplane');
            airplane.setScale(1.5);
            airplane.setDepth(200);
            airplane.setInteractive({ useHandCursor: true });
            
            // Store flight data with the sprite
            this.flightData.set(airplane, flightInfo);
            
            // Add click handler to show flight details
            airplane.on('pointerdown', () => {
                this.showFlightDetails(flightInfo);
            });

            // Add hover effect
            airplane.on('pointerover', () => {
                airplane.setTint(0xffff00); // Yellow tint on hover
                airplane.setScale(1.8);
            });
            
            airplane.on('pointerout', () => {
                airplane.clearTint();
                airplane.setScale(1.5);
            });

            // Animate airplane flying across screen
            this.tweens.add({
                targets: airplane,
                x: endX,
                duration: 8000 + (index * 1000), // Slightly staggered timing
                ease: 'Linear',
                onComplete: () => {
                    airplane.destroy();
                    this.flightData.delete(airplane);
                    const spriteIndex = this.airplaneSprites.indexOf(airplane);
                    if (spriteIndex > -1) {
                        this.airplaneSprites.splice(spriteIndex, 1);
                    }
                }
            });

            this.airplaneSprites.push(airplane);
        });
    }

    private clearOverheadFlights() {
        // Remove all existing flight text displays
        this.flightTexts.forEach(text => {
            if (text && text.active) {
                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        text.destroy();
                    }
                });
            }
        });
        this.flightTexts = [];

        // Remove all airplane sprites
        this.airplaneSprites.forEach(airplane => {
            if (airplane && airplane.active) {
                this.flightData.delete(airplane);
                this.tweens.killTweensOf(airplane);
                airplane.destroy();
            }
        });
        this.airplaneSprites = [];
    }

    private parseFlightInfo(flightText: string): any {
        // Parse the flight text: "Flight Overhead: [callsign] | [speed] | [altitude] | From: [country]"
        const parts = flightText.split('|');
        const callsignPart = parts[0]?.replace('Flight Overhead: ', '').trim();
        const speedPart = parts[1]?.trim();
        const altitudePart = parts[2]?.trim();
        const countryPart = parts[3]?.replace('From: ', '').trim();

        return {
            callsign: callsignPart || 'Unknown',
            speed: speedPart || 'N/A',
            altitude: altitudePart || 'N/A',
            country: countryPart || 'Unknown',
            fullText: flightText
        };
    }

    private showFlightDetails(flightInfo: any) {
        // Remove any existing flight detail display
        if (this.espionageText) {
            this.espionageText.destroy();
        }

        const detailText = `✈️ ${flightInfo.callsign}\n🚀 Speed: ${flightInfo.speed}\n📏 Altitude: ${flightInfo.altitude}\n🌍 From: ${flightInfo.country}`;

        // Create flight detail popup
        this.espionageText = this.add.text(512, 300, detailText, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 20, y: 15 }
        }).setOrigin(0.5).setDepth(300);

        // Add fade-in effect
        this.espionageText.setAlpha(0);
        this.tweens.add({
            targets: this.espionageText,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // Auto-hide after 5 seconds
        this.time.delayedCall(5000, () => {
            if (this.espionageText) {
                this.tweens.add({
                    targets: this.espionageText,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.espionageText) {
                            this.espionageText.destroy();
                            this.espionageText = undefined;
                        }
                    }
                });
            }
        });
    }
}
