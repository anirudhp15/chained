# ChainChat - Deployment Guide

## Prerequisites

Before deploying to Vercel, you'll need:

1. **Convex Account & Deployment**

   - Sign up at [convex.dev](https://convex.dev)
   - Install Convex CLI: `npm install -g convex`
   - Deploy your Convex backend: `npx convex deploy`

2. **API Keys**

   - OpenAI API key from [platform.openai.com](https://platform.openai.com)
   - Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

3. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)

## Environment Variables

You'll need to set these environment variables in Vercel:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url_here

# OpenAI API Key (for GPT models)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Deployment Steps

### 1. Deploy Convex Backend

```bash
# Install Convex CLI if not already installed
npm install -g convex

# Login to Convex
npx convex login

# Deploy your backend
npx convex deploy

# Copy the deployment URL for the next step
```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_CONVEX_URL
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY

# Redeploy with environment variables
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
5. Deploy

### 3. Update Convex Configuration

After deploying to Vercel, update your Convex deployment to allow your Vercel domain:

```bash
# In your convex directory
npx convex dashboard
```

Add your Vercel domain to the allowed origins in the Convex dashboard.

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── api/
│   │   ├── stream-agent/     # AI streaming endpoint
│   │   ├── run-chain/        # Agent chain execution
│   │   └── get-previous-steps/ # Chat history
│   └── layout.tsx
├── components/               # React components
├── convex/                  # Backend functions
├── lib/                     # Utility functions
└── vercel.json             # Vercel configuration
```

## Features

- **Landing Page**: Professional landing page at `/`
- **Chat Interface**: Full AI chat interface at `/chat`
- **Multi-Agent Chains**: Chain multiple AI agents together
- **Conditional Logic**: Skip agents based on conditions
- **Multiple Models**: Support for GPT-4, Claude, and other models
- **Real-time Streaming**: Live response streaming
- **Session Management**: Persistent chat sessions

## Troubleshooting

### Common Issues

1. **Environment Variables Not Working**

   - Ensure all environment variables are set in Vercel dashboard
   - Redeploy after adding environment variables

2. **Convex Connection Issues**

   - Verify `NEXT_PUBLIC_CONVEX_URL` is correct
   - Check Convex dashboard for allowed origins

3. **API Key Issues**
   - Verify API keys are valid and have sufficient credits
   - Check API key permissions

### Support

For issues with:

- **Convex**: [docs.convex.dev](https://docs.convex.dev)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **OpenAI**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Anthropic**: [docs.anthropic.com](https://docs.anthropic.com)
