# HAKA Quick Start

Get HAKA running in 5 minutes.

## TL;DR

```bash
# 1. Install dependencies
pnpm install

# 2. Set up .env.local (see below)

# 3. Terminal 1: Start Next.js
pnpm dev

# 4. Terminal 2: Start Socket.io
node server.js

# 5. Open http://localhost:3000
```

## Environment Setup

Create `.env.local` in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_URL=http://localhost:3001
JWT_SECRET=dev-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Get Supabase Credentials
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API → Copy the keys

## Database Setup

1. Go to Supabase SQL Editor
2. Copy contents of `scripts/01_init_haka_schema.sql`
3. Paste and execute
4. Done!

## Test It

### Account 1
- Go to http://localhost:3000
- Sign up: `alice@test.com` / `test1234`

### Account 2 (new tab)
- Go to http://localhost:3000
- Sign up: `bob@test.com` / `test1234`

### Send Message
1. In Alice's chat: Click "New Chat" → `bob@test.com`
2. Send: "Hello Bob!"
3. In Bob's chat: Receive message (✔ sent)
4. See in Alice's chat: (✔✔ blue = read)

## What You Get

- ✅ Real-time 1-to-1 encrypted chat
- ✅ Message status: sent (✔) → delivered (✔✔) → read (✔✔ blue)
- ✅ Typing indicators
- ✅ Multi-device sync
- ✅ Privacy settings
- ✅ End-to-end encryption (TweetNaCl.js)
- ✅ Offline message queue

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Socket not connecting | Ensure `node server.js` is running on port 3001 |
| Database error | Run migration script in Supabase SQL Editor |
| Messages not received | Check both terminals for errors, look at browser console |
| Port already in use | Change port in code or kill existing process |

## File Structure

```
├── app/
│   ├── api/                 # Backend API routes
│   ├── auth/                # Auth pages
│   ├── chat/                # Chat interface
│   ├── settings/            # Privacy settings
│   └── page.tsx             # Home redirect
├── components/              # React components
│   ├── ChatWindow.tsx       # Main chat UI
│   ├── MessageBubble.tsx    # Message display
│   └── TypingIndicator.tsx  # Typing status
├── lib/
│   ├── auth.ts              # Auth utilities
│   ├── encryption.ts        # E2E encryption
│   ├── socket-context.tsx   # Socket provider
│   └── types.ts             # TypeScript types
├── scripts/
│   └── 01_init_haka_schema.sql  # Database schema
├── server.js                # Socket.io server
└── README.md                # Full documentation
```

## Key Endpoints

```
Frontend:     http://localhost:3000
Socket Server: ws://localhost:3001
API Routes:
  POST /api/auth/signup          - Register
  POST /api/auth/login           - Login
  GET  /api/chats                - List chats
  POST /api/chats                - Create chat
  GET  /api/messages             - Get messages
  POST /api/messages/batch-read  - Mark as read
  GET  /api/privacy-settings     - Get settings
  PUT  /api/privacy-settings     - Update settings
```

## Socket Events

```javascript
// Client sends
socket.emit('send_message', { chatId, encryptedMessage })
socket.emit('message_delivered', { messageId, chatId })
socket.emit('message_read', { messageIds, chatId })
socket.emit('typing_start', { chatId })
socket.emit('typing_stop', { chatId })

// Server sends
socket.on('receive_message', (data) => {...})
socket.on('message_sent_ack', (data) => {...})
socket.on('message_delivered', (data) => {...})
socket.on('message_read', (data) => {...})
socket.on('user_typing', (data) => {...})
socket.on('user_online', (data) => {...})
socket.on('user_offline', (data) => {...})
```

## Next Steps

1. Read full docs: See `HAKA_README.md`
2. Setup guide: See `SETUP_GUIDE.md`
3. Deploy: Push to Vercel + deploy Socket server
4. Customize: Modify theme, add features, etc.

## Support

- Check browser console (F12) for errors
- Check terminal logs for Socket.io errors
- Review `HAKA_README.md` troubleshooting section
- Check Supabase dashboard for database issues

Happy chatting! 🚀
