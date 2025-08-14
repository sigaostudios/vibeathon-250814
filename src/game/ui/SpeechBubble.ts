export class SpeechBubble {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private textObject: Phaser.GameObjects.Text;
    private tail: Phaser.GameObjects.Graphics;
    private isVisible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setDepth(1000);
        this.container.setVisible(false);
    }

    show(targetSprite: Phaser.GameObjects.Sprite, message: string, options: {
        duration?: number;
        width?: number;
        backgroundColor?: number;
        textColor?: string;
        fontSize?: string;
        position?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'side';
    } = {}) {
        const {
            duration = 0, // 0 means don't auto-hide
            width = 320,
            backgroundColor = 0xffffff,
            textColor = '#333333',
            fontSize = '16px',
            position = 'auto'
        } = options;

        // Clear previous content
        this.container.removeAll(true);

        // Create text first to measure dimensions
        this.textObject = this.scene.add.text(0, 0, message, {
            fontFamily: 'Arial',
            fontSize: fontSize,
            color: textColor,
            align: 'center',
            wordWrap: { width: width - 30 }
        }).setOrigin(0.5);

        const textBounds = this.textObject.getBounds();
        const bubbleWidth = Math.max(width, textBounds.width + 40);
        const bubbleHeight = textBounds.height + 40;

        // Create background bubble
        this.background = this.scene.add.graphics();
        this.background.fillStyle(backgroundColor, 0.95);
        this.background.lineStyle(3, 0x666666);
        this.background.fillRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 15);
        this.background.strokeRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 15);

        // Create speech tail
        this.tail = this.scene.add.graphics();
        this.tail.fillStyle(backgroundColor, 0.95);
        this.tail.lineStyle(3, 0x666666);

        // Position bubble relative to sprite
        const spriteX = targetSprite.x;
        const spriteY = targetSprite.y;
        const spriteBounds = targetSprite.getBounds();
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;

        let bubbleX = spriteX;
        let bubbleY = spriteY;
        let tailPath: number[] = [];
        let actualPosition = position;

        // Auto positioning logic
        if (position === 'auto') {
            // For longer messages or when sprite is on the left side, prefer right positioning
            if (message.length > 200 || spriteX < gameWidth * 0.5) {
                actualPosition = 'right'; // Prefer right side for left-positioned sprites
            } else {
                actualPosition = 'top';
            }
            console.log(`💬 Auto-positioning: message length=${message.length}, sprite at (${spriteX}, ${spriteY}) -> ${actualPosition}`);
        } else if (position === 'side') {
            // For side positioning, strongly prefer right since Brandon is on the left
            if (spriteX < gameWidth * 0.6) {
                actualPosition = 'right'; // Prefer right for left-side sprites
            } else {
                actualPosition = 'left'; // Only use left if sprite is far right
            }
            console.log(`💬 Side positioning: sprite at (${spriteX}, ${spriteY}) -> ${actualPosition}`);
        } else {
            console.log(`💬 Manual positioning: ${position}`);
        }

        switch (actualPosition) {
            case 'top':
                bubbleY = spriteY - spriteBounds.height/2 - bubbleHeight/2 - 30;
                // Clamp to screen bounds
                if (bubbleY - bubbleHeight/2 < 50) {
                    bubbleY = spriteY + spriteBounds.height/2 + bubbleHeight/2 + 30;
                    tailPath = [0, -bubbleHeight/2, -20, -bubbleHeight/2 - 20, 20, -bubbleHeight/2 - 20];
                } else {
                    tailPath = [0, bubbleHeight/2, -20, bubbleHeight/2 + 20, 20, bubbleHeight/2 + 20];
                }
                break;
            case 'bottom':
                bubbleY = spriteY + spriteBounds.height/2 + bubbleHeight/2 + 30;
                tailPath = [0, -bubbleHeight/2, -20, -bubbleHeight/2 - 20, 20, -bubbleHeight/2 - 20];
                break;
            case 'left':
                bubbleX = spriteX - spriteBounds.width/2 - bubbleWidth/2 - 40;
                bubbleY = spriteY - 20; // Slightly above sprite center
                tailPath = [bubbleWidth/2, 20, bubbleWidth/2 + 20, 0, bubbleWidth/2 + 20, 40];
                break;
            case 'right':
                bubbleX = spriteX + spriteBounds.width/2 + bubbleWidth/2 + 40;
                bubbleY = spriteY - 20; // Slightly above sprite center
                tailPath = [-bubbleWidth/2, 20, -bubbleWidth/2 - 20, 0, -bubbleWidth/2 - 20, 40];
                break;
        }

        // Clamp bubble position to screen bounds
        bubbleX = Phaser.Math.Clamp(bubbleX, bubbleWidth/2 + 20, gameWidth - bubbleWidth/2 - 20);
        bubbleY = Phaser.Math.Clamp(bubbleY, bubbleHeight/2 + 20, gameHeight - bubbleHeight/2 - 20);

        // Draw tail
        this.tail.beginPath();
        this.tail.moveTo(tailPath[0], tailPath[1]);
        this.tail.lineTo(tailPath[2], tailPath[3]);
        this.tail.lineTo(tailPath[4], tailPath[5]);
        this.tail.closePath();
        this.tail.fillPath();
        this.tail.strokePath();

        // Add elements to container
        this.container.add([this.background, this.tail, this.textObject]);
        this.container.setPosition(bubbleX, bubbleY);

        // Show with animation
        this.container.setVisible(true);
        this.container.setScale(0);
        this.container.setAlpha(0);
        
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.isVisible = true;

        // Auto-hide after duration
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.hide();
            });
        }
    }

    hide(callback?: () => void) {
        if (!this.isVisible) return;

        this.scene.tweens.add({
            targets: this.container,
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.container.setVisible(false);
                this.isVisible = false;
                if (callback) callback();
            }
        });
    }

    updateText(newMessage: string) {
        if (this.textObject && this.isVisible) {
            this.textObject.setText(newMessage);
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }

    get visible() {
        return this.isVisible;
    }
}