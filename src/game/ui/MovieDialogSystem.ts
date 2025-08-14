import { EventBus } from '../EventBus';
import { SpeechBubble } from './SpeechBubble';
import { TextInputOverlay } from './TextInputOverlay';

export type DialogStep = 'greeting' | 'input' | 'waiting' | 'response' | 'closed';
export type BrandonExpression = 'neutral' | 'money' | 'disapproval';

export class MovieDialogSystem {
    private scene: Phaser.Scene;
    private speechBubble: SpeechBubble;
    private textInput: TextInputOverlay;
    private currentStep: DialogStep = 'closed';
    private targetSprite: Phaser.GameObjects.Sprite | null = null;
    private isActive = false;

    // Dialog messages
    private readonly greetingMessage = "Well, well... *adjusts hat suspiciously* So you want movie recommendations from me, eh? Keep it down while I think... What kind of moving pictures are you in the mood for? And don't you dare mention anything with too many of those blasted electronic contraptions!";
    private readonly waitingMessage = "Hmm... *mutters to his poop sock* Let me consult my vast knowledge of cinema while having an existential crisis about these talking picture boxes...";

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.speechBubble = new SpeechBubble(scene);
        this.textInput = new TextInputOverlay(scene);
        
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Listen for AI responses from Angular
        EventBus.on('ai-movie-response', this.handleAIResponse.bind(this));
        
        // Listen for escape key to close dialog
        this.scene.input.keyboard?.on('keydown-ESC', () => {
            if (this.isActive) {
                this.closeDialog();
            }
        });

        // Listen for clicks outside to close (we'll implement this by clicking on the scene)
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            // Close if clicking outside while in response step
            if (this.isActive && this.currentStep === 'response' && currentlyOver.length === 0) {
                this.closeDialog();
            }
        });
    }

    startDialog(targetSprite: Phaser.GameObjects.Sprite) {
        if (this.isActive) return;

        console.log('Starting Brandon movie dialog');
        this.isActive = true;
        this.targetSprite = targetSprite;
        this.currentStep = 'greeting';

        // Show Brandon's greeting above him
        this.speechBubble.show(targetSprite, this.greetingMessage, {
            duration: 0, // Don't auto-hide
            width: 380,
            backgroundColor: 0xf5f5dc, // Beige color for Amish feel
            textColor: '#4a4a4a',
            fontSize: '15px',
            position: 'top'
        });

        // Wait a moment, then show input
        this.scene.time.delayedCall(2000, () => {
            if (this.isActive && this.currentStep === 'greeting') {
                this.showInput();
            }
        });
    }

    private showInput() {
        if (!this.targetSprite || !this.isActive) return;

        this.currentStep = 'input';

        // Position input field in center-bottom area, not directly under Brandon
        const inputX = 512; // Center of screen for better visibility and typing experience
        const inputY = this.targetSprite.y + 120;
        
        this.textInput.show({
            placeholder: "Tell Brandon what movies you like... (press Enter to submit)",
            position: { x: inputX, y: inputY },
            width: 450,
            onSubmit: this.handleUserSubmit.bind(this),
            onCancel: this.closeDialog.bind(this)
        });
    }

    private handleUserSubmit(userInput: string) {
        if (!this.targetSprite || !this.isActive) return;

        console.log('User submitted movie preferences:', userInput);
        
        this.currentStep = 'waiting';

        // Update speech bubble to show waiting message above Brandon
        this.speechBubble.show(this.targetSprite, this.waitingMessage, {
            duration: 0,
            width: 380,
            backgroundColor: 0xfff8dc, // Light cream for waiting
            textColor: '#6b5b73',
            fontSize: '15px',
            position: 'top'
        });

        // Send request to Angular service via EventBus
        EventBus.emit('request-movie-recommendations', userInput);
    }

    private handleAIResponse(aiResponse: string) {
        if (!this.targetSprite || !this.isActive || this.currentStep !== 'waiting') return;

        console.log('Received AI response:', aiResponse);
        
        this.currentStep = 'response';

        // Analyze Brandon's sentiment and update his expression
        const expression = this.analyzeBrandonSentiment(aiResponse);
        this.updateBrandonExpression(expression);

        // Choose bubble color based on sentiment
        let bubbleColor = 0xf0fff0; // Default light green
        let textColor = '#2d4a2d';
        
        if (expression === 'money') {
            bubbleColor = 0xf0f8d0; // Light golden for approval
            textColor = '#4a4a00';
        } else if (expression === 'disapproval') {
            bubbleColor = 0xffe0e0; // Light red for disapproval
            textColor = '#4a2d2d';
        }

        // Show Brandon's movie recommendations to the side so he's still visible
        this.speechBubble.show(this.targetSprite, aiResponse, {
            duration: 0, // Don't auto-hide
            width: 450,
            backgroundColor: bubbleColor,
            textColor: textColor,
            fontSize: '14px',
            position: 'side' // This will automatically choose left or right based on Brandon's position
        });

        // Add a close button instruction at the bottom
        this.scene.time.delayedCall(1000, () => {
            if (this.isActive && this.currentStep === 'response') {
                this.showCloseInstruction();
            }
        });
    }

    private showCloseInstruction() {
        if (!this.targetSprite) return;

        // Position instruction at bottom center of screen for better visibility
        const instructionText = this.scene.add.text(
            512, // Center of screen
            this.scene.scale.height - 50, // Bottom of screen
            "Click anywhere or press ESC to close",
            {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#0cc9bd',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: { x: 12, y: 8 }
            }
        ).setOrigin(0.5).setDepth(1500);

        // Pulse animation to draw attention
        this.scene.tweens.add({
            targets: instructionText,
            alpha: { from: 1, to: 0.5 },
            duration: 1000,
            yoyo: true,
            repeat: 2
        });

        // Auto-remove instruction after animation
        this.scene.time.delayedCall(3000, () => {
            if (instructionText && instructionText.active) {
                instructionText.destroy();
            }
        });
    }

    closeDialog() {
        if (!this.isActive) return;

        console.log('Closing Brandon movie dialog');
        
        this.isActive = false;
        this.currentStep = 'closed';

        // Reset Brandon to neutral expression
        if (this.targetSprite) {
            this.updateBrandonExpression('neutral');
        }
        
        this.targetSprite = null;

        // Hide UI elements
        this.speechBubble.hide();
        this.textInput.hide();

        // Clean up any instruction text
        this.scene.children.list
            .filter(child => child instanceof Phaser.GameObjects.Text && child.getData('isInstruction'))
            .forEach(child => child.destroy());
    }

    /**
     * Analyzes Brandon's AI response to determine his sentiment about the movies
     */
    private analyzeBrandonSentiment(response: string): BrandonExpression {
        const lowerResponse = response.toLowerCase();
        
        // Keywords that indicate approval/liking movies
        const approvalKeywords = [
            'excellent', 'wonderful', 'masterpiece', 'brilliant', 'fantastic',
            'love', 'adore', 'appreciate', 'recommend', 'perfect',
            'beautiful', 'moving', 'touching', 'powerful', 'impressive',
            'fine', 'good choice', 'solid', 'well done', 'crafted',
            'money', 'worth watching', 'classic', 'timeless'
        ];
        
        // Keywords that indicate disapproval/disliking movies
        const disapprovalKeywords = [
            'terrible', 'awful', 'horrible', 'disgusting', 'abomination',
            'hate', 'despise', 'loathe', 'avoid', 'refuse',
            'technology', 'electronic', 'digital', 'computer', 'modern nonsense',
            'contraption', 'gadgets', 'machines', 'artificial',
            'existential crisis', 'troubled', 'conflicted', 'angry',
            'bah', 'pah', 'nonsense', 'ridiculous', 'absurd',
            'keep it down', 'quiet', 'too loud'
        ];
        
        let approvalScore = 0;
        let disapprovalScore = 0;
        
        // Count approval keywords
        approvalKeywords.forEach(keyword => {
            if (lowerResponse.includes(keyword)) {
                approvalScore++;
            }
        });
        
        // Count disapproval keywords
        disapprovalKeywords.forEach(keyword => {
            if (lowerResponse.includes(keyword)) {
                disapprovalScore++;
            }
        });
        
        // Special case: if Brandon mentions his internal conflict about technology
        if (lowerResponse.includes('existential crisis') && lowerResponse.includes('technology')) {
            disapprovalScore += 2; // Heavy weight for his signature conflict
        }
        
        // Special case: if he mentions money or financial terms positively
        if (lowerResponse.includes('money') || lowerResponse.includes('profit') || lowerResponse.includes('worth')) {
            approvalScore += 2;
        }
        
        console.log(`🧠 Brandon sentiment analysis: approval=${approvalScore}, disapproval=${disapprovalScore}`);
        console.log(`📝 Analyzed text snippet: "${response.substring(0, 100)}..."`);
        
        // Determine expression based on scores
        if (disapprovalScore > approvalScore && disapprovalScore >= 2) {
            console.log('🎯 Result: DISAPPROVAL - Brandon will be angry');
            return 'disapproval';
        } else if (approvalScore > disapprovalScore && approvalScore >= 2) {
            console.log('🎯 Result: MONEY - Brandon will be pleased');
            return 'money';
        } else {
            console.log('🎯 Result: NEUTRAL - Brandon will stay neutral');
            return 'neutral';
        }
    }

    /**
     * Updates Brandon's sprite texture based on his expression
     */
    private updateBrandonExpression(expression: BrandonExpression) {
        if (!this.targetSprite || !this.targetSprite.active) {
            console.log('Cannot update Brandon expression - sprite not available');
            return;
        }
        
        let textureKey = 'amish-brandon'; // Default neutral
        
        switch (expression) {
            case 'money':
                textureKey = 'amish-brandon-money';
                console.log('💰 Brandon is pleased with the movie recommendations!');
                break;
            case 'disapproval':
                textureKey = 'amish-brandon-disapproval';
                console.log('😠 Brandon disapproves of these movies!');
                break;
            case 'neutral':
            default:
                textureKey = 'amish-brandon';
                console.log('😐 Brandon has a neutral expression');
                break;
        }
        
        console.log(`Changing Brandon texture from "${this.targetSprite.texture.key}" to "${textureKey}"`);
        
        // Check if the texture exists
        if (!this.scene.textures.exists(textureKey)) {
            console.error(`❌ Texture "${textureKey}" does not exist! Available textures:`, Object.keys(this.scene.textures.list));
            return;
        }
        
        // For the response step, change immediately without animation to ensure it's visible
        if (this.currentStep === 'response' || this.currentStep === 'closed') {
            this.targetSprite.setTexture(textureKey);
            console.log('✅ Texture changed immediately');
            return;
        }
        
        // For other steps, use smooth transition
        const sprite = this.targetSprite; // Capture reference before async operation
        
        this.scene.tweens.add({
            targets: sprite,
            scaleX: 0,
            duration: 150,
            ease: 'Power2.easeIn',
            onComplete: () => {
                // Check if sprite still exists and dialog is still active
                if (sprite && sprite.active && this.isActive) {
                    console.log('🔄 Applying texture in tween callback');
                    sprite.setTexture(textureKey);
                    
                    // Scale back up
                    this.scene.tweens.add({
                        targets: sprite,
                        scaleX: 0.5, // Match the original scale from MascotPlayground
                        duration: 150,
                        ease: 'Power2.easeOut'
                    });
                }
            }
        });
    }

    // Check if dialog is currently active
    get active() {
        return this.isActive;
    }

    // Get current step for debugging
    get step() {
        return this.currentStep;
    }

    // Debug method to manually test expression changes
    testExpression(expression: BrandonExpression) {
        console.log(`🧪 Testing expression: ${expression}`);
        if (this.targetSprite) {
            this.updateBrandonExpression(expression);
        } else {
            console.log('❌ No target sprite available for testing');
        }
    }

    destroy() {
        this.closeDialog();
        this.speechBubble.destroy();
        this.textInput.destroy();
        
        // Remove event listeners
        EventBus.off('ai-movie-response', this.handleAIResponse);
    }
}