# Text-to-Speech Setup

The streaming application now includes the ability to read admin messages aloud using either Deepgram TTS or the built-in Web Speech API.

## Features

- **Automatic Speech**: Admin messages from viewers are automatically read aloud
- **Toggle Control**: Streamers can enable/disable text-to-speech
- **Dual TTS**: Uses Deepgram for high-quality voices, with Web Speech API as fallback
- **Visual Indicator**: Checkbox shows current TTS status

## Setup Options

### Option 1: Deepgram TTS (Recommended)

For better voice quality and more voices, use Deepgram TTS:

1. **Get a Deepgram API Key**:

   - Sign up at [deepgram.com](https://deepgram.com)
   - Create a new API key in your dashboard
   - Note: Deepgram offers free tier with usage limits

2. **Add API Key to Environment**:

   Create or update your `.env.local` file:

   ```bash
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```

   **Important**: The API key is stored server-side only and never exposed to clients. Use `DEEPGRAM_API_KEY` (not `NEXT_PUBLIC_DEEPGRAM_API_KEY`) to keep it secure.

3. **Available Voices**:

   - `aura-asteria-en` (Female, English) - Default
   - `aura-luna-en` (Female, English)
   - `aura-stella-en` (Female, English)
   - `aura-athena-en` (Female, English)
   - `aura-hera-en` (Female, English)
   - `aura-orion-en` (Male, English)
   - `aura-arcas-en` (Male, English)
   - `aura-perseus-en` (Male, English)
   - `aura-angus-en` (Male, English)
   - `aura-orpheus-en` (Male, English)
   - `aura-helios-en` (Male, English)
   - `aura-zeus-en` (Male, English)

4. **Customize Voice**:

   Edit `lib/deepgram-tts.ts`:

   ```typescript
   export async function speakWithDeepgram({
     text,
     voice = "aura-zeus-en", // Change default voice here
     model = "aura",
   }: DeepgramTTSParams): Promise<void> {
     // ...
   }
   ```

### Option 2: Web Speech API (No Setup Required)

The application automatically falls back to the browser's built-in Web Speech API if:

- Deepgram API key is not configured
- Deepgram API call fails
- You prefer not to use an external service

**Advantages**:

- No API key needed
- Works offline
- Free
- Built into modern browsers

**Disadvantages**:

- Lower voice quality
- Limited voice options
- Less natural sounding
- Browser-dependent quality

## Usage

### As a Streamer

1. Start your stream at `/stream`
2. Check the "🔊 Read Messages Aloud" checkbox at bottom-left
3. When viewers send messages via Admin View, they will be read aloud
4. Uncheck the box to disable TTS

### Visual Controls

- **Toggle Checkbox**: Located at bottom-left of streaming page
- **Status**: Shows current TTS state (enabled/disabled)
- **Indicator**: 🔊 icon indicates speech feature

## Technical Details

### Implementation Files

- `app/api/tts/route.ts`: **Server-side API route** - Handles Deepgram requests securely
- `lib/deepgram-tts.ts`: Client-side TTS helper functions
- `app/stream/page.tsx`: Integration with streamer page

### How It Works

1. Viewer sends message via Admin View
2. Streamer receives message through LiveKit data channel
3. If TTS is enabled:
   - **Deepgram (Server-Side)**: Client calls `/api/tts` → Server calls Deepgram API → Returns audio
   - **Fallback**: If Deepgram fails, use Web Speech API (client-side)
4. Message is read aloud automatically
5. Audio plays while stream continues

### Architecture

```
Client (Browser) → /api/tts (Server) → Deepgram API → Audio → Client
                      ↑
              (API key stays here, secure!)
```

### Code Flow

```typescript
// When message received
if (readAloudEnabled) {
  // Try Deepgram first
  speakWithDeepgram({ text: message.message }).catch(() => {
    // Fallback to Web Speech
    speakWithWebSpeech(message.message);
  });
}
```

## Troubleshooting

### No Speech Despite Being Enabled

1. **Check Console**: Look for error messages
2. **Check API Key**: Ensure Deepgram key is in `.env.local`
3. **Browser Support**: Verify Web Speech API is supported
4. **Audio Permission**: Ensure browser has audio permissions
5. **Volume**: Check system/PC volume levels

### Deepgram Not Working

- Verify API key is correct in `.env.local`
- Check Deepgram account for usage limits
- Ensure internet connection is active
- Check Deepgram service status

### Web Speech API Not Working

- Try a different browser (Chrome, Edge, Safari work best)
- Check browser audio settings
- Ensure audio output device is working
- Try restarting browser

## Testing

1. Start a stream
2. Open viewer in another tab
3. Enable Admin View and send a test message
4. Message should be read aloud on streamer side
5. Test toggle on/off to verify control works

## Customization

### Change Speech Rate

Edit `lib/deepgram-tts.ts`:

```typescript
// For Web Speech API
utterance.rate = 1.2; // 1.0 = normal, >1.0 = faster, <1.0 = slower
```

### Change Voice Pitch

```typescript
utterance.pitch = 1.2; // 1.0 = normal, >1.0 = higher, <1.0 = lower
```

### Change Volume

```typescript
utterance.volume = 0.8; // 0.0 to 1.0
```

## Advanced: Custom Voices

### Deepgram Custom Model

Create your own voice on Deepgram platform and use custom model names.

### Browser Voice Selection

For Web Speech API, you can specify preferred voice:

```typescript
speakWithWebSpeech(message.message, "Google UK English Female");
```

Available voices vary by browser and system.

## Security Notes

- ✅ **Secure Implementation**: The Deepgram API key is stored server-side only
- ✅ **Server-Side API Route**: `app/api/tts/route.ts` handles all Deepgram requests
- ✅ **No Client Exposure**: The API key never leaves the server
- ✅ **Secure by Default**: Never commit `.env.local` to version control
- ✅ **Production Ready**: This implementation is safe for production use

## Cost Considerations

### Deepgram

- Free tier: 12,000 credits/month
- Charged per character of text
- See [Deepgram pricing](https://deepgram.com/pricing)

### Web Speech API

- Completely free
- No usage limits
- Works offline (limited)

## Future Enhancements

Potential improvements:

- Voice preview before selection
- Per-message mute/don't read options
- Speech queue for multiple rapid messages
- Different voices for different viewers
- Speech speed adjustment per stream
- Language detection and auto-translation
- Integration with streaming overlay for subtitles
