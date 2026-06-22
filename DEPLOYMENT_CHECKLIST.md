# HAKA Deployment Checklist

## Pre-Deployment

### Security
- [ ] Change `JWT_SECRET` to a strong random value
  ```bash
  openssl rand -hex 32
  ```
- [ ] Update `SUPABASE_SERVICE_ROLE_KEY` (never expose in client)
- [ ] Enable HTTPS on all endpoints
- [ ] Enable WSS (WebSocket Secure) for Socket.io
- [ ] Add rate limiting to API routes
- [ ] Set up CORS to only allow your domain

### Database
- [ ] Run migration script in production Supabase
- [ ] Verify all 9 tables are created
- [ ] Check indexes are created on:
  - messages(chat_id)
  - messages(sender_id)
  - messages(status)
  - chats(user_a_id, user_b_id)
- [ ] Verify foreign key relationships
- [ ] Test database connection from app

### Environment Variables
- [ ] Set production Supabase URL
- [ ] Set production Socket server URL
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Verify all `.env.local` variables are set on server
- [ ] Never commit secrets to git

### Application
- [ ] Test signup/login flow
- [ ] Test message sending/receiving
- [ ] Test status indicators
- [ ] Test typing indicators
- [ ] Test privacy settings
- [ ] Test offline queue
- [ ] Test all error scenarios

## Frontend Deployment (Vercel)

### Build
```bash
pnpm build
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No console warnings

### Vercel Setup
- [ ] Create project at vercel.com
- [ ] Connect GitHub repository
- [ ] Set environment variables in Vercel dashboard:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_SOCKET_URL
  JWT_SECRET (if needed in client)
  NEXT_PUBLIC_APP_URL
  ```

### Deploy
```bash
vercel --prod
```

- [ ] Deployment successful
- [ ] Preview URL works
- [ ] Production URL accessible
- [ ] SSL certificate valid

## Socket.io Server Deployment

### Choose Platform
- [ ] Decided on deployment platform:
  - [ ] Railway.app (recommended for quick setup)
  - [ ] Render.com
  - [ ] AWS EC2
  - [ ] DigitalOcean
  - [ ] Heroku

### Railway.app Setup (if chosen)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

- [ ] Login to Railway dashboard
- [ ] Create new project
- [ ] Link to GitHub repository
- [ ] Set environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  JWT_SECRET
  NEXT_PUBLIC_APP_URL
  NODE_ENV=production
  PORT=3001
  ```
- [ ] Deploy starts automatically
- [ ] Server runs on provided domain

### Update Frontend
- [ ] Update `NEXT_PUBLIC_SOCKET_URL` in Vercel to Socket server production URL
- [ ] Redeploy frontend

## Production Configuration

### Socket.io Server (server.js)

Update CORS origin in production:
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true,
  },
});
```

- [ ] CORS configured for production domain
- [ ] SSL/TLS enabled
- [ ] WebSocket Secure (WSS) configured

### Database Security

In Supabase:
- [ ] Enable Row-Level Security (RLS) on all tables
- [ ] Create RLS policies for:
  - Users can only read their own data
  - Chats visible only to participants
  - Messages visible only to chat participants
- [ ] Verify service role key is not exposed in client

### Rate Limiting

Add rate limiting to Socket.io server:
```javascript
const io = new Server(httpServer, {
  // ... other config
  transports: ['websocket', 'polling'],
  perMessageDeflate: false,
  maxHttpBufferSize: 1e6, // 1MB
});

// Add rate limit middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify token and rate limit
  next();
});
```

- [ ] Rate limiting implemented
- [ ] Limits tested

### Monitoring & Logging

Set up error tracking:
- [ ] Sentry integration (optional)
  ```bash
  npm i @sentry/nextjs
  ```
- [ ] Server logs configured
- [ ] Database query logging enabled
- [ ] Error alerts set up

### SSL/TLS Certificate

- [ ] HTTPS enabled on frontend (automatic on Vercel)
- [ ] WSS (Secure WebSocket) enabled on Socket server
- [ ] Certificate renewal automated
- [ ] Certificate expiration monitoring set up

## Testing in Production

### User Flows
- [ ] Sign up new account
- [ ] Login existing account
- [ ] Create chat
- [ ] Send message
- [ ] Receive message
- [ ] Verify status indicators
- [ ] Test typing indicators
- [ ] Disable read receipts
- [ ] Test multi-tab login

### Error Scenarios
- [ ] Test disconnect/reconnect
- [ ] Test with network latency
- [ ] Test with bad network
- [ ] Test database timeout
- [ ] Test invalid token
- [ ] Test rate limiting

### Performance
- [ ] Page load time < 3s
- [ ] Message delivery < 500ms
- [ ] Socket connection < 1s
- [ ] Monitor CPU/memory usage
- [ ] Monitor database connection pool

## Post-Deployment

### Monitoring

Set up alerts for:
- [ ] Application errors
- [ ] High CPU usage (> 80%)
- [ ] High memory usage (> 80%)
- [ ] Database connection failures
- [ ] WebSocket disconnections

### Backup & Disaster Recovery

- [ ] Enable Supabase backups
- [ ] Set backup frequency (daily recommended)
- [ ] Test backup restoration
- [ ] Document recovery procedure
- [ ] Have rollback plan ready

### Maintenance

- [ ] Schedule regular updates
- [ ] Monitor dependency security
  ```bash
  npm audit
  pnpm audit
  ```
- [ ] Keep Socket.io updated
- [ ] Keep Supabase client updated
- [ ] Monitor TypeScript/Node versions

### Documentation

- [ ] Document production URLs
- [ ] Document admin procedures
- [ ] Document troubleshooting guide
- [ ] Document team access procedures
- [ ] Create runbook for on-call

## Performance Optimization

### Frontend (Vercel)
- [ ] Enable Code Splitting
- [ ] Enable Image Optimization
- [ ] Enable Cache-Control headers
- [ ] Monitor Core Web Vitals

### Backend (Socket.io)
- [ ] Enable message compression
- [ ] Configure socket ping/pong
- [ ] Set connection timeout
- [ ] Enable connection pooling for DB

### Database (Supabase)
- [ ] Create indexes on frequently queried fields
- [ ] Monitor slow queries
- [ ] Optimize connection pool size
- [ ] Enable query caching if needed

## Security Hardening

- [ ] Enable 2FA on Supabase account
- [ ] Enable 2FA on Vercel account
- [ ] Enable 2FA on Railway/Render account
- [ ] Rotate credentials regularly
- [ ] Audit access logs
- [ ] Enable DDoS protection if needed
- [ ] Set up intrusion detection

## Compliance & Legal

- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policy documented
- [ ] User data deletion procedure
- [ ] Encryption compliance verified

## Handoff Checklist

If handing off to team:
- [ ] Document all URLs (frontend, backend, database)
- [ ] Share environment variable access
- [ ] Grant database access
- [ ] Grant deployment access
- [ ] Provide admin credentials securely
- [ ] Train on monitoring tools
- [ ] Set up on-call schedule
- [ ] Document escalation procedures

## Post-Launch Support

- [ ] Monitor error rates for 24 hours
- [ ] Be ready for quick patches
- [ ] Monitor user feedback
- [ ] Track performance metrics
- [ ] Plan for updates/maintenance

## Version Control

- [ ] Tag production release in git
  ```bash
  git tag -a v1.0.0-production -m "Production release"
  git push origin v1.0.0-production
  ```
- [ ] Document deployment notes
- [ ] Update CHANGELOG.md
- [ ] Create branch for production fixes

## Success Criteria

Production deployment is successful when:
- [x] Frontend loads at production URL
- [x] Users can register and login
- [x] Users can send/receive messages
- [x] Message status indicators work
- [x] Typing indicators work
- [x] Privacy settings work
- [x] No console errors
- [x] No server logs errors
- [x] Database connectivity stable
- [x] WebSocket connections stable
- [x] Response times < 1s
- [x] 99.9% uptime achieved

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Production URL**: _______________

**Notes**: 
