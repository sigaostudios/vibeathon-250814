#!/bin/bash

echo "Setting up tmux environment for Linux..."

# Install Ruby/gem if not present
if ! command -v ruby &> /dev/null; then
    echo "Installing Ruby..."
    sudo apt-get update
    sudo apt-get install -y ruby-full
fi

# Install tmux if not present
if ! command -v tmux &> /dev/null; then
    echo "Installing tmux..."
    sudo apt-get install -y tmux
fi

# Install tmuxinator if not present
if ! command -v tmuxinator &> /dev/null; then
    echo "Installing tmuxinator..."
    sudo gem install tmuxinator
fi

# Copy tmux config to home directory
echo "Copying .tmux.conf to home directory..."
cp tools/tmux/.tmux.conf ~/

# Create tmuxinator config directory if it doesn't exist
mkdir -p ~/.config/tmuxinator/

# Copy tmuxinator config
echo "Copying vibe.yml to tmuxinator config..."
cp tools/tmux/vibe.yml ~/.config/tmuxinator/vibe.yml

echo "Tmux environment setup complete!"
echo "You can start the tmux session with: tmuxinator start vibe"