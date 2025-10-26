# Admin Fullscreen Viewer

This document describes the admin fullscreen viewer feature for the streaming application.

## Overview

The admin viewer provides streamers with a fullscreen, admin-specific view of their stream with additional controls and monitoring features not available to regular viewers.

## Files Created

### 1. `app/components/stream-player-admin.tsx`

Admin-specific stream player component with:

- **Orientation Detection**: Automatically detects and displays device orientation
- **Auto-hiding Controls**: Controls hide after 3 seconds for immersive viewing, tap to show
- **Participant Counter**: Shows number of active participants
- **Statistics Panel**: Toggle-able stats showing:
  - Room state
  - Video track count
  - Audio track count
  - Current orientation
- **Back Navigation**: Quick link to return to main stream page
- **Room Info Display**: Shows current room name

### 2. `app/stream/viewer/[roomname]/page.tsx`

Route handler for the admin viewer with dynamic room parameter:

- Connects as an admin using `create_stream` API (not `join_stream`)
- Provides admin privileges
- Auto-connects when room name is available from URL

## Route Structure

The admin viewer is accessible at:

```
/stream/viewer/[roomname]
```

Example:

```
/stream/viewer/0x1234567890abcdef
```

## Integration with Main Stream Page

The main stream page (`app/stream/page.tsx`) now includes a button to open the fullscreen admin viewer:

```tsx
<Link href={`/stream/viewer/${encodeURIComponent(roomName)}`}>
  Open Fullscreen Viewer
</Link>
```

## Features Comparison

| Feature               | Regular Viewer | Admin Viewer |
| --------------------- | -------------- | ------------ |
| Video display         | Yes            | Yes          |
| Audio playback        | Yes            | Yes          |
| Participant count     | No             | Yes          |
| Statistics            | No             | Yes          |
| Orientation indicator | No             | Yes          |
| Auto-hiding controls  | No             | Yes          |
| Admin controls        | No             | Yes          |
| Back navigation       | No             | Yes          |

## Usage Flow

1. Streamer starts a stream from `/stream`
2. Streamer clicks "Open Fullscreen Viewer" button
3. Navigates to `/stream/viewer/[roomname]`
4. Admin viewer connects to the same room with admin privileges
5. Streamer sees their stream in fullscreen with admin controls

## Technical Details

### Authentication

- Uses `create_stream` API endpoint (not `join_stream`)
- Creator identity set to "admin-viewer"
- Has full admin privileges in the room

### Orientation Handling

- Uses Screen Orientation API when available
- Falls back to `window.orientation` for older devices
- Automatically updates UI when device rotates

### Controls Behavior

- Tap anywhere on screen to toggle controls
- Controls auto-hide after 3 seconds
- Statistics panel toggleable via button

## Future Enhancements

Potential features to add:

- Chat integration
- Stream quality settings
- Recording controls
- Moderation tools
- Advanced analytics
- Stream health monitoring
