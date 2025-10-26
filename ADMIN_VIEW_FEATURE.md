# Admin View Feature

## Overview

The regular viewer now has an "Admin View" mode that allows viewers to send messages directly to the streamer. This feature enables communication between viewers and streamers during live streams.

## How It Works

### For Viewers

1. **Access Admin View**: While watching a stream, click the "Admin View" button in the top-right corner
2. **Send Messages**: Type your message in the chat input and click "Send" or press Enter
3. **View History**: See all messages you've sent in the "Sent Messages" section
4. **Exit Admin View**: Click "Exit Admin View" to return to normal viewing mode

### Features

- **Chat Interface**: Clean, user-friendly chat panel that overlays the video
- **Message History**: All sent messages are displayed in chronological order
- **Enter to Send**: Press Enter key to quickly send messages
- **Real-time Communication**: Messages are sent via LiveKit's data channel for reliable delivery
- **Non-intrusive**: Can be toggled on/off without affecting the video stream

## Technical Implementation

### Message Flow

```
Viewer → StreamPlayer Component → LiveKit Data Channel → All Room Participants (including Streamer)
```

### Components Modified

#### `app/components/stream-player.tsx`

- Added "Admin View" toggle button
- Implemented chat interface with input and send functionality
- Added message history display
- Integrated with LiveKit's `publishData` API for data transmission

### Data Structure

Messages are sent as JSON:

```json
{
  "type": "admin-message",
  "message": "Hello streamer!",
  "timestamp": 1234567890
}
```

## Text-to-Speech Feature

✅ **Implemented**: Messages can now be read aloud automatically!

The streamer can enable text-to-speech to have incoming admin messages read aloud:

- Toggle control at bottom-left of streamer page
- Uses Deepgram TTS for high-quality voices
- Falls back to browser's Web Speech API if Deepgram unavailable
- See `TTS_SETUP.md` for detailed setup instructions

### Quick Setup

To use Deepgram TTS:

1. Get API key from [deepgram.com](https://deepgram.com)
2. Add to `.env.local`: `DEEPGRAM_API_KEY=your_key` (server-side only, secure!)
3. Enable checkbox on streamer page
4. Messages will be read aloud automatically

The Web Speech API works without any setup as a fallback option.

## Future Enhancements

Potential improvements for this feature:

1. **Voice Selection**: Allow streamers to choose from available voices
2. **Speech Speed Control**: Adjust how fast messages are read
3. **Message Queue**: Handle multiple rapid messages gracefully
4. **Message Receipt Confirmation**: Show when messages are delivered
5. **Read Receipts**: Indicate if the streamer has seen the message
6. **Message Filtering**: Allow streamers to filter/administer incoming messages
7. **Persistent History**: Save message history across sessions
8. **Threaded Replies**: Enable streamers to reply directly to messages
9. **Custom Styling**: Allow streamers to customize the appearance of admin messages
10. **Priority Levels**: Add different message priority levels
11. **Spam Protection**: Implement rate limiting for messages
12. **Rich Media**: Support for images, links, or other media in messages

## Usage Tips

### For Viewers

- Use clear, concise messages for better communication
- Be respectful when communicating with streamers
- Messages are visible to the streamer in real-time

### For Streamers

- Listen for data channel messages of type 'admin-message'
- Consider displaying important admin messages on screen
- Can implement custom filtering or moderation logic

## Streamer Integration (IMPLEMENTED)

✅ **The streamer now automatically receives and displays admin messages!**

The streamer page (`app/stream/page.tsx`) has been updated to:

- Listen for data channel messages from viewers
- Display incoming messages in a prominent notification
- Show message count on the streaming interface
- Auto-hide messages after 5 seconds
- Allow manual dismissal of message notifications

### How It Works

When a viewer sends a message via Admin View:

1. The message is sent through LiveKit's data channel
2. The streamer receives the message via `room.on("dataReceived")`
3. A notification appears at the top of the streamer's screen
4. The notification shows the latest message with an emoji indicator
5. The streamer can dismiss it or let it auto-hide after 5 seconds

### What You'll See

As a streamer, you will see:

- **Blue notification box** appearing at the top-right with the message
- **Message counter** showing how many messages you've received
- **Console log** with "📨 Admin message received from viewer: [message]"

The notification looks like this:

```
💬 Message from Viewer:
Hello streamer! [×]
```
