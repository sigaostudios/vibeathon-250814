export class TextInputOverlay {
    private scene: Phaser.Scene;
    private inputContainer!: HTMLDivElement;
    private textInput!: HTMLInputElement;
    private submitButton!: HTMLButtonElement;
    private isVisible = false;
    private onSubmitCallback?: (text: string) => void;
    private onCancelCallback?: () => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    show(options: {
        placeholder?: string;
        position?: { x: number; y: number };
        width?: number;
        onSubmit?: (text: string) => void;
        onCancel?: () => void;
    } = {}) {
        const {
            placeholder = 'Type your message...',
            position = { x: 400, y: 500 },
            width = 350,
            onSubmit,
            onCancel
        } = options;

        this.onSubmitCallback = onSubmit;
        this.onCancelCallback = onCancel;

        // Get the Phaser canvas element
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Calculate position relative to canvas
        const inputX = canvasRect.left + (position.x * (canvasRect.width / this.scene.scale.width)) - width / 2;
        const inputY = canvasRect.top + (position.y * (canvasRect.height / this.scene.scale.height));

        // Create container div
        this.inputContainer = document.createElement('div');
        this.inputContainer.style.position = 'absolute';
        this.inputContainer.style.left = `${inputX}px`;
        this.inputContainer.style.top = `${inputY}px`;
        this.inputContainer.style.zIndex = '2000';
        this.inputContainer.style.pointerEvents = 'auto';
        this.inputContainer.style.fontFamily = 'Arial, sans-serif';

        // Create input field
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.placeholder = placeholder;
        this.textInput.style.width = `${width - 100}px`;
        this.textInput.style.padding = '12px';
        this.textInput.style.fontSize = '16px';
        this.textInput.style.border = '3px solid #0cc9bd';
        this.textInput.style.borderRadius = '8px';
        this.textInput.style.outline = 'none';
        this.textInput.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        this.textInput.style.color = '#333';
        this.textInput.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        this.textInput.style.marginRight = '10px';

        // Create submit button
        this.submitButton = document.createElement('button');
        this.submitButton.textContent = 'Ask Brandon';
        this.submitButton.style.padding = '12px 20px';
        this.submitButton.style.fontSize = '16px';
        this.submitButton.style.backgroundColor = '#0cc9bd';
        this.submitButton.style.color = '#000';
        this.submitButton.style.border = 'none';
        this.submitButton.style.borderRadius = '8px';
        this.submitButton.style.cursor = 'pointer';
        this.submitButton.style.fontWeight = 'bold';
        this.submitButton.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        this.submitButton.style.transition = 'all 0.2s ease';

        // Button hover effects
        this.submitButton.addEventListener('mouseenter', () => {
            this.submitButton.style.backgroundColor = '#0fe3d6';
            this.submitButton.style.transform = 'translateY(-2px)';
        });

        this.submitButton.addEventListener('mouseleave', () => {
            this.submitButton.style.backgroundColor = '#0cc9bd';
            this.submitButton.style.transform = 'translateY(0)';
        });

        // Add event handlers
        this.textInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.handleCancel();
            }
        });

        this.submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Update button state based on input
        this.textInput.addEventListener('input', () => {
            const hasText = this.textInput.value.trim().length > 0;
            this.submitButton.disabled = !hasText;
            this.submitButton.style.opacity = hasText ? '1' : '0.5';
            this.submitButton.style.cursor = hasText ? 'pointer' : 'not-allowed';
        });

        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.style.display = 'flex';
        inputWrapper.style.alignItems = 'center';
        inputWrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        inputWrapper.style.padding = '15px';
        inputWrapper.style.borderRadius = '12px';
        inputWrapper.style.border = '2px solid #0cc9bd';
        inputWrapper.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.5)';

        inputWrapper.appendChild(this.textInput);
        inputWrapper.appendChild(this.submitButton);
        this.inputContainer.appendChild(inputWrapper);

        // Add to page
        document.body.appendChild(this.inputContainer);

        // Initial button state
        this.submitButton.disabled = true;
        this.submitButton.style.opacity = '0.5';
        this.submitButton.style.cursor = 'not-allowed';

        // Animate in
        this.inputContainer.style.transform = 'translateY(20px)';
        this.inputContainer.style.opacity = '0';
        
        requestAnimationFrame(() => {
            this.inputContainer.style.transition = 'all 0.3s ease';
            this.inputContainer.style.transform = 'translateY(0)';
            this.inputContainer.style.opacity = '1';
        });

        // Focus the input
        setTimeout(() => {
            this.textInput.focus();
        }, 100);

        this.isVisible = true;
    }

    private handleSubmit() {
        const text = this.textInput.value.trim();
        if (text && this.onSubmitCallback) {
            this.onSubmitCallback(text);
        }
        this.hide();
    }

    private handleCancel() {
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
        this.hide();
    }

    hide() {
        if (!this.isVisible) return;

        if (this.inputContainer) {
            // Animate out
            this.inputContainer.style.transition = 'all 0.2s ease';
            this.inputContainer.style.transform = 'translateY(-20px)';
            this.inputContainer.style.opacity = '0';

            setTimeout(() => {
                if (this.inputContainer && this.inputContainer.parentNode) {
                    this.inputContainer.parentNode.removeChild(this.inputContainer);
                }
                this.cleanup();
            }, 200);
        }

        this.isVisible = false;
    }

    private cleanup() {
        this.inputContainer = null!;
        this.textInput = null!;
        this.submitButton = null!;
        this.onSubmitCallback = undefined;
        this.onCancelCallback = undefined;
    }

    updatePosition(x: number, y: number) {
        if (this.inputContainer && this.isVisible) {
            const canvas = this.scene.game.canvas;
            const canvasRect = canvas.getBoundingClientRect();
            
            const inputX = canvasRect.left + (x * (canvasRect.width / this.scene.scale.width)) - 175;
            const inputY = canvasRect.top + (y * (canvasRect.height / this.scene.scale.height));
            
            this.inputContainer.style.left = `${inputX}px`;
            this.inputContainer.style.top = `${inputY}px`;
        }
    }

    destroy() {
        this.hide();
    }

    get visible() {
        return this.isVisible;
    }
}