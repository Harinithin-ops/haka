# HAKA Setup Guide

Complete step-by-step guide to set up and run the HAKA encrypted chat application.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account (free tier available at supabase.com)
- Two terminal windows or tabs

## Step 1: Environment Configuration

### 1.1 Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings → API
3. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Create `.env.local`

In the project root, create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Socket.io Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_URL=http://localhost:3001

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-key-change-this-in-production

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 2: Database Setup

### 2.1 Run Migration Script

The database schema is automatically created when the app starts. However, you can manually execute the SQL script:

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of `scripts/01_init_haka_schema.sql`
4. Paste into SQL editor
5. Click "Run"

Expected output: All tables, indexes, and functions created successfully.

### 2.2 Verify Database Schema

In Supabase SQL Editor, run:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- `users`
- `chats`
- `messages`
- `user_devices`
- `typing_indicators`
- `user_privacy_settings`
- `deleted_messages`
- `sessions`
- `message_read_receipts`

## Step 3: Installation

### 3.1 Install Dependencies

```bash
pnpm install
```

This installs all required packages including:
- Socket.io (real-time)
- TweetNaCl.js (encryption)
- Bcryptjs (password hashing)
- Supabase client
- Express server

## Step 4: Running the Application

### Terminal 1: Next.js Frontend

```bash
pnpm dev
```

Expected output:
```
  ▲ Next.js 16.1.6
  - Local: http://localhost:3000
```

The frontend will be available at `http://localhost:3000`

### Terminal 2: Socket.io Server

```bash
node server.js
```

Expected output:
```
🚀 HAKA Socket.io server running on port 3001
```

Both servers must be running simultaneously for the app to work.

## Step 5: Testing the Application

### 5.1 Create Test Accounts

1. Go to `http://localhost:3000`
2. Click "Sign up"
3. Create first account:
   - Email: `alice@test.com`
   - Username: `alice`
   - Password: `test1234`

4. Open new browser tab/window (or incognito)
5. Go to `http://localhost:3000`
6. Sign up second account:
   - Email: `bob@test.com`
   - Username: `bob`
   - Password: `test1234`

### 5.2 Test Messaging

1. In Alice's browser:
   - Click "New Chat"
   - Enter `bob@test.com`
   - Click "Start Chat"

2. Send a message: "Hello Bob!"

3. Verify in Bob's browser:
   - Bob receives the message
   - Message status shows: ✔ (sent)

4. Bob sends reply: "Hi Alice!"

5. Verify in Alice's browser:
   - Message shows: ✔✔ grey (delivered)
   - When Alice opens chat: ✔✔ blue (read)

### 5.3 Test Typing Indicators

1. In Alice's browser:
   - Start typing in message input
   - In Bob's browser, you should see "alice is typing..."

2. Stop typing for 3 seconds
   - Typing indicator disappears in Bob's view

## Step 6: Troubleshooting

### Issue: "Socket connection failed"

**Solution**: Make sure Socket.io server is running on port 3001
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

### Issue: "Supabase connection error"

**Solution**: Verify environment variables:
```bash
# Check .env.local exists and has correct values
cat .env.local

# Should contain:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

### Issue: "Messages not delivering"

**Solution**: Check browser console for errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors starting with `[Socket]` or `[Chat]`
4. Check that both servers are running

### Issue: "Decryption failed"

**Solution**: This usually means encryption keys don't match:
1. Clear browser localStorage: `localStorage.clear()`
2. Logout and login again
3. Create new chat

## Step 7: Production Deployment

### 7.1 Environment Variables

Before deploying, set these in production:

```bash
# Use strong random JWT secret
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# Update Socket.io URL to production domain
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.com

# Production Supabase URL (same, but ensure HTTPS)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 7.2 Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 7.3 Deploy Socket.io Server

Options:
1. **Railway.app**: `railway up`
2. **Render.com**: Connect GitHub repo
3. **AWS EC2**: Deploy Node.js directly
4. **DigitalOcean App Platform**: Similar to Render

### 7.4 Update CORS Settings

In `server.js`, update CORS origin:
```javascript
cors: {
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
},
```

## Step 8: Monitoring

### Check Logs

Frontend logs:
```bash
# In terminal running pnpm dev
# Look for [Socket], [Chat], [Auth] prefixed messages
```

Server logs:
```bash
# In terminal running node server.js
# Look for [Socket] prefixed messages
```

### Database Monitoring

In Supabase Dashboard:
- Go to "Database" → "Inspect"
- View table sizes and query performance
- Monitor for errors

## Step 9: Features to Test

### Core Features
- [ ] User registration
- [ ] User login
- [ ] Create chat
- [ ] Send messages
- [ ] Message status (✔ → ✔✔ grey → ✔✔ blue)
- [ ] Typing indicators
- [ ] Multi-device login

### Privacy Features
- [ ] Disable read receipts
- [ ] Disable typing indicators
- [ ] Hide online status
- [ ] Settings page persistence

### Advanced Features
- [ ] Offline message queue
- [ ] Message pagination
- [ ] User online/offline status
- [ ] Auto-reconnection

## Next Steps

After successful setup, consider:

1. **Production hardening**:
   - Enable HTTPS/WSS
   - Add rate limiting
   - Set up monitoring

2. **Feature additions**:
   - Message reactions
   - File uploads
   - Voice calls
   - Group chats

3. **Performance optimization**:
   - Implement message caching
   - Add Redis for sessions
   - Enable CDN for static assets

## Getting Help

If you encounter issues:

1. Check logs in both terminals
2. Review `HAKA_README.md` for architecture details
3. Look at error messages in browser console
4. Verify all environment variables are set correctly
5. Ensure database migration ran successfully

## Quick Reference

```bash
# Install dependencies
pnpm install

# Run frontend (Terminal 1)
pnpm dev

# Run Socket.io server (Terminal 2)
node server.js

# View frontend
open http://localhost:3000

# Stop servers
Ctrl+C in each terminal

# Clear database and start fresh
# Delete project in Supabase, create new one
```
