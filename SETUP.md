# Multi-Stream Video Platform Setup

This is a Next.js application that allows multiple users to stream video and others to watch all streams simultaneously using LiveKit.

## Features

- **Streaming Page** (`/stream`): Users can start streaming their video
- **Viewer Page** (`/viewer`): Watch all active streams in a grid layout
- **Real-time**: All streams are live and synchronized
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Set up LiveKit

You need a LiveKit server to handle the video streams. You can either:

#### Option A: Use LiveKit Cloud (Recommended for development)

1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Get your API key, API secret, and WebSocket URL

#### Option B: Self-host LiveKit

1. Follow the [LiveKit self-hosting guide](https://docs.livekit.io/deploy/)
2. Set up your own LiveKit server

### 3. Environment Variables

Create a `.env.local` file in the root directory with:

```env
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_WS_URL=wss://your-livekit-instance.com
```

### 4. Run the Application

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **To Stream**: Go to `/stream` and enter your name and room name
2. **To Watch**: Go to `/viewer` and enter the same room name
3. Multiple streamers can join the same room
4. Viewers will see all active streams in a grid layout

## Architecture

- **Frontend**: Next.js with React components
- **Video Streaming**: LiveKit for real-time video communication
- **Styling**: Tailwind CSS for modern UI
- **API Routes**: Next.js API routes for token generation

## File Structure

```
app/
├── page.tsx              # Homepage with navigation
├── stream/page.tsx       # Streaming interface
├── viewer/page.tsx       # Multi-stream viewer
└── api/token/route.ts    # LiveKit token generation

lib/
└── livekit.ts           # LiveKit configuration and token generation
```

## Troubleshooting

- Make sure your LiveKit server is running and accessible
- Check that environment variables are correctly set
- Ensure your browser allows camera/microphone permissions
- For production deployment, use HTTPS (required for camera access)
