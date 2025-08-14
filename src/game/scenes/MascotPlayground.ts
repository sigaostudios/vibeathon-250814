import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { MovieDialogSystem } from '../ui/MovieDialogSystem';

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
    private espionageContainer?: Phaser.GameObjects.Container;
    private flightTexts: Phaser.GameObjects.Text[] = [];
    private airplaneSprites: Phaser.GameObjects.Sprite[] = [];
    private flightData: Map<Phaser.GameObjects.Sprite, any> = new Map();
    private activeFlightCount = 0;
    private movieDialogSystem!: MovieDialogSystem;
    private brandonSpeechBubble?: Phaser.GameObjects.Container;
    private isSpyMode = false;
    private originalTexture = 'amish-brandon';
    private isFlightAttendantMode = false;
    private preFlightTexture = 'amish-brandon-money';
    private airlineFoodText?: Phaser.GameObjects.Text;

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

        // Amish Brandon Money - positioned on the left side for better speech bubble layout
        this.mascot = this.add.sprite(280, 420, 'amish-brandon');
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
                // Reset expression first, then handle dialog
                this.setBrandonNeutral();
                this.handleBrandonClick();
            }
        });

        // Allow Angular to add companion sprites
        const onAddSprite = () => {
            // Play the woop woop woop sound for Brandon's flip
            try {
                this.sound.play('woop-woop', { volume: this.sfxVolume });
                console.log('🎵 Playing woop woop woop sound for Brandon\'s flip!');
            } catch (error) {
                console.warn('Could not play woop-woop sound:', error);
            }
            
            // Make Brandon do a flip when sprite is added
            this.tweens.add({
                targets: this.mascot,
                rotation: this.mascot.rotation + Math.PI * 2, // Full 360-degree flip
                duration: 800,
                ease: 'Power2.easeInOut',
                onComplete: () => {
                    // Reset rotation to prevent accumulation
                    this.mascot.setRotation(0);
                }
            });
            
            // Show Brandon's speech bubble and hide it after 3 seconds
            this.showBrandonSpeech('Ah, refreshing!');
            this.time.delayedCall(3000, () => {
                this.hideBrandonSpeech();
            });
            
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
        EventBus.on('show-brandon-speech', this.showBrandonSpeech, this);
        EventBus.on('hide-brandon-speech', this.hideBrandonSpeech, this);
        EventBus.on('brandon-approve-movie', this.setBrandonApproval, this);
        EventBus.on('brandon-disapprove-movie', this.setBrandonDisapproval, this);
        EventBus.on('brandon-show-money', this.setBrandonMoney, this);
        EventBus.on('brandon-reset-expression', this.setBrandonNeutral, this);
        EventBus.on('enter-spy-mode', this.enterSpyMode, this);
        EventBus.on('exit-spy-mode', this.exitSpyMode, this);
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
            EventBus.off('show-brandon-speech', this.showBrandonSpeech, this);
            EventBus.off('hide-brandon-speech', this.hideBrandonSpeech, this);
            EventBus.off('brandon-approve-movie', this.setBrandonApproval, this);
            EventBus.off('brandon-disapprove-movie', this.setBrandonDisapproval, this);
            EventBus.off('brandon-show-money', this.setBrandonMoney, this);
            EventBus.off('brandon-reset-expression', this.setBrandonNeutral, this);
            EventBus.off('enter-spy-mode', this.enterSpyMode, this);
            EventBus.off('exit-spy-mode', this.exitSpyMode, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
            
            // Cleanup movie dialog system
            if (this.movieDialogSystem) {
                this.movieDialogSystem.destroy();
            }
        });
        this.events.on('destroy', () => {
            EventBus.off('add-sprite', onAddSprite);
            EventBus.off('config-loaded', this.applyConfig, this);
            EventBus.off('config-saved', this.applyConfig, this);
            EventBus.off('display-espionage-text', this.displayEspionageText, this);
            EventBus.off('display-overhead-flights', this.displayOverheadFlights, this);
            EventBus.off('clear-overhead-flights', this.clearOverheadFlights, this);
            EventBus.off('show-brandon-speech', this.showBrandonSpeech, this);
            EventBus.off('hide-brandon-speech', this.hideBrandonSpeech, this);
            EventBus.off('brandon-approve-movie', this.setBrandonApproval, this);
            EventBus.off('brandon-disapprove-movie', this.setBrandonDisapproval, this);
            EventBus.off('brandon-show-money', this.setBrandonMoney, this);
            EventBus.off('brandon-reset-expression', this.setBrandonNeutral, this);
            EventBus.off('enter-spy-mode', this.enterSpyMode, this);
            EventBus.off('exit-spy-mode', this.exitSpyMode, this);
            EventBus.off('music-volume-changed');
            EventBus.off('toggle-sound');
            
            // Cleanup movie dialog system
            if (this.movieDialogSystem) {
                this.movieDialogSystem.destroy();
            }
        });

        // Initialize movie dialog system
        this.movieDialogSystem = new MovieDialogSystem(this);
        
        // For debugging - expose to global scope
        (window as any).brandonDialogSystem = this.movieDialogSystem;

        // Add escape key listener to reset Brandon's expression
        this.input.keyboard?.on('keydown-ESC', () => {
            console.log('Escape pressed - resetting Brandon expression');
            this.setBrandonNeutral();
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
        if (this.espionageContainer) {
            // Destroy mask first to prevent white box
            const maskShape = (this.espionageContainer as any).maskShape;
            if (maskShape) {
                maskShape.destroy();
            }
            this.espionageContainer.destroy();
            this.espionageContainer = undefined;
            this.espionageText = undefined;
        }

        // Create main container for the entire document system
        const mainContainer = this.add.container(512, 384);

        // Document dimensions
        const docWidth = 800;
        const docHeight = 500;
        const contentAreaHeight = 350; // Visible content area height

        // Create document background (aged paper look)
        const paperBg = this.add.graphics();
        paperBg.fillStyle(0xF5E6D3, 0.95);
        paperBg.lineStyle(2, 0x8B4513, 0.8);
        paperBg.fillRoundedRect(-docWidth / 2, -docHeight / 2, docWidth, docHeight, 5);
        paperBg.strokeRoundedRect(-docWidth / 2, -docHeight / 2, docWidth, docHeight, 5);

        // Add some texture lines for aged paper effect
        paperBg.lineStyle(1, 0xD2B48C, 0.3);
        for (let i = 0; i < 20; i++) {
            const y = -docHeight / 2 + (i * docHeight / 20);
            paperBg.lineBetween(-docWidth / 2 + 30, y, docWidth / 2 - 30, y);
        }

        // Create "TOP SECRET" header stamp (fixed position)
        const headerText = this.add.text(0, -docHeight / 2 + 40, "TOP SECRET", {
            fontFamily: 'Courier New, monospace',
            fontSize: '24px',
            color: '#CC0000',
            align: 'center',
            stroke: '#CC0000',
            strokeThickness: 1
        }).setOrigin(0.5);

        // Add decorative borders around "TOP SECRET"
        const headerBorder = this.add.graphics();
        headerBorder.lineStyle(3, 0xCC0000, 1);
        headerBorder.strokeRect(-80, -docHeight / 2 + 20, 160, 40);
        headerBorder.strokeRect(-85, -docHeight / 2 + 15, 170, 50);

        // Create mask for scrollable area first (needs to be in world coordinates)
        const maskShape = this.add.graphics();
        maskShape.setPosition(512, 384); // Same position as main container
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(-docWidth / 2 + 20, -docHeight / 2 + 80, docWidth - 40, contentAreaHeight);
        const mask = maskShape.createGeometryMask();

        // Create scrollable content container
        const scrollableContainer = this.add.container(0, -docHeight / 2 + 100); // Start right after header

        // Create main document text with typewriter font
        const documentText = this.add.text(0, 10, message, {
            fontFamily: 'Courier New, monospace',
            fontSize: '13px',
            color: '#2F1B14',
            align: 'center',
            wordWrap: { width: docWidth - 120 },
            lineSpacing: 6
        }).setOrigin(0.5, 0);

        // Add "CLASSIFIED" watermark positioned relative to content
        const watermark = this.add.text(0, documentText.height / 2, "CLASSIFIED", {
            fontFamily: 'Courier New, monospace',
            fontSize: '42px',
            color: '#CC0000',
            stroke: '#CC0000',
            strokeThickness: 1
        }).setOrigin(0.5).setRotation(-0.3).setAlpha(0.1);

        // Add content to scrollable container
        scrollableContainer.add([documentText, watermark]);
        
        // Apply mask to the scrollable container
        scrollableContainer.setMask(mask);

        // Create footer with classification info (fixed position)
        const footerText = this.add.text(0, docHeight / 2 - 30, "CLASSIFICATION LEVEL: TOP SECRET\nAUTHORIZED PERSONNEL ONLY", {
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            color: '#CC0000',
            align: 'center',
            stroke: '#CC0000',
            strokeThickness: 0.5
        }).setOrigin(0.5);

        // Create scroll indicators
        const scrollUpArrow = this.add.text(docWidth / 2 - 30, -docHeight / 2 + 100, "▲", {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#8B4513'
        }).setOrigin(0.5).setAlpha(0.7);

        const scrollDownArrow = this.add.text(docWidth / 2 - 30, docHeight / 2 - 80, "▼", {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#8B4513'
        }).setOrigin(0.5).setAlpha(0.7);

        // Scroll functionality
        let scrollY = 0;
        const maxScroll = Math.max(0, documentText.height - contentAreaHeight + 40);
        const scrollSpeed = 30;
        const initialY = -docHeight / 2 + 100;

        // Mouse wheel scrolling
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            if (mainContainer && mainContainer.getBounds().contains(pointer.x, pointer.y)) {
                scrollY = Phaser.Math.Clamp(scrollY + deltaY * 0.5, 0, maxScroll);
                scrollableContainer.setY(initialY - scrollY);
                
                // Update arrow visibility
                scrollUpArrow.setAlpha(scrollY > 0 ? 1 : 0.3);
                scrollDownArrow.setAlpha(scrollY < maxScroll ? 1 : 0.3);
            }
        });

        // Arrow click scrolling
        scrollUpArrow.setInteractive({ useHandCursor: true });
        scrollUpArrow.on('pointerdown', () => {
            scrollY = Phaser.Math.Clamp(scrollY - scrollSpeed, 0, maxScroll);
            this.tweens.add({
                targets: scrollableContainer,
                y: initialY - scrollY,
                duration: 200,
                ease: 'Power2'
            });
            scrollUpArrow.setAlpha(scrollY > 0 ? 1 : 0.3);
            scrollDownArrow.setAlpha(scrollY < maxScroll ? 1 : 0.3);
        });

        scrollDownArrow.setInteractive({ useHandCursor: true });
        scrollDownArrow.on('pointerdown', () => {
            scrollY = Phaser.Math.Clamp(scrollY + scrollSpeed, 0, maxScroll);
            this.tweens.add({
                targets: scrollableContainer,
                y: initialY - scrollY,
                duration: 200,
                ease: 'Power2'
            });
            scrollUpArrow.setAlpha(scrollY > 0 ? 1 : 0.3);
            scrollDownArrow.setAlpha(scrollY < maxScroll ? 1 : 0.3);
        });

        // Set initial arrow states
        scrollUpArrow.setAlpha(0.3);
        scrollDownArrow.setAlpha(maxScroll > 0 ? 1 : 0.3);

        // Create close button
        const closeButton = this.add.text(docWidth / 2 - 20, -docHeight / 2 + 10, "✖", {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#CC0000',
            stroke: '#8B4513',
            strokeThickness: 1
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Close button functionality
        closeButton.on('pointerdown', () => {
            if (this.espionageContainer) {
                // Exit spy mode when closing espionage results
                this.exitSpyMode();
                
                this.tweens.add({
                    targets: this.espionageContainer,
                    alpha: 0,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    rotation: -0.1,
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.espionageContainer) {
                            // Destroy mask first to prevent white box
                            const maskShape = (this.espionageContainer as any).maskShape;
                            if (maskShape) {
                                maskShape.destroy();
                            }
                            this.espionageContainer.destroy();
                            this.espionageContainer = undefined;
                            this.espionageText = undefined;
                        }
                    }
                });
            }
        });

        // Close button hover effects
        closeButton.on('pointerover', () => {
            closeButton.setScale(1.2);
            closeButton.setColor('#FF0000');
        });
        
        closeButton.on('pointerout', () => {
            closeButton.setScale(1);
            closeButton.setColor('#CC0000');
        });

        // Add all elements to main container (mask shape should NOT be added to avoid double positioning)
        mainContainer.add([paperBg, headerBorder, headerText, scrollableContainer, footerText, scrollUpArrow, scrollDownArrow, closeButton]);
        mainContainer.setDepth(200);

        // Store references for cleanup
        this.espionageContainer = mainContainer;
        this.espionageText = documentText;
        
        // Store mask reference for proper cleanup
        (mainContainer as any).maskShape = maskShape;

        // Add a dramatic fade-in with slight rotation
        mainContainer.setAlpha(0);
        mainContainer.setRotation(0.1);
        mainContainer.setScale(0.8);
        
        this.tweens.add({
            targets: mainContainer,
            alpha: 1,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Back.easeOut'
        });
    }

    private displayOverheadFlights(flightTexts: string[]) {
        // Clear any existing flight displays
        this.clearOverheadFlights();
        
        // Set active flight count
        this.activeFlightCount = flightTexts.length;

        // Create airplane sprites for each overhead flight
        flightTexts.forEach((text, index) => {
            // Parse flight data from the text string
            const flightInfo = this.parseFlightInfo(text);
            
            // Calculate realistic positioning based on altitude
            const altitude = this.parseAltitude(flightInfo.altitude);
            const speed = this.parseSpeed(flightInfo.speed);
            
            // Create airplane sprite
            const startX = -50; // Start off-screen left
            const endX = this.scale.width + 50; // End off-screen right
            
            // Y position based on altitude (higher altitude = higher on screen)
            // Map altitude from 0-40,000ft to screen positions 50-250px
            const minY = 50;
            const maxY = 250;
            const minAlt = 0;
            const maxAlt = 40000;
            const y = maxY - ((altitude - minAlt) / (maxAlt - minAlt)) * (maxY - minY);
            const clampedY = Math.max(minY, Math.min(maxY, y || (100 + index * 50)));
            
            // Scale based on altitude (higher planes appear smaller/more distant)
            const baseScale = 1.5;
            const altitudeScale = Math.max(0.8, Math.min(2.0, baseScale - (altitude / 50000)));
            
            const airplane = this.add.sprite(startX, clampedY, 'airplane');
            airplane.setScale(altitudeScale);
            airplane.setDepth(200 - altitude / 1000); // Higher planes render behind lower ones
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
                airplane.setScale(altitudeScale * 1.2);
            });
            
            airplane.on('pointerout', () => {
                airplane.clearTint();
                airplane.setScale(altitudeScale);
            });

            // Calculate realistic flight duration based on speed
            // Assume screen width represents ~20 miles, calculate time for 30-second base duration
            const screenWidthMiles = 20;
            const baseDurationMs = 30000; // 30 seconds
            const speedMph = speed || 300; // Default to 300 mph if no speed
            
            // Duration inversely proportional to speed
            // Faster planes take less time to cross screen
            const duration = Math.max(10000, Math.min(60000, baseDurationMs * (300 / speedMph)));
            
            // Add slight random delay to prevent synchronized movement
            const delay = index * 500 + Math.random() * 2000;
            
            // Animate airplane flying across screen
            this.time.delayedCall(delay, () => {
                this.tweens.add({
                    targets: airplane,
                    x: endX,
                    duration: duration,
                    ease: 'Linear',
                    onComplete: () => {
                        airplane.destroy();
                        this.flightData.delete(airplane);
                        const spriteIndex = this.airplaneSprites.indexOf(airplane);
                        if (spriteIndex > -1) {
                            this.airplaneSprites.splice(spriteIndex, 1);
                        }
                        
                        // Decrement active flight count
                        this.activeFlightCount--;
                        
                        // If all flights are done, clear the UI
                        if (this.activeFlightCount <= 0) {
                            this.time.delayedCall(2000, () => { // 2 second delay
                                EventBus.emit('clear-flight-tracking-ui');
                            });
                        }
                    }
                });
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
        this.activeFlightCount = 0;
    }

    private parseFlightInfo(flightText: string): any {
        // Parse the flight text: "Flight: [callsign] | Speed: [speed] | Height: [altitude] | From: [country]"
        const parts = flightText.split('|');
        const callsignPart = parts[0]?.replace('Flight: ', '').trim();
        const speedPart = parts[1]?.replace('Speed: ', '').trim();
        const altitudePart = parts[2]?.replace('Height: ', '').trim();
        const countryPart = parts[3]?.replace('From: ', '').trim();

        return {
            callsign: callsignPart || 'Unknown',
            speed: speedPart || 'N/A',
            altitude: altitudePart || 'N/A',
            country: countryPart || 'Unknown',
            fullText: flightText
        };
    }

    private parseSpeed(speedText: string): number {
        // Extract numeric value from speed text like "450 mph" or "N/A"
        if (!speedText || speedText === 'N/A') return 300; // Default speed
        const match = speedText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 300;
    }

    private parseAltitude(altitudeText: string): number {
        // Extract numeric value from altitude text like "6.2 miles" or "35000 ft"
        if (!altitudeText || altitudeText === 'N/A') return 35000; // Default altitude
        
        const match = altitudeText.match(/([\d.]+)/);
        if (!match) return 35000;
        
        const value = parseFloat(match[1]);
        
        // Convert miles to feet if needed
        if (altitudeText.includes('mile')) {
            return value * 5280; // Convert miles to feet
        } else if (altitudeText.includes('ft')) {
            return value;
        }
        
        // Default assumption is feet
        return value;
    }

    private showFlightDetails(flightInfo: any) {
        // Remove any existing flight detail display
        if (this.espionageText) {
            this.espionageText.destroy();
        }

        // Switch Brandon to flight attendant mode
        this.enterFlightAttendantMode();

        const detailText = `✈️ ${flightInfo.callsign}\n🚀 Speed: ${flightInfo.speed}\n📏 Altitude: ${flightInfo.altitude}\n🌍 From: ${flightInfo.country}\n\n[Click anywhere to close]`;

        // Create flight detail popup
        this.espionageText = this.add.text(512, 300, detailText, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: { x: 25, y: 20 }
        }).setOrigin(0.5).setDepth(300);

        // Make the popup interactive and clickable to close
        this.espionageText.setInteractive({ useHandCursor: true });
        this.espionageText.on('pointerdown', () => {
            if (this.espionageText) {
                // Exit flight attendant mode when closing flight details
                this.exitFlightAttendantMode();
                
                this.tweens.add({
                    targets: this.espionageText,
                    alpha: 0,
                    duration: 300,
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

        // Add fade-in effect
        this.espionageText.setAlpha(0);
        this.tweens.add({
            targets: this.espionageText,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        // No auto-hide - stays until user clicks
    }

    private handleBrandonClick() {
        console.log('Brandon clicked - starting movie dialog');
        
        // Only start dialog if not already active
        if (!this.movieDialogSystem.active) {
            this.movieDialogSystem.startDialog(this.mascot);
        }
    }

    private showBrandonSpeech(message: string) {
        // Hide any existing speech bubble
        this.hideBrandonSpeech();

        // Create speech bubble container
        this.brandonSpeechBubble = this.add.container(this.mascot.x, this.mascot.y - 120);

        // Create speech bubble background (rounded rectangle)
        const bubbleWidth = 200;
        const bubbleHeight = 60;
        const bubble = this.add.graphics();
        bubble.fillStyle(0xffffff, 0.95);
        bubble.lineStyle(2, 0x000000);
        bubble.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 10);
        bubble.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 10);

        // Create speech bubble tail (triangle pointing down to Brandon)
        const tail = this.add.graphics();
        tail.fillStyle(0xffffff, 0.95);
        tail.lineStyle(2, 0x000000);
        tail.fillTriangle(0, bubbleHeight / 2 - 2, -10, bubbleHeight / 2 + 15, 10, bubbleHeight / 2 + 15);
        tail.strokeTriangle(0, bubbleHeight / 2 - 2, -10, bubbleHeight / 2 + 15, 10, bubbleHeight / 2 + 15);

        // Create text
        const text = this.add.text(0, 0, message, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#000000',
            align: 'center',
            wordWrap: { width: bubbleWidth - 20 }
        }).setOrigin(0.5);

        // Add components to container
        this.brandonSpeechBubble.add([bubble, tail, text]);
        this.brandonSpeechBubble.setDepth(300);

        // Add bounce-in animation
        this.brandonSpeechBubble.setScale(0);
        this.tweens.add({
            targets: this.brandonSpeechBubble,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private hideBrandonSpeech() {
        if (this.brandonSpeechBubble) {
            // Animate out
            this.tweens.add({
                targets: this.brandonSpeechBubble,
                scaleX: 0,
                scaleY: 0,
                duration: 200,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (this.brandonSpeechBubble) {
                        this.brandonSpeechBubble.destroy();
                        this.brandonSpeechBubble = undefined;
                    }
                }
            });
        }
    }

    private setBrandonApproval() {
        // Switch to approval texture
        this.mascot.setTexture('amish-brandon-approval');
        console.log('Brandon approves! Switching to approval texture');
    }

    private setBrandonDisapproval() {
        // Switch to disapproval texture
        this.mascot.setTexture('amish-brandon-disapproval');
        console.log('Brandon disapproves! Switching to disapproval texture');
    }

    private setBrandonMoney() {
        // Switch to money texture (for money/high grosses)
        this.mascot.setTexture('amish-brandon-money');
        console.log('Brandon sees money! Switching to money texture');
        
        // Add special money effect
        this.sparkle.explode(25, this.mascot.x, this.mascot.y);
    }

    private setBrandonNeutral() {
        // Switch back to neutral/money texture
        this.mascot.setTexture('amish-brandon-money');
        console.log('Brandon back to neutral expression');
    }

    private enterSpyMode() {
        if (!this.isSpyMode && this.mascot) {
            // Store the current texture
            this.originalTexture = this.mascot.texture.key;
            
            // Randomly choose between the two spy textures
            const spyTextures = ['amish-brandon-spy', 'amish-brandon-spy-2'];
            const randomSpyTexture = Phaser.Math.RND.pick(spyTextures);
            
            // Switch to randomly selected spy texture
            this.mascot.setTexture(randomSpyTexture);
            this.isSpyMode = true;
            
            console.log(`Entered spy mode with texture: ${randomSpyTexture}`);
        }
    }

    private exitSpyMode() {
        if (this.isSpyMode && this.mascot) {
            // Switch back to original texture
            this.mascot.setTexture(this.originalTexture);
            this.isSpyMode = false;
        }
    }

    private enterFlightAttendantMode() {
        if (!this.isFlightAttendantMode && this.mascot) {
            // Store the current texture before switching
            this.preFlightTexture = this.mascot.texture.key;
            // Switch to flight attendant texture
            this.mascot.setTexture('amish-brandon-flight-attendant');
            this.isFlightAttendantMode = true;
            console.log('Brandon is now a flight attendant!');
            
            // Show the airline food joke
            this.showAirlineFoodJoke();
        }
    }

    private exitFlightAttendantMode() {
        if (this.isFlightAttendantMode && this.mascot) {
            // Hide the airline food joke
            this.hideAirlineFoodJoke();
            
            // Switch back to the texture Brandon had before becoming flight attendant
            this.mascot.setTexture(this.preFlightTexture);
            this.isFlightAttendantMode = false;
            console.log(`Brandon switched back to ${this.preFlightTexture}`);
        }
    }

    private showAirlineFoodJoke() {
        // Remove any existing airline food text
        if (this.airlineFoodText) {
            this.airlineFoodText.destroy();
        }

        // Create the joke text positioned above Brandon
        this.airlineFoodText = this.add.text(this.mascot.x, this.mascot.y - 200, "What's the deal with airline food?", {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            backgroundColor: 'rgba(0, 100, 200, 0.8)',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setDepth(350); // Higher depth than flight info popup (300)

        // Add bounce-in animation
        this.airlineFoodText.setScale(0);
        this.tweens.add({
            targets: this.airlineFoodText,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // Start the continuous position update
        this.updateAirlineFoodPosition();
    }

    private updateAirlineFoodPosition() {
        if (this.airlineFoodText && this.mascot && this.isFlightAttendantMode) {
            // Update position to stay above Brandon
            this.airlineFoodText.setPosition(this.mascot.x, this.mascot.y - 200);
            
            // Continue updating on next frame
            this.time.delayedCall(16, () => { // ~60fps updates
                this.updateAirlineFoodPosition();
            });
        }
    }

    private hideAirlineFoodJoke() {
        if (this.airlineFoodText) {
            // Stop any active tweens
            this.tweens.killTweensOf(this.airlineFoodText);
            
            // Animate out
            this.tweens.add({
                targets: this.airlineFoodText,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 300,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (this.airlineFoodText) {
                        this.airlineFoodText.destroy();
                        this.airlineFoodText = undefined;
                    }
                }
            });
        }
    }
}
