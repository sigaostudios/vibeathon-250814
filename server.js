require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default || require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables for Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from Angular build
app.use(express.static(path.join(__dirname, 'dist/vibeathon-250814')));

// LLM endpoint for the news agent
app.post('/api/llm', async (req, res) => {
    console.log('🔵 SERVER: Received POST /api/llm request');
    console.log('🔵 SERVER: Request body:', req.body);
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!CLAUDE_API_KEY) {
            console.warn('Claude API key not found, using fallback response');
            return res.json({ 
                response: getFallbackResponse(prompt),
                source: 'fallback'
            });
        }

        // Make request to Claude API
        const claudeResponse = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!claudeResponse.ok) {
            console.error('Claude API error:', claudeResponse.status, claudeResponse.statusText);
            return res.json({ 
                response: getFallbackResponse(prompt),
                source: 'fallback_after_error'
            });
        }

        const data = await claudeResponse.json();
        const response = data.content?.[0]?.text || getFallbackResponse(prompt);

        res.json({ 
            response: response,
            source: 'claude'
        });

    } catch (error) {
        console.error('LLM endpoint error:', error);
        res.json({ 
            response: getFallbackResponse(req.body.prompt),
            source: 'fallback_after_exception'
        });
    }
});

// Fallback responses when Claude API is unavailable
function getFallbackResponse(prompt) {
    const lowerPrompt = prompt?.toLowerCase() || '';
    
    if (lowerPrompt.includes('witty remark') || lowerPrompt.includes('comment')) {
        const wittyRemarks = [
            "And that's the news, folks. I'd make a joke, but reality is already pretty funny.",
            "In other news, my coffee maker is more reliable than most news sources.",
            "Meanwhile, I'm still waiting for flying cars. But hey, at least we have memes.",
            "And remember, if you can't trust a guy named Max Sterling, who can you trust?",
            "This just in: Everything is fine. We checked. It's not, but we checked."
        ];
        return wittyRemarks[Math.floor(Math.random() * wittyRemarks.length)];
    }
    
    if (lowerPrompt.includes('parse') || lowerPrompt.includes('category')) {
        const categories = ['general', 'technology', 'sports', 'business', 'entertainment', 'science', 'health'];
        // Simple keyword matching
        if (lowerPrompt.includes('tech') || lowerPrompt.includes('ai')) return 'technology';
        if (lowerPrompt.includes('sport') || lowerPrompt.includes('game')) return 'sports';
        if (lowerPrompt.includes('business') || lowerPrompt.includes('stock')) return 'business';
        if (lowerPrompt.includes('movie') || lowerPrompt.includes('entertainment')) return 'entertainment';
        if (lowerPrompt.includes('science') || lowerPrompt.includes('research')) return 'science';
        if (lowerPrompt.includes('health') || lowerPrompt.includes('medical')) return 'health';
        return 'general';
    }
    
    if (lowerPrompt.includes('greeting')) {
        const greetings = [
            "Good evening, I'm Max Sterling with Sigao News. Where the news is real and the commentary is questionable.",
            "Live from our state-of-the-art broom closet, I'm Max Sterling with Sigao News.",
            "Welcome to Sigao News. I'm Max Sterling, and I've been told I have a face for radio.",
            "Broadcasting from somewhere between panic and caffeine, I'm Max Sterling with Sigao News."
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    if (lowerPrompt.includes('signoff')) {
        const signoffs = [
            "This has been Sigao News. I'm Max Sterling, and I'll be here all week. Unfortunately.",
            "For Sigao News, I'm Max Sterling. Good night, and good luck figuring all this out.",
            "I'm Max Sterling, and that's the news. Or at least what we're calling news these days.",
            "Until next time, I'm Max Sterling. Stay informed, stay confused, stay tuned to Sigao News."
        ];
        return signoffs[Math.floor(Math.random() * signoffs.length)];
    }
    
    return "That's all for now from Sigao News. Stay informed!";
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        claude_api_configured: !!CLAUDE_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Serve Angular app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/vibeathon-250814/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Claude API configured: ${!!CLAUDE_API_KEY}`);
    if (!CLAUDE_API_KEY) {
        console.log('🔑 To use Claude API, set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable');
        console.log('💡 For now, the news agent will use fallback responses');
    }
});

module.exports = app;