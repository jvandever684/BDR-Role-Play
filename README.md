# BDR Voice Roleplay App

A browser-based voice roleplay app for BDRs practicing demo-setting calls with skeptical Service Managers.

## What it does
- Lets a BDR start a live voice conversation through their microphone
- AI acts as a skeptical Service Manager
- Scenario is focused on Dealerlogix + Text2Drive
- The AI should only agree to a demo after discovery, pain restatement, and a relevant demo ask
- Transcript is captured through the Realtime data channel
- End call generates a scorecard focused on setting a demo, not closing the sale

## Setup
1. Install Node.js
2. Copy `.env.example` to `.env.local`
3. Add your OpenAI API key
4. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Important
Do not expose your OpenAI API key in browser code. This app uses a server route to mint a temporary Realtime client secret.
