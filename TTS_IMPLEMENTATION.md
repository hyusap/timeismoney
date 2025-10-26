# TTS Implementation Summary

## ✅ Fixed Implementation

The TTS feature now uses the **official Deepgram SDK** for reliable text-to-speech.

### What Was Fixed

1. **Updated API Endpoint** (`app/api/tts/route.ts`)

   - Now uses `@deepgram/sdk` instead of raw fetch
   - Uses correct Deepgram API format
   - Streams audio directly (no base64 conversion needed)
   - Model: `aura-2-thalia-en` (female English voice)

2. **Updated Client** (`lib/deepgram-tts.ts`)

   - Simplified to use streaming audio blob
   - Removed complex base64 conversion
   - Proper error handling with fallback

3. **Installed Dependencies**
   - `@deepgram/sdk` - Official Deepgram SDK

## How It Works

```
Viewer sends message
  ↓
Streamer receives via LiveKit data channel
  ↓
Client calls /api/tts with message text
  ↓
Server uses @deepgram/sdk to generate audio
  ↓
Returns audio stream to client
  ↓
Client plays audio via Web Audio API
  ↓
Fallback to Web Speech API if Deepgram fails
```

## Setup

### 1. Environment Variable

```bash
# .env.local
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### 2. Test It

1. Start stream at `/stream`
2. Enable "🔊 Read Messages Aloud" checkbox
3. Open `/viewer` in another tab
4. Click "Admin View"
5. Send message: "Hello streamer"
6. Should hear audio via Deepgram TTS!

## Available Voices

The implementation uses `aura-2-thalia-en` by default. You can change it by modifying:

**In `app/api/tts/route.ts`:**

```typescript
const { text, model = "aura-2-thalia-en" } = await request.json();
```

**Available models:**

- `aura-2-thalia-en` (Female, English) - Default
- `aura-2-athena-en` (Female, English)
- `aura-2-hera-en` (Female, English)
- `aura-2-orion-en` (Male, English)
- `aura-2-zeus-en` (Male, English)
- `aura-2-arcas-en` (Male, English)
- `aura-2-perseus-en` (Male, English)
- And more - see [Deepgram docs](https://developers.deepgram.com/reference/text-to-speech)

**Or change per-request in the client:**

```typescript
speakWithDeepgram({
  text: message.message,
  model: "aura-2-zeus-en", // Different voice
});
```

## Fallback Behavior

If Deepgram fails (no API key, network error, etc.), it automatically falls back to Web Speech API:

```typescript
speakWithDeepgram({ text: message.message }).catch(() => {
  console.log("Deepgram failed, using Web Speech API");
  speakWithWebSpeech(message.message);
});
```

## Troubleshooting

### "Deepgram API key not configured"

- Add `DEEPGRAM_API_KEY` to `.env.local`
- Restart dev server

### "TTS API error: 500"

- Check if API key is valid
- Check Deepgram account for usage limits

### Audio not playing

- Check system volume
- Check browser console for errors
- Try Web Speech API fallback
- Test with Chrome/Edge (best support)

## Benefits of This Implementation

✅ **Official SDK** - Uses Deepgram's official SDK for reliability  
✅ **Streaming** - Audio streams directly, no base64 overhead  
✅ **Secure** - API key stays server-side only  
✅ **Fallback** - Web Speech API if Deepgram fails  
✅ **Caching** - Proper cache headers for audio  
✅ **Production Ready** - Error handling and logging

## Files Changed

- `app/api/tts/route.ts` - Server-side TTS endpoint
- `lib/deepgram-tts.ts` - Client-side TTS helper
- `app/stream/page.tsx` - Integration with streamer page
- `package.json` - Added `@deepgram/sdk` dependency

## Next Steps (Optional)

- Add voice selector in UI
- Add speech speed control
- Add volume control
- Cache audio for repeated phrases
- Add different voices per message type
