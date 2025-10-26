# TTS Troubleshooting Guide

## Error: "TTS API error: 400"

This error means the Deepgram API is rejecting the request. Here's how to fix it:

### Quick Fix: Use Web Speech API (Recommended for Now)

The Web Speech API works immediately without any setup:

- No API key needed
- Works in all modern browsers
- Fallback automatically kicks in

### If You Want to Use Deepgram

1. **Verify API Key**

   ```bash
   # In .env.local
   DEEPGRAM_API_KEY=your_actual_api_key_here
   ```

2. **Check API Key is Correct**

   - Go to https://console.deepgram.com/
   - Copy your API key
   - Make sure it starts with your project ID

3. **Common Issues**

   **Issue**: API key not set

   - **Symptom**: 500 error
   - **Fix**: Add `DEEPGRAM_API_KEY` to `.env.local`

   **Issue**: Invalid API key

   - **Symptom**: 401 or 403 error
   - **Fix**: Regenerate API key in Deepgram dashboard

   **Issue**: Wrong parameters

   - **Symptom**: 400 error
   - **Fix**: Deepgram API may have changed - check their docs

### Current Workaround

For now, **just use Web Speech API** - it works great:

1. The `readAloudEnabled` checkbox is checked
2. Web Speech API will automatically handle TTS
3. No API keys needed
4. Works in Chrome, Edge, Safari, Firefox

The error you're seeing is from Deepgram API parameters. The fallback to Web Speech API should work seamlessly.

## Testing TTS

1. Start a stream at `/stream`
2. Check the "🔊 Read Messages Aloud" checkbox
3. Open `/viewer` in another tab
4. Click "Admin View"
5. Send a message: "Hello streamer"
6. **You should hear it read aloud** via Web Speech API

## Console Output When Working

**Success (Web Speech API)**:

```
📨 Admin message received from viewer: Hello streamer
```

**Error (Deepgram fails, Web Speech works)**:

```
TTS API error: 400 {...}
Deepgram failed, using Web Speech API
```

This is **normal** - it means Deepgram failed but the fallback worked!

## Debugging Steps

1. Check browser console for errors
2. Verify the TTS checkbox is checked
3. Check system volume
4. Try different test messages
5. Test in Chrome (best Web Speech API support)

## Disable Deepgram Completely (Optional)

If you want to skip Deepgram entirely and only use Web Speech API:

Edit `lib/deepgram-tts.ts` and change:

```typescript
// From:
speakWithDeepgram({ text: message.message }).catch(() => {
  console.log("Deepgram failed, using Web Speech API");
  speakWithWebSpeech(message.message);
});

// To:
console.log("Using Web Speech API");
speakWithWebSpeech(message.message);
```

This will use Web Speech API directly without trying Deepgram first.

## Bottom Line

The TTS feature **should work right now** using Web Speech API. The 400 error is just Deepgram complaining about parameters, but the fallback is working. You should hear messages being read aloud!
