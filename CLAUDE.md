# Human Capital - A Dystopian Social Commentary Platform

> *"Your time. Their money. Complete surveillance."*

**A Black Mirror-style parody exploring the commodification of human time and labor.**

## Project Concept

This platform takes the concept of "human capital" to its extreme, dystopian conclusion:

- **Your day is divided into 15-minute chunks**
- **Anyone can place bids on these time slots** via blockchain auction
- **Highest bidder gains control** for that 15 minutes:
  - Direct you via instructions
  - Watch you through your camera (LiveKit streaming)
  - Make you do whatever they want within that timeframe
- **AI monitors everything** - VLM surveillance tracks compliance and task completion
- **Your history is searchable data** - semantic search enables querying past activities
- **Built as social commentary/parody** - intentionally dystopian to critique modern labor commodification and surveillance capitalism

**Note:** This is meant as artistic commentary and parody, not an ethical business model. Lean into the dystopian aesthetic.

---

# Project Configuration

**Important: Always check the documentation links below before implementing Sui-related features.**

## Package Manager
- Uses Bun (bun.lock present)

## Scripts
- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun start` - Start production server
- `bun run lint` - Run ESLint
- `bun run deploy-contract` - Deploy Sui Move smart contracts

## Tech Stack

### Frontend & Runtime
- Next.js 16.0.0 (App Router)
- React 19.2.0
- TypeScript
- Tailwind CSS v4
- ESLint with Next.js config
- Bun (package manager & runtime)

### Real-Time Infrastructure
- **LiveKit** (livekit-client, livekit-server-sdk, @livekit/components-react)
  - Real-time video/audio streaming
  - Low-latency bidirectional communication
  - Room-based architecture

### Blockchain
- **Sui** (@mysten/sui, @mysten/dapp-kit)
  - Custom Move smart contracts in `time_auction/sources/`
  - NFT-based time slot auctions
  - On-chain winner selection
  - Wallet integration with official ConnectButton

### AI & Data Infrastructure
- **OpenAI API** (openai package)
  - GPT-4o for vision-language analysis (via OpenRouter)
  - GPT-4o-mini for historical analysis and insights
  - text-embedding-3-small for semantic embeddings
- **OpenRouter** (API gateway for vision models)
  - Handles VLM API calls
  - Cost-effective model routing
- **ChromaDB Cloud** (chromadb package)
  - Vector database for activity summaries
  - Semantic search with embeddings
  - Persistent storage of user history
- **React Query** (@tanstack/react-query)
  - Data fetching and caching

## Data Architecture

**Scale Note**: This is a **data-intensive application** by design. In a single 6-hour test period, we processed **7.52 GB of bandwidth** through continuous frame capture, real-time vision analysis, and vector database operations. Budget accordingly.

### VLM (Vision-Language Model) System
- **Location**: `app/components/vlm-monitor.tsx`
- **Purpose**: Real-time surveillance and task compliance monitoring
- **Flow**:
  1. Connects to LiveKit room as hidden bot participant
  2. Captures frames at configurable interval (default: 5 seconds)
  3. Sends frames to OpenRouter GPT-4o with context (winner's commands)
  4. Stores descriptions in memory for chunk processing
  5. Auto-triggers chunk summary at configurable intervals (default: 1 minute)

### Chunk Summary Pipeline
- **Endpoints**: `app/api/vlm-worker/`
  - `analyze` - Individual frame analysis
  - `batch-summary` - Summarize 10 frames at a time
  - `chunk-summary` - Final summary with task completion detection
- **Multi-stage processing**:
  1. **Individual frames**: Real-time descriptions as frames are captured
  2. **Batch summaries**: Groups of 10 frames analyzed together
  3. **Final chunk**: 7 sampled images + all batch summaries → comprehensive summary
- **Output**: Summary text + boolean task completion flag
- **Storage**: Automatically stored in ChromaDB with metadata

### ChromaDB Integration
- **Client**: `lib/chromadb-client.ts`
- **Collection**: `chunk_summaries`
- **Embedding Function**: OpenAI text-embedding-3-small
- **Document Structure**:
  - `summary` (text, embedded)
  - `metadata`:
    - `wallet_address` (indexed for filtering)
    - `timestamp`
    - `room_name`
    - `chunk_duration`
    - `task_completed` (boolean)
    - `main_task_prompt`
    - `frame_count`

### User History Search
- **Endpoint**: `app/api/user-history-search/`
- **Component**: `app/components/user-history-modal.tsx`
- **Flow**:
  1. User submits natural language query (e.g., "Are they an idiot?")
  2. Query embedded with OpenAI
  3. ChromaDB semantic search filtered by wallet address
  4. Top 10 results returned with relevance scores
  5. GPT-4o-mini generates critical analysis based on results
- **Features**:
  - Natural language queries
  - Wallet-scoped search
  - AI-generated insights
  - Relevance scoring

## Key Components

### Stream Management
- `app/stream/page.tsx` - Streamer dashboard (sell time)
- `app/view/[roomname]/page.tsx` - Viewer interface (watch & control)
- `app/components/stream-player.tsx` - Main player with VLM integration
- `app/components/stream-player-admin.tsx` - Admin controls

### Auction System
- `app/components/nft-auction-sidebar.tsx` - Blockchain auction UI
- `app/api/time-slot-monitor/` - Server-side slot timing
- `time_auction/` - Sui Move smart contracts

### AI Monitoring
- `app/components/vlm-monitor.tsx` - Real-time VLM surveillance UI
- `app/components/user-history-modal.tsx` - Historical search interface
- `app/api/vlm-worker/*` - VLM processing endpoints

### UI Components
- `app/components/navbar.tsx` - Navigation with wallet connect
- `app/components/camera-feed.tsx` - Local camera capture
- `app/components/instructions-overlay.tsx` - Winner's commands display
- `app/components/token-context.tsx` - LiveKit token management

## Environment Variables

Required environment variables:

```bash
# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

# OpenAI
OPENAI_API_KEY=

# OpenRouter (for VLM)
OPENROUTER_API_KEY=

# ChromaDB Cloud
CHROMADB_API_KEY=

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
```

## Important Implementation Notes

### VLM Configuration
- Default sample rate: 5 seconds (configurable via props)
  - **720 frames captured per hour** per active stream at default rate
- Default chunk duration: 1 minute (configurable via props)
- Batch size: 10 images per batch (hardcoded for cost optimization)
- Final summary: 7 sampled images (hardcoded for token limits)
- Chat message context: Includes winner's commands in analysis

### Performance & Scale
- **Bandwidth usage**: 7.52 GB in 6 hours (real production data)
- **API calls**: Hundreds of GPT-4o vision requests per hour
- **Storage**: Every chunk summary stored in ChromaDB with embeddings
- **Real-time processing**: Frame capture → vision analysis → storage pipeline runs continuously
- **Cost considerations**: This is an expensive operation at scale (OpenAI API + ChromaDB + LiveKit bandwidth)

### ChromaDB Best Practices
- Always use wallet address filtering for queries
- Store summaries immediately after chunk processing
- Embedding generation is automatic (handled by collection)
- Tenant ID: `15c4c4d6-de1d-42df-b08e-3a484a3498e5`
- Database: `humancapital`

### LiveKit Architecture
- VLM bot connects as hidden participant (`vlm-bot-{timestamp}`)
- Uses data messages for winner commands (type: "command-message")
- Room names match time slot format
- Token generation via `/api/join_stream`

### Sui Blockchain Architecture
- Smart contracts in `time_auction/sources/` (Move language)
- Package ID management via `scripts/update-package-id.js`
- Testnet deployment by default
- Auction lifecycle happens on-chain:
  - Time slot creation → NFT minting
  - Bid placement → transaction validation
  - Winner selection on-chain
  - Automatic finalization at slot start time
- No admin functions once deployed
- AI surveillance runs separately - doesn't affect auction outcomes

## Data Flow Summary

**When a stream starts:**
1. Streamer publishes video to LiveKit
2. VLM bot auto-joins room
3. Frame capture begins at configured interval
4. Each frame → GPT-4o → description stored in memory

**Every chunk interval (e.g., 1 minute):**
1. All frames batched into groups of 10
2. Each batch → GPT-4o → batch summary
3. 7 sampled frames + all batch summaries → GPT-4o → final summary
4. Final summary + metadata → ChromaDB (with embeddings)
5. Memory cleared, next chunk begins

**When someone searches history:**
1. Query → OpenAI embeddings
2. Vector search in ChromaDB (filtered by wallet)
3. Top results + context → GPT-4o-mini → critical analysis
4. Results + analysis displayed to user

This creates a **complete surveillance and data analysis pipeline** for tracking user behavior, task completion, and performance over time.

## Documentation Links
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenRouter API](https://openrouter.ai/docs)