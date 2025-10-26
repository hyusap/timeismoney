# Quick Start: Testing TTS Feature

## How to Test That Messages Are Read Aloud

### Step 1: Start a Stream

1. Navigate to `/stream` in your browser
2. Connect your wallet
3. Click "Start Stream"
4. Your stream is now live!

### Step 2: Enable Text-to-Speech

- Look at the **bottom-left corner** of the streaming page
- You'll see a checkbox: "🔊 Read Messages Aloud"
- **Make sure it's checked** ✅

### Step 3: Send a Test Message

1. Open a **new tab/window** and go to `/viewer`
2. Enter the room name from your stream
3. Click "Join Stream"
4. In the top-right corner, click **"Admin View"** button
5. Type a test message in the chat box (e.g., "Hello streamer!")
6. Click "Send" or press Enter

### Step 4: Verify It Works

On the **streamer page**, you should:

- ✅ See a **blue notification box** appear with the message
- ✅ **Hear the message read aloud** (via TTS)
- ✅ See the message counter increment

## Options for TTS

### Option 1: Web Speech API (Works Immediately)

- No setup required
- Works automatically as fallback
- Browser's built-in voice
- Good for testing

### Option 2: Deepgram (Better Quality)

1. Get API key from https://deepgram.com
2. Add to `.env.local`:
   ```bash
   DEEPGRAM_API_KEY=your_key_here
   ```
3. Restart dev server
4. Voices will be higher quality

## Troubleshooting

### Not Hearing Anything?

1. **Check the checkbox**: Make sure "🔊 Read Messages Aloud" is checked
2. **Check system volume**: Is your computer's volume up?
3. **Check browser**: Chrome, Edge, and Safari work best
4. **Check console**: Open browser console (F12) and look for errors

### Console Errors?

**"Deepgram API key not configured"** → This is OK! It will use Web Speech API instead

**"Web Speech API not supported"** → Try a different browser

**Network errors** → Check your internet connection

## What to Expect

### When Working Correctly:

1. Message appears in blue notification box
2. Message is read aloud automatically
3. Console shows: "📨 Admin message received from viewer: [message]"
4. Notification auto-hides after 5 seconds
5. Message counter shows total messages received

### Visual Indicators:

- **Blue notification**: Message received
- **Checkbox**: TTS enabled/disabled
- **Message counter**: Number of messages received
- **Console log**: Confirms message received

## Quick Test Commands

Try sending these messages:

- "Test message"
- "Can you hear me?"
- "This is a longer message to test reading aloud"
- "123 456 789"

## Need Help?

- Check `TTS_SETUP.md` for detailed setup
- Check browser console for errors
- Ensure checkbox is enabled
- Try Web Speech API first (no setup)
