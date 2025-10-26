# Human Capital ⏰💰

> *"Your time. Their money. Complete surveillance."*

A dystopian social commentary platform built as a Black Mirror-style parody exploring the commodification of human time and labor.

## 🎭 The Concept

**Human Capital** takes the phrase to its extreme, logical conclusion:

1. **Your day gets split into 15-minute chunks**
2. **Anyone can bid on your time** using blockchain-based auctions (Sui)
3. **Highest bidder gains control** for that 15 minutes:
   - Watch you through your camera via LiveKit streaming
   - Give you instructions and tasks in real-time
   - Direct your actions and monitor compliance
4. **AI monitors everything** - analyzing your actions, compliance, and performance
5. **Your history becomes searchable data** - anyone can query your past activities

This is intentionally dystopian as **social commentary and parody** - a critique of how modern capitalism commodifies every aspect of human existence. Lean into the discomfort.

---

## ✨ Key Features

### 🎥 Real-Time Video Streaming
- **LiveKit integration** for low-latency video/audio
- Bidders watch streamers complete their tasks live
- Winner can send commands and instructions in real-time

### 💰 Blockchain Auctions
- Custom Sui Move smart contracts for time slot auctions
- NFT-based time slots - tokenized 15-minute windows
- Winner selection happens on-chain
- No admin controls once deployed
- Real-time UI sync with blockchain state

### 🤖 AI-Powered Activity Monitoring
- **VLM (Vision-Language Model) surveillance** continuously watches streams
- Automated frame capture and analysis (configurable sample rate)
- Task completion detection and verification
- Batch processing for efficient analysis of long sessions

### 📊 Data-Intensive Historical Analysis
- **ChromaDB vector database** stores all activity summaries
- **OpenAI embeddings** for semantic search across user history
- Natural language queries: "Are they an idiot?", "What tasks have they completed?"
- AI-powered analysis of user patterns and performance
- Complete activity timeline with relevance scoring

---

## ⛓️ Blockchain Architecture

Built a fully on-chain auction system using Sui Move smart contracts:
- Custom time slot auctions with NFT minting
- Winner selection happens on-chain, not in a database
- No admin keys, no pause functions
- AI surveillance runs separately - doesn't control auction outcomes

We considered having AI verify task completion and feed results back on-chain, but kept the systems separate. Smart contracts handle money, AI handles monitoring.

---

## 🧠 Data-Intensive AI Analysis System

This platform is built around **comprehensive data collection and analysis** to enable deep insights into user behavior and task compliance.

**Scale**: In a single 6-hour period, we processed **7.52 GB of bandwidth** - continuous frame capture, real-time vision analysis, and vector embeddings at scale. This is not a toy project.

### Vision-Language Monitoring (VLM)
- **Continuous frame capture** from live streams at configurable intervals (default: 5 seconds)
- **GPT-4o vision analysis** describes every captured frame in detail
- **Contextual awareness** - includes winner's commands in analysis
- **Chunk-based summaries** - aggregates frames into time-bounded summaries (default: 1-minute chunks)
- **Multi-stage processing**:
  1. Individual frame descriptions (real-time)
  2. Batch summaries (10 frames per batch)
  3. Final chunk summary with task completion detection

### Semantic Search & Historical Analysis
- **Vector embeddings** (OpenAI text-embedding-3-small) enable semantic search
- **ChromaDB cloud storage** for persistent, queryable activity history
- **Natural language queries** - ask questions about any user's past behavior
- **AI-generated insights** - GPT-4o-mini analyzes patterns and provides critical assessments
- **Metadata tracking**: timestamps, task completion status, frame counts, room names

### Performance Tracking
- Task completion verification with strict evidence requirements
- Command compliance monitoring (did they follow winner's instructions?)
- Relevance scoring for search results
- Chronological activity reconstruction

This infrastructure enables:
- **Sponsor data**: Deep behavioral analytics for research and analysis
- **User reputation**: Historical performance tracking
- **Compliance verification**: Automated monitoring of task completion
- **Pattern recognition**: AI identifies trends in user behavior over time

### Real-World Performance Metrics
- **7.52 GB bandwidth** in 6 hours during testing
- **Continuous frame capture** at 5-second intervals (720 frames/hour per stream)
- **Real-time GPT-4o vision analysis** on every captured frame
- **Vector embeddings** generated and stored for every chunk summary
- **Multi-model AI pipeline**: GPT-4o for vision, GPT-4o-mini for analysis, OpenAI embeddings for search
- This is **production-scale data infrastructure**, not a hackathon demo

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.0.0** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Modern styling

### Real-Time Infrastructure
- **LiveKit** - Real-time video/audio streaming
- **WebSockets** - Bidirectional communication for commands

### Blockchain
- **Sui Blockchain** - Move-based smart contracts
- **@mysten/dapp-kit** - Wallet integration
- **@mysten/sui** - On-chain interactions
- Custom auction contracts for time slot NFTs

### AI & Data
- **OpenAI GPT-4o** - Vision-language model for frame analysis
- **OpenAI GPT-4o-mini** - Historical analysis and insights
- **OpenRouter** - API gateway for AI models
- **ChromaDB Cloud** - Vector database for semantic search
- **OpenAI Embeddings** (text-embedding-3-small) - Semantic search

### Runtime
- **Bun** - Fast package manager and runtime

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed
- Environment variables configured (see `.env.example`)

### Environment Variables
```bash
# LiveKit
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-livekit-url

# OpenAI
OPENAI_API_KEY=your_openai_key

# OpenRouter (for VLM)
OPENROUTER_API_KEY=your_openrouter_key

# ChromaDB Cloud
CHROMADB_API_KEY=your_chromadb_key

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
```

### Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the platform.

### Other Scripts

```bash
bun run build            # Build for production
bun start                # Start production server
bun run lint             # Run ESLint
bun run deploy-contract  # Deploy Sui smart contracts
```

---

## 📁 Project Structure

```
app/
├── api/
│   ├── vlm-worker/          # AI vision analysis endpoints
│   ├── user-history-search/ # Semantic search API
│   └── ...
├── components/
│   ├── vlm-monitor.tsx      # Real-time AI monitoring UI
│   ├── user-history-modal.tsx # Historical search interface
│   ├── nft-auction-sidebar.tsx # Blockchain auction UI
│   └── ...
├── stream/                   # Streamer dashboard
├── view/                     # Viewer/bidder interface
└── ...

lib/
├── chromadb-client.ts       # Vector DB integration
└── ...

time_auction/                # Sui Move smart contracts
```

---

## 🎯 Use Cases

### For Streamers
- Monetize your time in 15-minute increments
- Complete tasks for the highest bidder
- Build a reputation through verified task completion

### For Bidders
- Control someone's time for 15 minutes
- Give tasks and watch them complete in real-time
- Verify compliance through AI monitoring

### For Researchers & Sponsors
- Access rich behavioral data
- Query historical patterns with natural language
- AI-powered insights into human task performance
- Study commodification of labor in practice

---

## 📖 Documentation

- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

## ⚠️ Disclaimer

This project is **artistic commentary and parody**. It's meant to provoke thought about labor commodification, surveillance capitalism, and the data-industrial complex. The dystopian nature is intentional and serves as social critique.

*"In a world where everything has a price, what happens when you put yourself on the market? And what happens when AI watches your every move?"*
