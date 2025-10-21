// This file has been removed for security reasons.
// API keys are now handled through Replit Secrets (environment variables).
// 
// To configure your API key:
// 1. Go to the Secrets tab in Replit
// 2. Add a new secret with:
//    - Key: VITE_OPENAI_API_KEY
//    - Value: your OpenAI API key (sk-...)

// Parse API key from environment if it exists
const rawApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';