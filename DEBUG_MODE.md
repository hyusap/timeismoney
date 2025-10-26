# 🐛 Debug Mode - Real-time Blockchain & System Status

## Overview

A comprehensive debug overlay that provides real-time visibility into blockchain state, time slots, streaming status, and active instructions.

---

## Features

### 🎯 **System Status Dashboard**
- **Blockchain Health**: Connection status and package ID
- **Wallet Info**: Connected wallet address
- **Current Time**: Live timestamp updates every second

### 🔴 **Active Slot Monitor**
When a time slot is currently active:
- Slot ID and details
- Winner/current bidder
- Time remaining in slot
- Current instructions being displayed

### 📹 **Streaming Status**
- Live/Offline indicator
- Room name
- Streaming state

### ⏰ **Time Slots List**
Real-time view of all time slots:
- **Status badges**:
  - 🔴 LIVE - Currently active
  - 🟢 BIDDING - Auction open
  - 🟡 CLOSED - Auction ended, awaiting slot start
  - ⚫ DONE - Slot completed
- Start time
- Current bid amount
- Winner address
- Time until slot starts

---

## How to Use

### Opening Debug Mode

**Option 1: Click Button**
- Look for the purple `🐛 DEBUG` button in the bottom-left corner
- Click to open

**Option 2: Keyboard Shortcut**
- Press `Ctrl+D` from anywhere

### Closing Debug Mode

**Option 1: Click Button**
- Click the red `✕ CLOSE` button in top-right

**Option 2: Keyboard Shortcut**
- Press `ESC` key

---

## Where It's Available

✅ **Streamer View** (`/stream`)
- Shows your own time slots
- Active instructions you need to follow
- Your streaming status

✅ **Viewer View** (`/view/[roomname]`)
- Shows streamer's time slots
- Your bidding status
- Active slot info

---

## Auto-Refresh

When debug mode is open:
- **Time slots refresh every 5 seconds**
- **Current time updates every second**
- **Manual refresh button available**

---

## What You Can Debug

### 1. **NFT Minting Issues**
- Check if NFTs were actually created on blockchain
- Verify slot count and timing
- See blockchain connection status

### 2. **Timing Issues**
- Compare current time with slot start times
- See exact countdown to next slot
- Verify 1-minute slot duration

### 3. **Bidding Issues**
- See current bid amounts
- Check who won each slot
- Verify auction status

### 4. **Instructions Issues**
- See active instructions in real-time
- Check which slot is currently active
- Verify winner matches expected address

### 5. **Streaming Issues**
- Confirm streaming status
- Check room name matches wallet address
- Verify wallet connection

---

## Visual Design

**Purple theme** for debug mode:
- Purple header with 🐛 bug icon
- Dark background overlay
- Color-coded status indicators:
  - 🟢 Green = Good/Active
  - 🔴 Red = Live/Warning
  - 🟡 Yellow = Pending
  - ⚫ Gray = Completed/Inactive

---

## Example Use Cases

### **Scenario 1: Testing 1-Minute Slots**
1. Open debug mode
2. Mint NFTs
3. Watch time slots appear in list
4. See countdown to next slot
5. Verify slot goes LIVE at exact time

### **Scenario 2: Verifying Instructions**
1. Place bid and win slot
2. Set instructions
3. Open debug mode
4. Wait for slot to start
5. See instructions appear in "Active Slot" section
6. Verify they match what you set

### **Scenario 3: Debugging Failed Mint**
1. Try to mint NFTs
2. Transaction fails
3. Open debug mode
4. Check "Blockchain" status
5. See if any slots were created
6. Verify package ID is correct

---

## Technical Details

**File**: `app/components/debug-overlay.tsx`

**Props**:
- `roomName` - Streamer wallet address
- `currentInstructions` - Active instructions text
- `currentWinner` - Current slot winner address
- `slotEndTime` - When current slot ends
- `isStreaming` - Whether stream is live

**Blockchain Queries**:
- Uses `queryTimeSlotsByOwner()` to fetch all slots
- Queries every 5 seconds when open
- Filters and sorts by start time

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+D` | Open debug mode |
| `ESC` | Close debug mode |

---

## Performance

- Minimal impact when closed (just a small button)
- Only queries blockchain when open
- Auto-refresh can be paused by closing overlay

---

## Future Enhancements (Optional)

- [ ] Export logs to file
- [ ] Network latency metrics
- [ ] Transaction history
- [ ] Gas cost tracking
- [ ] VLM monitor integration
- [ ] LiveKit connection stats

---

## Troubleshooting

**Debug mode won't open?**
- Make sure you're on `/stream` or `/view/[roomname]` page
- Check browser console for errors

**No time slots showing?**
- Verify wallet is connected
- Check that NFTs were minted
- Click "🔄 Refresh" button

**Active slot not updating?**
- Wait for 5-second auto-refresh
- Manually click refresh
- Check system time is correct

---

## Tips

💡 **Keep it open while testing** - Set it to the side and watch slots update in real-time

💡 **Use with browser dev tools** - Compare blockchain data with console logs

💡 **Screenshot for bug reports** - Capture exact state when issues occur

💡 **Monitor during minting** - Watch slots appear on blockchain in real-time

---

**Debug mode makes testing 1-minute slots much easier! 🎉**
