import { EventBus } from '../EventBus';
import { SpeechBubble } from './SpeechBubble';
import { TextInputOverlay } from './TextInputOverlay';

export type DialogStep = 'greeting' | 'input' | 'waiting' | 'response' | 'closed';

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

        // Show Brandon's greeting
        this.speechBubble.show(targetSprite, this.greetingMessage, {
            duration: 0, // Don't auto-hide
            width: 380,
            backgroundColor: 0xf5f5dc, // Beige color for Amish feel
            textColor: '#4a4a4a',
            fontSize: '15px'
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

        // Show input field below Brandon
        const inputY = this.targetSprite.y + 120;
        
        this.textInput.show({
            placeholder: "Tell Brandon what movies you like... (press Enter to submit)",
            position: { x: this.targetSprite.x, y: inputY },
            width: 400,
            onSubmit: this.handleUserSubmit.bind(this),
            onCancel: this.closeDialog.bind(this)
        });
    }

    private handleUserSubmit(userInput: string) {
        if (!this.targetSprite || !this.isActive) return;

        console.log('User submitted movie preferences:', userInput);
        
        this.currentStep = 'waiting';

        // Update speech bubble to show waiting message
        this.speechBubble.updateText(this.waitingMessage);

        // Send request to Angular service via EventBus
        EventBus.emit('request-movie-recommendations', userInput);
    }

    private handleAIResponse(aiResponse: string) {
        if (!this.targetSprite || !this.isActive || this.currentStep !== 'waiting') return;

        console.log('Received AI response:', aiResponse);
        
        this.currentStep = 'response';

        // Show Brandon's movie recommendations
        this.speechBubble.show(this.targetSprite, aiResponse, {
            duration: 0, // Don't auto-hide
            width: 420,
            backgroundColor: 0xf0fff0, // Light green for response
            textColor: '#2d4a2d',
            fontSize: '14px'
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

        const instructionText = this.scene.add.text(
            this.targetSprite.x, 
            this.targetSprite.y + 200, 
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
        this.targetSprite = null;

        // Hide UI elements
        this.speechBubble.hide();
        this.textInput.hide();

        // Clean up any instruction text
        this.scene.children.list
            .filter(child => child instanceof Phaser.GameObjects.Text && child.getData('isInstruction'))
            .forEach(child => child.destroy());
    }

    // Check if dialog is currently active
    get active() {
        return this.isActive;
    }

    // Get current step for debugging
    get step() {
        return this.currentStep;
    }

    destroy() {
        this.closeDialog();
        this.speechBubble.destroy();
        this.textInput.destroy();
        
        // Remove event listeners
        EventBus.off('ai-movie-response', this.handleAIResponse);
    }
}