# HAKA Project Structure

Complete overview of the HAKA encrypted chat application architecture and file organization.

## Directory Tree

```
haka-chat-app/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── auth/
│   │   │   ├── signup/route.ts       # User registration
│   │   │   └── login/route.ts        # User authentication
│   │   ├── chats/route.ts            # List and create chats
│   │   ├── messages/
│   │   │   ├── route.ts              # Fetch messages with pagination
│   │   │   └── batch-read/route.ts   # Batch mark messages as read
│   │   └── privacy-settings/route.ts # Get/update privacy settings
│   ├── auth/
│   │   ├── login/page.tsx            # Login page
│   │   └── signup/page.tsx           # Registration page
│   ├── chat/page.tsx                 # Main chat interface
│   ├── settings/page.tsx             # Privacy settings page
│   ├── layout.tsx                    # Root layout with Socket provider
│   ├── page.tsx                      # Home redirect
│   └── globals.css                   # Global styles
├── components/                       # React Components
│   ├── ChatWindow.tsx                # Main chat UI (285 lines)
│   ├── MessageBubble.tsx             # Message display with status (119 lines)
│   └── TypingIndicator.tsx           # Typing animation (33 lines)
├── hooks/                            # Custom React Hooks
│   ├── useChat.ts                    # Chat state management (219 lines)
│   ├── useOnlineStatus.ts            # Online status tracking (115 lines)
│   └── usePrivacySettings.ts         # Privacy settings management (120 lines)
├── lib/                              # Utilities and Services
│   ├── auth.ts                       # Auth utilities (56 lines)
│   ├── encryption.ts                 # E2E encryption (131 lines)
│   ├── socket-context.tsx            # Socket.io provider (108 lines)
│   ├── types.ts                      # TypeScript definitions (227 lines)
│   ├── message-utils.ts              # Message utilities (232 lines)
│   └── offline-queue.ts              # Offline message queue (187 lines)
├── scripts/                          # Database Scripts
│   └── 01_init_haka_schema.sql       # Database schema (223 lines)
├── public/                           # Static assets
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   ├── icon.svg
│   └── apple-icon.png
├── server.js                         # Socket.io server (386 lines)
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── next.config.mjs                   # Next.js config
├── tailwind.config.ts                # Tailwind CSS config
├── postcss.config.js                 # PostCSS config
├── .env.example                      # Environment template
├── .gitignore
├── HAKA_README.md                    # Full documentation
├── SETUP_GUIDE.md                    # Step-by-step setup
├── QUICK_START.md                    # 5-minute quick start
├── IMPLEMENTATION_SUMMARY.md         # Implementation details
├── DEPLOYMENT_CHECKLIST.md           # Production checklist
└── PROJECT_STRUCTURE.md              # This file
```

## Technology Stack

```
Frontend:
├── Framework: Next.js 16
├── Runtime: React 19.2
├── Styling: TailwindCSS v4
├── UI Components: shadcn/ui + Radix UI
├── Real-time: Socket.io client v4.7
├── HTTP: Supabase client
├── Date Handling: date-fns
├── Forms: React Hook Form
└── Utilities: lodash, zod

Backend:
├── Server: Express.js
├── Real-time: Socket.io v4.7
├── Authentication: JWT + Bcryptjs
├── Database: Supabase (PostgreSQL)
├── Encryption: TweetNaCl.js
├── CORS: cors package
└── Runtime: Node.js 18+

Development:
├── Language: TypeScript 5.7
├── Bundler: Turbopack (Next.js default)
├── Linting: ESLint
├── Package Manager: pnpm
└── React Compiler: Stable
```

## Data Flow Diagrams

### Authentication Flow

```
┌─────────────┐                ┌──────────────────┐
│   Client    │                │  Backend API     │
│  (Browser)  │                │  (Next.js)       │
└──────┬──────┘                └────────┬─────────┘
       │                               │
       │ 1. Signup Request             │
       ├──────────────────────────────>│
       │    { email, username,         │
       │      password }               │
       │                               │
       │ 2. Hash password              │
       │ 3. Generate keypair           │ ┌──────────────┐
       │ 4. Store in DB ───────────────┼─>│  Supabase    │
       │                               │  │  Database    │
       │ 5. Generate JWT               │  └──────────────┘
       │                               │
       │ 6. Signup Response            │
       │<──────────────────────────────┤
       │    { token, user, device }    │
       │                               │
       │ 7. Store auth data            │
       │    localStorage.setItem       │
       │                               │
       │ 8. Connect to Socket.io       │
       ├──────────────────────────────>│ ┌─────────────┐
       │    { token }                  ├─>│  Socket.io   │
       │ (Socket Connection)           │  │  Server      │
       │                               │  └─────────────┘
       │ 9. Socket Connected           │
       │<──────────────────────────────┤
       │                               │
```

### Message Lifecycle Flow

```
┌──────────────┐              ┌─────────────┐              ┌──────────────┐
│  Sender App  │              │Socket Server│              │Recipient App │
└──────┬───────┘              └──────┬──────┘              └──────┬───────┘
       │                             │                            │
       │ 1. User types message       │                            │
       │    handleTyping()           │                            │
       │                             │                            │
       │ 2. Emit typing_start        │                            │
       ├────────────────────────────>│                            │
       │    { chatId }               │ 3. Broadcast typing       │
       │    (debounced 300-500ms)    ├───────────────────────────>│
       │                             │                            │ Render:
       │                             │                            │ "User typing..."
       │ 4. User sends message       │                            │
       │    sendMessage()            │                            │
       │                             │                            │
       │ 5. Emit typing_stop         │                            │
       ├────────────────────────────>│                            │
       │                             │ 6. Broadcast typing stop  │
       │                             ├───────────────────────────>│
       │                             │                            │ Hide indicator
       │                             │                            │
       │ 7. Emit send_message        │                            │
       ├────────────────────────────>│                            │
       │    { chatId,                │ 8. Store in DB            │
       │      encryptedMessage,      ├─┐ (status: 'sent')        │
       │      messageType }          │ │                          │
       │                             │ │ 9. Emit                 │
       │ 10. Receive                 │ │    message_sent_ack     │
       │ message_sent_ack ◄──────────┤ │ (✔ single tick)        │
       │ (status: sent/✔)            │ │                          │
       │ [✔ sent]                    │ │                          │
       │                             │ │ 10. Emit                │
       │                             │ │ receive_message         │
       │                             │ ├──────────────────────────>
       │                             │                            │ 11. Receive
       │                             │                            │ message
       │                             │                            │ (status: ?)
       │ 12. Receive                 │                            │
       │ message_delivered ◄─────────┤─ 13. Emit                │
       │ (status: delivered)         │  message_delivered        │
       │ [✔✔ grey ticks]             │  (✔✔ delivered)          │
       │                             │                            │
       │                             │ 14. Update status         │ 15. Auto mark
       │                             │ in DB: 'delivered'        │ as read
       │                             │ Update delivered_at       │ (after 500ms)
       │                             │                           │
       │                             │                           ├─┐ Emit
       │                             │                           │ │ message_read
       │                             │                           │ │
       │ 16. Receive                 │ 17. Emit                 │
       │ message_read ◄──────────────┤     message_read         │
       │ (status: read)              │ (only if                  │
       │ [✔✔ blue ticks]             │  read_receipts_enabled)  │
       │                             │                          │
       │                             │ 18. Update status        │
       │                             │ in DB: 'read'            │
       │                             │ Update read_at           │
       │                             │                          │
```

## API Endpoints

### Authentication
```
POST /api/auth/signup
  Request:  { email, username, password, deviceName }
  Response: { user, device, token }

POST /api/auth/login
  Request:  { email, password, deviceName }
  Response: { user, device, token }
```

### Chats
```
GET /api/chats
  Headers:  Authorization: Bearer <token>
  Response: { chats: Chat[] }

POST /api/chats
  Headers:  Authorization: Bearer <token>
  Request:  { recipientId }
  Response: { chat: Chat }
```

### Messages
```
GET /api/messages
  Headers:  Authorization: Bearer <token>
  Query:    chatId, limit=50, offset=0
  Response: { messages: Message[] }

POST /api/messages/batch-read
  Headers:  Authorization: Bearer <token>
  Request:  { messageIds: string[], chatId }
  Response: { success, marked, timestamp }
```

### Privacy Settings
```
GET /api/privacy-settings
  Headers:  Authorization: Bearer <token>
  Response: { userId, readReceiptsEnabled, ... }

PUT /api/privacy-settings
  Headers:  Authorization: Bearer <token>
  Request:  { readReceiptsEnabled?, typingIndicatorsEnabled?, ... }
  Response: { success, settings }
```

## Socket.io Events

### Client → Server
```javascript
// Connection
connect_user(token)

// Messages
send_message({ chatId, encryptedMessage, messageType, fileUrl })
message_delivered({ messageId, chatId })
message_read({ messageIds, chatId })

// Typing
typing_start({ chatId })
typing_stop({ chatId })

// Presence
user_online()
```

### Server → Client
```javascript
// Connection
connect              // Automatic
disconnect           // Automatic

// Messages
receive_message({ messageId, chatId, senderId, encryptedMessage, ... })
message_sent_ack({ messageId, status })
message_delivered({ messageId, status })
message_read({ messageIds, status })

// Typing
user_typing({ userId, chatId, isTyping })

// Presence
user_online({ userId, timestamp })
user_offline({ userId, timestamp })

// Errors
connect_error(error)
error(error)
```

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  avatar_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chats (1-to-1 only)
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES users(id),
  user_b_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- Messages with lifecycle
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  encrypted_message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  file_url TEXT,
  status VARCHAR(20) DEFAULT 'sent',  -- sent, delivered, read
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Multi-device support
CREATE TABLE user_devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  device_name VARCHAR(100),
  device_type VARCHAR(50),  -- mobile, web, desktop
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP,
  socket_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Typing indicators
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id UUID NOT NULL REFERENCES user_devices(id),
  started_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_id, user_id, device_id)
);

-- Privacy settings
CREATE TABLE user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  read_receipts_enabled BOOLEAN DEFAULT TRUE,
  typing_indicators_enabled BOOLEAN DEFAULT TRUE,
  online_status_visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Supporting tables
CREATE TABLE message_read_receipts (...)
CREATE TABLE deleted_messages (...)
CREATE TABLE sessions (...)
```

## Component Hierarchy

```
<RootLayout>
  <SocketProvider>
    <Route: "/">
      <Redirect to /login or /chat>
    
    <Route: "/login">
      <LoginPage>
        <Input: email>
        <Input: password>
        <Button: Login>
    
    <Route: "/signup">
      <SignupPage>
        <Input: email>
        <Input: username>
        <Input: password>
        <Button: Sign up>
    
    <Route: "/chat">
      <ChatPage>
        <Sidebar>
          <UserInfo>
          <NewChatButton>
          <ChatList>
            <ChatItem>
              <ChatName>
              <LastMessage>
        <ChatWindow>
          <Header>
            <RecipientName>
            <OnlineStatus>
          <MessageContainer>
            <MessageBubble>
              <Message>
              <Status: ✔/✔✔/>
              <Timestamp>
            <TypingIndicator>
          <InputArea>
            <TextInput>
            <SendButton>
    
    <Route: "/settings">
      <SettingsPage>
        <Header>
        <AccountInfo>
        <PrivacySettings>
          <ToggleSwitch: ReadReceipts>
          <ToggleSwitch: TypingIndicators>
          <ToggleSwitch: OnlineStatus>
        <AboutSection>
```

## State Management

### React Context
- `SocketContext` - Socket.io connection state

### React Hooks
- `useState` - Local component state
- `useEffect` - Side effects
- `useCallback` - Memoized callbacks
- `useRef` - Persistent values

### Custom Hooks
- `useChat()` - Message lifecycle
- `useOnlineStatus()` - Presence tracking
- `usePrivacySettings()` - Settings management

### Persistence
- `localStorage` - Auth data, offline queue
- `Supabase` - All persistent data

## Deployment Targets

```
Frontend (Next.js):
  Development: http://localhost:3000
  Production: Vercel (vercel.com)

Backend (Socket.io):
  Development: http://localhost:3001
  Production: 
    - Railway.app (recommended)
    - Render.com
    - AWS EC2
    - DigitalOcean
    - Heroku

Database:
  Development: Supabase free tier
  Production: Supabase paid tier or managed

Encryption:
  Algorithm: XSalsa20-Poly1305 (NaCl)
  Implementation: TweetNaCl.js
```

## Key Files by Function

### Authentication
- `lib/auth.ts` - JWT and password utilities
- `app/api/auth/*.ts` - Auth endpoints
- `app/login/page.tsx` - Login UI
- `app/signup/page.tsx` - Signup UI

### Messaging
- `app/api/messages/*.ts` - Message endpoints
- `components/ChatWindow.tsx` - Chat UI
- `components/MessageBubble.tsx` - Message UI
- `lib/message-utils.ts` - Message utilities
- `server.js` - Socket event handling

### Encryption
- `lib/encryption.ts` - TweetNaCl integration
- `components/ChatWindow.tsx` - Encryption in chat

### Real-time
- `server.js` - Socket.io server
- `lib/socket-context.tsx` - Socket provider
- `hooks/useChat.ts` - Chat state
- `hooks/useOnlineStatus.ts` - Presence

### Privacy
- `app/api/privacy-settings/*.ts` - Settings API
- `app/settings/page.tsx` - Settings UI
- `hooks/usePrivacySettings.ts` - Settings management

## File Size Summary

```
Source Code:
- React Components: ~400 lines
- Custom Hooks: ~450 lines
- API Routes: ~480 lines
- Utilities: ~850 lines
- Socket.io Server: ~400 lines

Total: ~2,600 lines of application code
Total: ~4,500 lines including docs and examples
```

This structure provides clear separation of concerns with scalable architecture for adding features like group chats, voice calls, and more.
