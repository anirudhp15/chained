# ChainChat

A powerful AI agent chaining platform that allows you to create complex workflows by connecting multiple AI agents together.

## Features

- **Multi-Agent Chains**: Chain multiple AI agents together to create complex workflows
- **Conditional Logic**: Add smart conditional logic to skip or trigger agents based on previous responses
- **Multiple Models**: Support for GPT-4, Claude, and other AI models in the same conversation
- **Real-time Streaming**: Live response streaming for immediate feedback
- **Session Management**: Persistent chat sessions with history
- **Professional Landing Page**: Clean, modern landing page at the root URL
- **Dedicated Chat Interface**: Full-featured chat interface at `/chat`

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
├── convex/                  # Backend functions (Convex)
├── lib/                     # Utility functions
└── vercel.json             # Vercel configuration
```

## Getting Started

### Prerequisites

1. **Node.js** (version 18 or higher)
2. **Convex Account** - Sign up at [convex.dev](https://convex.dev)
3. **API Keys**:
   - OpenAI API key from [platform.openai.com](https://platform.openai.com)
   - Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Convex:

   ```bash
   npx convex dev
   ```

4. Set up environment variables (create `.env.local`):

   ```bash
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

5. Run the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to see the landing page
7. Click "Try for Free" or navigate to [http://localhost:3000/chat](http://localhost:3000/chat) for the chat interface

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time database and functions)
- **AI Models**: OpenAI GPT-4, Anthropic Claude
- **Deployment**: Vercel
- **Styling**: Tailwind CSS with custom components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
