# HAKA - Secure 1-to-1 Encrypted Chat

A WhatsApp-level encrypted chat application with complete message lifecycle tracking, real-time typing indicators, and multi-device synchronization.

## Features

### Core Messaging
- **End-to-End Encryption**: All messages encrypted using TweetNaCl.js (XSalsa20-Poly1305 AEAD)
- **Message Lifecycle Tracking**:
  - ✔ Sent - Message stored in database
  - ✔✔ Delivered - Message received by recipient's device
  - ✔✔ (blue) Read - Message opened by recipient
- **Real-time Delivery**: Socket.io server handles live message transmission
- **Message Types**: Text, images, audio, and file attachments

### Advanced Features
- **Typing Indicators**: Shows when recipient is typing with animated dots
- **Multi-device Sync**: Same user can login on multiple devices, all receive updates
- **Privacy Settings**: Users can disable read receipts and typing indicators
- **Message Pagination**: Lazy-load old messages for performance
- **Offline Handling**: Messages queued when offline, delivered on reconnection
- **Batch Operations**: Batch mark messages as read for efficiency

## Architecture

### Tech Stack
- **Frontend**: Next.js 16, React 19, TailwindCSS, shadcn/ui
- **Backend**: Express + Socket.io (Node.js server)
- **Database**: Supabase (PostgreSQL)
- **Encryption**: TweetNaCl.js (NaCl crypto library)
- **Authentication**: JWT tokens with secure storage

### Database Schema

#### `users`
- `id` - UUID primary key
- `email` - User email (unique)
- `username` - Display name
- `password_hash` - Bcrypt hashed password
- `public_key` - Base64 encoded TweetNaCl public key
- `is_online` - Online status
- `created_at`, `updated_at` - Timestamps

#### `chats`
- `id` - UUID primary key
- `user_a_id`, `user_b_id` - Participant IDs (1-to-1 only)
- `created_at`, `updated_at` - Timestamps
- Unique constraint on normalized participant IDs

#### `messages`
- `id` - UUID primary key
- `chat_id` - Reference to chat
- `sender_id` - Message sender
- `encrypted_message` - Base64 encoded encrypted content
- `message_type` - 'text', 'image', 'audio', 'file'
- `status` - 'sent', 'delivered', 'read'
- `delivered_at`, `read_at` - Timestamps
- Indexes on `chat_id`, `sender_id`, `status`

#### `user_devices`
- `id` - UUID primary key
- `user_id` - User who owns device
- `device_name` - User-friendly name
- `device_type` - 'mobile', 'web', 'desktop'
- `is_active` - Whether device is actively connected
- `socket_id` - Current Socket.io connection ID
- `last_activity_at` - Last activity timestamp

#### `user_privacy_settings`
- `user_id` - User reference
- `read_receipts_enabled` - Show read status to others
- `typing_indicators_enabled` - Show typing status
- `online_status_visible` - Show online/offline status

### Socket.io Events

#### Connection Events
- `connect_user` - User connects with JWT
- `user_online` - Broadcast when user comes online
- `user_offline` - Broadcast when user goes offline

#### Message Events
- `send_message` - Send encrypted message
- `message_sent_ack` - Acknowledge message stored (✔)
- `receive_message` - Receive message from peer
- `message_delivered` - Mark as delivered (✔✔ grey)
- `message_read` - Mark as read (✔✔ blue)

#### Typing Events
- `typing_start` - Start typing (debounced 300-500ms)
- `typing_stop` - Stop typing or timeout
- `user_typing` - Receive typing status from peer

## Setup & Installation

### Prerequisites
- Node.js 18+ and pnpm
- Supabase project (create at supabase.com)
- Environment variables configured

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Socket.io Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
JWT_SECRET=your-secret-key-change-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialize Database

The database schema is defined in `scripts/01_init_haka_schema.sql`. Run it in your Supabase SQL editor or via:
```bash
pnpm exec supabase db push
```

### 4. Run Development

In separate terminals:

**Terminal 1 - Next.js Frontend** (port 3000):
```bash
pnpm dev
```

**Terminal 2 - Socket.io Server** (port 3001):
```bash
node server.js
```

## Message Lifecycle Flow

```
User A sends message
         ↓
Message encrypted with User B's public key
         ↓
Sent to Socket.io server via Socket.io
         ↓
Server stores in database (status: 'sent')
         ↓
Emit 'message_sent_ack' to User A
         ↓
User A sees: ✔ (single grey tick)
         ↓
[If User B is online]
         ↓
Socket.io delivers to User B's device(s)
         ↓
User B device receives, emits 'message_delivered'
         ↓
Server updates status to 'delivered'
         ↓
Emit to User A: ✔✔ (double grey tick)
         ↓
User A sees: ✔✔
         ↓
[User B opens chat or chat is active]
         ↓
Frontend detects visibility, emits 'message_read'
         ↓
Server checks privacy settings (read_receipts_enabled)
         ↓
[If enabled] Update status to 'read'
         ↓
Emit to User A: ✔✔ (double BLUE tick)
         ↓
User A sees: ✔✔ (blue)
```

## Encryption Details

### Key Generation
- User creates keypair on signup using `nacl.box.keyPair()`
- Public key stored in database
- Secret key stored securely in client (localStorage or secure storage)

### Message Encryption
```typescript
const encrypted = encryptMessage(
  message,           // Plaintext message
  recipientPublicKey, // Recipient's public key (base64)
  senderSecretKey    // Sender's secret key (base64)
)
// Returns: { ciphertext, nonce, publicKey }
```

### Message Decryption
```typescript
const plaintext = decryptMessage(
  encryptedMessage,   // { ciphertext, nonce, publicKey }
  recipientSecretKey, // Own secret key (base64)
  senderPublicKey     // Sender's public key (base64)
)
```

## Typing Indicators

- Debounced at 300-500ms to reduce server load
- Auto-stops after 3 seconds of inactivity
- Disabled if user has `typing_indicators_enabled: false`
- Shows animated dots while remote user is typing

## Privacy & Security

### Read Receipts
- Controlled by `user_privacy_settings.read_receipts_enabled`
- When disabled, sender only sees ✔✔ (never blue)
- Server-side enforcement prevents spoofing

### Multi-device Security
- Each device gets unique JWT token
- Messages synced to all active devices
- Device-level read receipts tracked separately

### Password Security
- Bcryptjs with salt rounds 10
- Never transmitted in plain text
- Verified via bcryptjs comparison

### JWT Tokens
- Expire after 7 days
- Include userId, deviceId, email
- Must include in Socket.io auth header

## Performance Optimizations

1. **Message Pagination**: Load 50 messages at a time, lazy-load on scroll
2. **Typing Debounce**: 300-500ms reduces event frequency
3. **Batch Read Receipts**: Mark multiple as read in single DB call
4. **Database Indexes**: On chat_id, sender_id, status for fast queries
5. **Socket.io Rooms**: Users join room-specific namespaces
6. **React Memoization**: MessageBubble components memoized to prevent re-renders

## Error Handling

### Network Errors
- Automatic reconnection with exponential backoff
- Message queue stored until reconnection
- User notified of connection status

### Decryption Failures
- Logged but don't break chat experience
- Corrupted messages shown as [Unable to decrypt]
- Prevents one bad message from breaking entire chat

### Rate Limiting
- Socket.io events rate-limited to prevent abuse
- Status updates limited per user/message

## TODO / Future Enhancements

1. **Client-side Encryption**: Move encryption to frontend before sending
2. **Message Reactions**: Add emoji reactions to messages
3. **Message Search**: Search in encrypted messages (via metadata)
4. **Voice Calls**: WebRTC peer connections
5. **Group Chats**: Extend to group messaging
6. **Message Pinning**: Pin important messages
7. **Auto-delete Messages**: Ephemeral messages
8. **User Blocking**: Block and unblock users
9. **Message Editing**: Edit sent messages
10. **Message Deletion**: Delete for self or everyone

## Testing

### Manual Testing
1. Sign up two users
2. Start chat between them
3. Send message, verify status progression: ✔ → ✔✔ → ✔✔ (blue)
4. Test typing indicators in real-time
5. Test disconnect/reconnect flow
6. Verify privacy settings work

### Unit Tests
```bash
pnpm test
```

## Deployment

### Production Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Set NEXT_PUBLIC_SOCKET_URL to production Socket.io server
- [ ] Enable HTTPS/WSS for encrypted connections
- [ ] Configure Supabase row-level security policies
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Set up error tracking (Sentry)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
