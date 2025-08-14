import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class WeatherPlayground extends Scene {
  private mascot!: Phaser.GameObjects.Sprite;
  private background!: Phaser.GameObjects.Image;
  private weatherParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private backgroundTint!: Phaser.GameObjects.Rectangle;
  private currentWeather: string = 'sunny';
  private titleText!: Phaser.GameObjects.Text;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private isTransitioning: boolean = false;
  private lightningTimer?: Phaser.Time.TimerEvent;
  private weatherInfoPanel!: Phaser.GameObjects.Rectangle;
  private locationHeaderText!: Phaser.GameObjects.Text;
  private temperatureText!: Phaser.GameObjects.Text;
  private conditionText!: Phaser.GameObjects.Text;
  private humidityText!: Phaser.GameObjects.Text;
  private windText!: Phaser.GameObjects.Text;

  constructor() {
    super('WeatherPlayground');
  }

  create() {
    this.setupBackground();
    this.setupMascot();
    this.setupUI();
    this.setupWeatherInfoPanel();
    this.setupParticles();
    this.createWeatherGraphics();
    this.setupWeatherListeners();
    this.requestWeatherData();
    
    EventBus.emit('current-scene-ready', this);
  }

  private setupBackground() {
    this.background = this.add.image(512, 384, 'office');
    this.backgroundTint = this.add.rectangle(512, 384, 1024, 768, 0xffeb3b, 0.1);
  }

  private setupMascot() {
    this.mascot = this.add.sprite(512, 420, 'orb');
    if (!this.anims.exists('orb-glow')) {
      this.anims.create({ 
        key: 'orb-glow', 
        frames: this.anims.generateFrameNumbers('orb', { start: 0, end: 8 }), 
        frameRate: 4, 
        repeat: -1, 
        yoyo: true 
      });
    }
    this.mascot.play('orb-glow');
    this.mascot.setScale(1);
  }

  private setupUI() {
    this.titleText = this.add.text(512, 50, 'Weather Room', {
      fontFamily: 'Arial Black', 
      fontSize: 38, 
      color: '#ffffff',
      stroke: '#000000', 
      strokeThickness: 8, 
      align: 'center'
    }).setOrigin(0.5).setDepth(100);
  }

  private setupWeatherInfoPanel() {
    // Create larger weather info panel against the left side of screen
    this.weatherInfoPanel = this.add.rectangle(150, 350, 280, 320, 0xffffff, 1.0);
    this.weatherInfoPanel.setStrokeStyle(3, 0x000000, 0.7);
    this.weatherInfoPanel.setDepth(50);

    // Location header
    this.locationHeaderText = this.add.text(150, 220, 'Local Weather Conditions', {
      fontFamily: 'Arial Black',
      fontSize: 18,
      color: '#2c3e50',
      align: 'center',
      wordWrap: { width: 260, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(60);

    // Weather condition
    this.conditionText = this.add.text(150, 270, 'Conditions: --', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#34495e',
      align: 'center'
    }).setOrigin(0.5).setDepth(60);

    // Temperature
    this.temperatureText = this.add.text(150, 320, 'Temperature: --°F', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#e74c3c',
      align: 'center'
    }).setOrigin(0.5).setDepth(60);

    // Humidity
    this.humidityText = this.add.text(150, 380, 'Humidity: --%', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#3498db',
      align: 'center'
    }).setOrigin(0.5).setDepth(60);

    // Wind speed
    this.windText = this.add.text(150, 420, 'Wind: -- mph', {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#7f8c8d',
      align: 'center'
    }).setOrigin(0.5).setDepth(60);
  }

  private setupParticles() {
    // Base sparkle particles (similar to MascotPlayground)
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
  }

  private setupWeatherListeners() {
    EventBus.on('weather-data-received', this.handleWeatherUpdate, this);
    EventBus.on('weather-error', this.handleWeatherError, this);

    // Cleanup listeners on scene shutdown
    this.events.on('shutdown', () => {
      EventBus.off('weather-data-received', this.handleWeatherUpdate, this);
      EventBus.off('weather-error', this.handleWeatherError, this);
    });
    this.events.on('destroy', () => {
      EventBus.off('weather-data-received', this.handleWeatherUpdate, this);
      EventBus.off('weather-error', this.handleWeatherError, this);
    });
  }

  private requestWeatherData() {
    // Don't automatically request weather data - wait for user to set location
    // EventBus.emit('request-weather-update');
  }

  private showLoadingState() {
    // Keep title as "Local Weather" - don't change it
  }

  private showLocationPrompt() {
    // Keep title as "Local Weather" - don't change it
    
    // Retry after 5 seconds
    setTimeout(() => {
      this.requestWeatherData();
    }, 5000);
  }

  private showSetLocationPrompt() {
    // Keep title as "Local Weather" - don't change it
  }

  private handleWeatherUpdate(weatherData: any) {
    console.log('Weather update received:', weatherData);
    // Keep title as "Local Weather" - don't change it
    
    // Update weather info panel
    this.updateWeatherInfoPanel(weatherData);
    
    this.transitionToWeather(weatherData.condition);
  }

  private updateWeatherInfoPanel(weatherData: any) {
    // Update location header
    this.locationHeaderText.setText(weatherData.location || 'Unknown Location');
    
    // Update weather condition with emoji
    const conditionEmojis = {
      sunny: '☀️ Sunny',
      rainy: '🌧️ Rainy', 
      stormy: '⛈️ Stormy',
      snowy: '❄️ Snowy',
      cloudy: '☁️ Cloudy',
      foggy: '🌫️ Foggy'
    };
    const conditionText = conditionEmojis[weatherData.condition as keyof typeof conditionEmojis] || '🌤️ Unknown';
    this.conditionText.setText(conditionText);
    
    // Update temperature (convert from Celsius to Fahrenheit)
    const fahrenheit = Math.round((weatherData.temperature * 9/5) + 32);
    this.temperatureText.setText(`${fahrenheit}°F`);
    
    // Update humidity
    this.humidityText.setText(`Humidity: ${weatherData.humidity}%`);
    
    // Update wind speed (convert from km/h to mph)
    const windMph = Math.round(weatherData.windSpeed * 0.621371);
    this.windText.setText(`Wind: ${windMph} mph`);
  }

  private handleWeatherError(error: any) {
    console.warn('Weather error:', error);
    if (error?.message?.includes('No location set')) {
      this.showSetLocationPrompt();
    } else if (error?.message?.includes('permission')) {
      this.showLocationPrompt();
    }
    // Keep title as "Local Weather" - don't change it for errors either
    this.transitionToWeather('sunny');
  }

  private transitionToWeather(condition: string) {
    if (this.currentWeather === condition || this.isTransitioning) return;
    
    console.log(`Transitioning from ${this.currentWeather} to ${condition}`);
    this.isTransitioning = true;
    
    // Stop any existing lightning effects before changing weather
    this.stopLightningEffects();
    
    this.currentWeather = condition;
    
    this.updateBackgroundTint(condition);
    this.updateParticleEffects(condition);
    this.updateMascotBehavior(condition);
    // Don't update title - keep it as "Local Weather"
    
    // Reset transition flag after animation completes
    this.time.delayedCall(2500, () => {
      this.isTransitioning = false;
    });
  }

  private updateBackgroundTint(condition: string) {
    const tints = {
      sunny: { color: 0xffeb3b, alpha: 0.1 },    // Warm yellow
      rainy: { color: 0x607d8b, alpha: 0.4 },    // Dark grey for rain
      stormy: { color: 0x1a1a1a, alpha: 0.8 },   // Very dark gray - much darker for storms
      snowy: { color: 0xe3f2fd, alpha: 0.3 },    // Light blue
      cloudy: { color: 0x607d8b, alpha: 0.15 },  // Gray
      foggy: { color: 0x90a4ae, alpha: 0.25 }    // Misty gray
    };
    
    const tint = tints[condition as keyof typeof tints] || tints.sunny;
    
    this.tweens.add({
      targets: this.backgroundTint,
      alpha: tint.alpha,
      duration: 2000,
      ease: 'Power2.easeInOut',
      onStart: () => {
        this.backgroundTint.setFillStyle(tint.color);
      }
    });
  }

  private updateMascotBehavior(condition: string) {
    // Stop existing tweens
    this.tweens.killTweensOf(this.mascot);
    
    const behaviors = {
      sunny: { scale: 1.2, movement: 'happy', frame: 0, animate: true },      // Happy - smile frame
      rainy: { scale: 0.85, movement: 'sad', frame: 4, animate: false },      // Sad - try middle frame (might be neutral)
      stormy: { scale: 0.8, movement: 'sad', frame: 2, animate: false },      // Very sad - try frame 2 (might be frown)
      snowy: { scale: 1.0, movement: 'peaceful', frame: 1, animate: true },   // Peaceful - slight smile
      cloudy: { scale: 1.0, movement: 'contemplative', frame: 3, animate: true }, // Neutral
      foggy: { scale: 0.95, movement: 'mysterious', frame: 5, animate: false } // Mysterious
    };
    
    const behavior = behaviors[condition as keyof typeof behaviors] || behaviors.sunny;
    
    console.log(`Mascot behavior for ${condition}:`, behavior);
    
    // Control facial expression by stopping animation and setting specific frame
    if (behavior.animate) {
      // Resume glow animation for positive moods
      console.log(`Starting animation for ${condition}`);
      this.mascot.play('orb-glow');
    } else {
      // Stop animation and show specific frame for negative moods
      console.log(`Stopping animation for ${condition}, setting frame ${behavior.frame}`);
      this.mascot.stop();
      this.mascot.setFrame(behavior.frame);
    }
    
    // Apply scale changes
    this.tweens.add({
      targets: this.mascot,
      scale: behavior.scale,
      duration: 2000,
      ease: 'Power2.easeInOut'
    });
    
    // Keep mascot at normal color (remove any tint)
    this.mascot.clearTint();
    
    // Apply movement pattern
    this.applyMovementPattern(behavior.movement);
  }

  private applyMovementPattern(pattern: string) {
    const baseY = 420;
    
    switch (pattern) {
      case 'happy':
        // Bouncy, excited movement for sunny weather
        this.tweens.add({
          targets: this.mascot,
          y: { value: baseY - 30, duration: 600 },
          scale: { value: this.mascot.scale + 0.1, duration: 600 },
          yoyo: true,
          repeat: -1,
          ease: 'Bounce.easeOut'
        });
        // Frequent sparkles for happiness
        this.scheduleSparkles(1500, 3000);
        break;
        
      case 'sad':
        // Droopy, slow movement for rainy weather
        this.tweens.add({
          targets: this.mascot,
          y: { value: baseY + 10, duration: 3000 }, // Lower position
          scale: { value: this.mascot.scale - 0.05, duration: 2000 }, // Slightly smaller
          alpha: { value: 0.8, duration: 2500 }, // Slightly transparent
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        // No sparkles for sadness
        break;
        
      case 'energetic':
        this.tweens.add({
          targets: this.mascot,
          y: { value: baseY - 20, duration: 800 },
          scale: { value: this.mascot.scale + 0.05, duration: 800 },
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        // Trigger sparkles more frequently
        this.scheduleSparkles(2000, 4000);
        break;
        
      case 'gentle':
        this.tweens.add({
          targets: this.mascot,
          x: { value: '+=10', duration: 3000 },
          y: { value: baseY - 5, duration: 2000 },
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.scheduleSparkles(4000, 7000);
        break;
        
      case 'nervous':
        this.tweens.add({
          targets: this.mascot,
          x: { value: '+=15', duration: 500 },
          y: { value: baseY - 8, duration: 400 },
          yoyo: true,
          repeat: -1,
          ease: 'Back.easeInOut'
        });
        // No sparkles for stormy/nervous weather
        break;
        
      case 'peaceful':
        this.tweens.add({
          targets: this.mascot,
          y: { value: baseY - 12, duration: 4000 },
          alpha: { value: 0.9, duration: 2000 },
          yoyo: true,
          repeat: -1,
          ease: 'Power1.easeInOut'
        });
        this.scheduleSparkles(5000, 8000);
        break;
        
      case 'contemplative':
        this.tweens.add({
          targets: this.mascot,
          scale: { value: this.mascot.scale - 0.05, duration: 3000 },
          y: { value: baseY, duration: 2000 },
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.scheduleSparkles(6000, 10000);
        break;
        
      default: // contemplative
        this.scheduleSparkles(3500, 7000);
        break;
    }
  }

  private scheduleSparkles(minDelay: number, maxDelay: number) {
    const delay = Phaser.Math.Between(minDelay, maxDelay);
    this.time.delayedCall(delay, () => {
      if (this.sparkle && this.mascot) {
        this.sparkle.explode(12, this.mascot.x, this.mascot.y);
        this.scheduleSparkles(minDelay, maxDelay);
      }
    });
  }

  private updateTitle(condition: string) {
    const weatherEmojis = {
      sunny: '☀️',
      rainy: '🌧️', 
      stormy: '⛈️',
      snowy: '❄️',
      cloudy: '☁️',
      foggy: '🌫️'
    };
    
    const emoji = weatherEmojis[condition as keyof typeof weatherEmojis] || '🌤️';
    const currentTitle = this.titleText.text;
    
    // Only update emoji if the title structure hasn't changed
    if (currentTitle.includes('Weather Playground') || currentTitle.includes('Detecting') || currentTitle.includes('Enable')) {
      return; // Don't override loading/error messages
    }
    
    // Update existing location-based title with new emoji
    if (currentTitle.includes('(') || /\d/.test(currentTitle)) {
      this.titleText.setText(currentTitle.replace(/^[🌍🌤️☀️🌧️⛈️❄️☁️🌫️📍]\s*/, `${emoji} `));
    }
  }

  changeScene() {
    this.scene.start('MainMenu');
  }

  private createWeatherGraphics() {
    // Create a raindrop texture programmatically - teardrop/oval shape like real rain
    const raindropGraphics = this.add.graphics();
    raindropGraphics.fillStyle(0xffffff, 1); // White fill that can be tinted
    
    // Draw an elongated oval/teardrop shape
    raindropGraphics.fillEllipse(1, 6, 2, 10); // Elongated oval (x, y, width, height)
    raindropGraphics.fillCircle(1, 2, 1); // Small rounded top
    
    raindropGraphics.generateTexture('raindrop', 3, 12);
    raindropGraphics.destroy();
    
    console.log('Raindrop texture created');

    // Create long diagonal lightning bolt texture from upper left to bottom right
    const lightningGraphics = this.add.graphics();
    lightningGraphics.fillStyle(0xffffff, 1); // White filled shape instead of lines
    
    // Create a long diagonal zigzag lightning bolt crossing most of the screen
    lightningGraphics.fillTriangle(0, 0, 15, 8, 8, 25);         // Top left start
    lightningGraphics.fillTriangle(8, 25, 35, 35, 20, 55);      // Jag right
    lightningGraphics.fillTriangle(20, 55, 10, 65, 30, 85);     // Jag left  
    lightningGraphics.fillTriangle(30, 85, 60, 95, 45, 120);    // Jag right
    lightningGraphics.fillTriangle(45, 120, 35, 130, 55, 150);  // Jag left
    lightningGraphics.fillTriangle(55, 150, 85, 160, 70, 185);  // Jag right
    lightningGraphics.fillTriangle(70, 185, 60, 195, 80, 215);  // Jag left
    lightningGraphics.fillTriangle(80, 215, 110, 225, 95, 250); // Final diagonal strike
    
    lightningGraphics.generateTexture('lightning', 120, 250);
    lightningGraphics.destroy();
    
    console.log('Lightning texture created - checking if texture exists:', this.textures.exists('lightning'));

    // Create a snowflake texture - filled circles for better visibility
    const snowGraphics = this.add.graphics();
    snowGraphics.fillStyle(0xffffff, 1); // White filled circle
    snowGraphics.fillCircle(4, 4, 3); // Simple white circle for snowflake
    snowGraphics.generateTexture('snowflake', 8, 8);
    snowGraphics.destroy();
  }

  private updateParticleEffects(condition: string) {
    // Clear existing weather particles
    if (this.weatherParticles) {
      this.weatherParticles.destroy();
    }
    
    console.log('updateParticleEffects called with condition:', condition);
    
    switch (condition) {
      case 'rainy':
        this.createRainParticles();
        break;
      case 'snowy':
        console.log('Switching to snow particles');
        this.createSnowParticles();
        break;
      case 'stormy':
        this.createStormParticles();
        break;
      case 'sunny':
        // No particles for sunny - just bright background
        break;
      default:
        console.log('Unknown weather condition:', condition);
        break;
    }
  }

  private createRainParticles() {
    // Create rain droplets falling from the sky using custom rain drop texture
    this.weatherParticles = this.add.particles(0, -20, 'raindrop', {
      x: { min: 0, max: 1024 },
      y: -50,
      speedY: { min: 400, max: 600 }, // Faster, more consistent speed
      speedX: { min: -5, max: 5 }, // Very little horizontal drift for straight paths
      scale: { min: 2.0, max: 4.0 }, // Scale up the thin line raindrops
      alpha: { start: 0.8, end: 0.3 }, 
      rotation: 0, // Keep raindrops perfectly vertical
      lifespan: 2000,
      frequency: 25, // Heavy rain
      quantity: 6, // More drops per emission
      gravityY: 250 // Strong gravity for straight downward motion
    } as any) as Phaser.GameObjects.Particles.ParticleEmitter;
  }

  private createSnowParticles() {
    console.log('Creating snow particles...');
    // Create gentle snowfall using custom snowflake texture
    this.weatherParticles = this.add.particles(0, -20, 'snowflake', {
      x: { min: 0, max: 1024 },
      y: -50,
      speedY: { min: 80, max: 160 },
      speedX: { min: -30, max: 30 },
      scale: { min: 1.0, max: 2.5 }, // Larger and more visible
      alpha: { start: 1.0, end: 0.4 }, // Higher opacity
      rotation: { min: 0, max: 6.28 }, // Full rotation for realistic snowfall
      lifespan: 3500,
      frequency: 50, // More frequent snow
      quantity: 2, // More flakes per emission
      gravityY: 30 // Slightly more gravity
    } as any) as Phaser.GameObjects.Particles.ParticleEmitter;
    
    console.log('Snow particles created:', this.weatherParticles);
  }

  private createStormParticles() {
    console.log('Creating storm particles with raindrop texture...');
    
    // Create intense storm effects with heavy rain - mostly straight with some wind
    this.weatherParticles = this.add.particles(0, -20, 'raindrop', {
      x: { min: 0, max: 1024 },
      y: -50,
      speedY: { min: 400, max: 700 }, // Fast falling but visible
      speedX: { min: -10, max: 10 }, // Very little horizontal drift
      scale: { min: 1.5, max: 2.5 }, // Smaller scale for realistic raindrop size
      alpha: { start: 0.9, end: 0.4 }, // High visibility
      tint: 0xe0e0e0, // Very light grey for max contrast
      rotation: 0, // Keep vertical
      lifespan: 2000, // Longer lifespan
      frequency: 30, // Emit every 30ms
      quantity: 8, // Drops per emission
      gravityY: 200, // Moderate gravity
      blendMode: 'NORMAL' // Normal blend mode
    } as any) as Phaser.GameObjects.Particles.ParticleEmitter;
    
    console.log('Storm particles created:', !!this.weatherParticles);
    console.log('Particle emitter active:', this.weatherParticles?.active);
    
    // Add occasional lightning flashes
    this.createLightningEffects();
  }

  private createLightningEffects() {
    console.log('Starting lightning effects for stormy weather');
    
    // Create realistic lightning strikes
    const createLightningStrike = () => {
      // Only create lightning if we're still in stormy weather
      if (this.currentWeather !== 'stormy') {
        console.log('Weather changed, stopping lightning');
        return;
      }
      
      console.log('Lightning strike triggered!'); // Debug log
      
      // Position lightning to start from top-left corner
      const startX = 50;   // Top-left corner
      const startY = 100;  // Below title
      const endX = 400;    // Bottom-right area 
      const endY = 500;    // Much lower on screen
      
      // Phase 1: Draw diagonal lightning bolt directly using graphics
      const lightningBolt = this.add.graphics();
      lightningBolt.lineStyle(4, 0xccccff, 0.8); // Blue-white line, slightly transparent initially
      lightningBolt.setDepth(1000);
      
      // Draw a jagged diagonal lightning bolt from start to end point
      lightningBolt.moveTo(startX, startY);
      lightningBolt.lineTo(startX + 40, startY + 60);   // Jag right-down
      lightningBolt.lineTo(startX + 20, startY + 120);  // Jag left-down  
      lightningBolt.lineTo(startX + 80, startY + 180);  // Jag right-down
      lightningBolt.lineTo(startX + 60, startY + 240);  // Jag left-down
      lightningBolt.lineTo(startX + 120, startY + 300); // Jag right-down
      lightningBolt.lineTo(startX + 100, startY + 360); // Jag left-down
      lightningBolt.lineTo(endX, endY);                 // Final strike to end point
      
      lightningBolt.strokePath();
      
      console.log('Lightning bolt created from:', startX, startY, 'to:', endX, endY);
      
      // Phase 2: Longer pause, then intense flash
      this.time.delayedCall(200, () => {
        // Check again if still stormy before flashing
        if (this.currentWeather !== 'stormy') return;
        
        // Bright flash of the lightning bolt - redraw with brighter color
        lightningBolt.clear();
        lightningBolt.lineStyle(6, 0xffffff, 1.0); // Thicker pure white line
        
        // Redraw the same path but brighter
        lightningBolt.moveTo(startX, startY);
        lightningBolt.lineTo(startX + 40, startY + 60);
        lightningBolt.lineTo(startX + 20, startY + 120);
        lightningBolt.lineTo(startX + 80, startY + 180);
        lightningBolt.lineTo(startX + 60, startY + 240);
        lightningBolt.lineTo(startX + 120, startY + 300);
        lightningBolt.lineTo(startX + 100, startY + 360);
        lightningBolt.lineTo(endX, endY);
        lightningBolt.strokePath();
        
        // Screen flash - more realistic timing
        const screenFlash = this.add.rectangle(512, 384, 1024, 768, 0xffffff, 0.4);
        screenFlash.setDepth(998);
        
        // Quick fade of all lightning effects
        this.tweens.add({
          targets: [lightningBolt, screenFlash],
          alpha: 0,
          duration: 300,
          ease: 'Power3.easeOut',
          onComplete: () => {
            lightningBolt.destroy();
            screenFlash.destroy();
          }
        });
      });
      
      // Schedule next lightning flash only if still stormy
      if (this.currentWeather === 'stormy') {
        const nextFlash = Phaser.Math.Between(4000, 8000); // 4-8 seconds between flashes
        this.lightningTimer = this.time.delayedCall(nextFlash, createLightningStrike);
      }
    };
    
    // Start the lightning sequence
    const firstFlash = Phaser.Math.Between(2000, 6000);
    this.lightningTimer = this.time.delayedCall(firstFlash, createLightningStrike);
  }

  private stopLightningEffects() {
    if (this.lightningTimer) {
      console.log('Stopping lightning effects');
      this.lightningTimer.destroy();
      this.lightningTimer = undefined;
    }
  }

}