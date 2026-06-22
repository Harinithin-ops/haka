// HAKA Chat App - Socket.io Server
// Real-time message delivery, typing indicators, and status tracking

import fs from 'fs';
import path from 'path';

// Load .env.local programmatically for independent socket server process
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      // Clean comments and whitespace
      const cleanedLine = line.trim();
      if (!cleanedLine || cleanedLine.startsWith('#')) return;
      
      const match = cleanedLine.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn('[Socket] Failed to load .env.local:', e.message);
}

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Store connected users and their devices
const connectedUsers = new Map(); // userId -> Set of device objects
const userSockets = new Map(); // socketId -> { userId, deviceId }
const typingUsers = new Map(); // chatId -> Set of userId

// JWT verification middleware
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
  } catch (error) {
    console.error('[Socket] JWT verification failed:', error.message);
    return null;
  }
};

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return next(new Error('Authentication error: Invalid token'));
  }

  socket.userId = decoded.userId;
  socket.deviceId = decoded.deviceId;
  next();
});

// Socket.io connection handlers
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.userId}, Socket: ${socket.id}`);

  // Store user connection
  if (!connectedUsers.has(socket.userId)) {
    connectedUsers.set(socket.userId, new Set());
  }
  connectedUsers.get(socket.userId).add({
    socketId: socket.id,
    deviceId: socket.deviceId,
  });
  userSockets.set(socket.id, {
    userId: socket.userId,
    deviceId: socket.deviceId,
  });

  // Broadcast user online status
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    timestamp: new Date().toISOString(),
  });

  // Mark pending/sent messages as delivered on connect
  const markOfflineMessagesAsDelivered = async () => {
    try {
      const { data: userChats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .or(`user_a_id.eq.${socket.userId},user_b_id.eq.${socket.userId}`);

      if (chatsError) {
        console.error('[Socket] Error fetching user chats on connect:', chatsError);
        return;
      }

      if (userChats && userChats.length > 0) {
        const chatIds = userChats.map((c) => c.id);

        const { data: undeliveredMessages, error: messagesError } = await supabase
          .from('messages')
          .select('id, sender_id, chat_id')
          .in('chat_id', chatIds)
          .neq('sender_id', socket.userId)
          .eq('status', 'sent');

        if (messagesError) {
          console.error('[Socket] Error fetching undelivered messages:', messagesError);
          return;
        }

        if (undeliveredMessages && undeliveredMessages.length > 0) {
          const undeliveredIds = undeliveredMessages.map((m) => m.id);

          await supabase
            .from('messages')
            .update({
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            })
            .in('id', undeliveredIds);

          undeliveredMessages.forEach((msg) => {
            const senderSockets = connectedUsers.get(msg.sender_id) || new Set();
            senderSockets.forEach(({ socketId }) => {
              io.to(socketId).emit('message_delivered', {
                messageId: msg.id,
                status: 'delivered',
              });
            });
          });

          console.log(`[Socket] Marked ${undeliveredIds.length} offline messages as delivered for user ${socket.userId}`);
        }
      }
    } catch (err) {
      console.error('[Socket] Exception in marking offline messages:', err);
    }
  };

  markOfflineMessagesAsDelivered();

  // Handle new chat creation event
  socket.on('new_chat', (data) => {
    const { chat, recipientId } = data;
    console.log(`[Socket] Forwarding new_chat event from ${socket.userId} to recipient ${recipientId}`);
    const receiverSockets = connectedUsers.get(recipientId) || new Set();
    receiverSockets.forEach(({ socketId }) => {
      io.to(socketId).emit('new_chat', { chat });
    });
  });

  // ==================== MESSAGE EVENTS ====================

  // Handle sending message
  socket.on('send_message', async (data) => {
    const { chatId, encryptedMessage, messageType = 'text', fileUrl, tempId, replyToMessageId } = data;

    try {
      // Validate chat ownership
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      const receiverId =
        chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

      // Store message in database (status: sent)
      const insertData = {
        chat_id: chatId,
        sender_id: socket.userId,
        encrypted_message: encryptedMessage,
        message_type: messageType,
        file_url: fileUrl,
        status: 'sent',
        created_at: new Date().toISOString(),
      };
      if (replyToMessageId) insertData.reply_to_message_id = replyToMessageId;

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single();

      if (msgError) {
        socket.emit('error', { message: 'Failed to send message' });
        return;
      }

      // Emit sent acknowledgement to sender with tempId for matching
      socket.emit('message_sent_ack', {
        messageId: message.id,
        tempId,
        status: 'sent',
        replyToMessageId: replyToMessageId || null,
      });

      // Fetch reply message content so receiver can render the reply quote bubble
      let replyMsg = null;
      if (replyToMessageId) {
        try {
          const { data: replyData } = await supabase
            .from('messages')
            .select('id, encrypted_message, sender_id, message_type, file_url, is_deleted')
            .eq('id', replyToMessageId)
            .single();
          if (replyData) replyMsg = replyData;
        } catch (e) {
          console.warn('[Socket] Could not fetch reply message:', e.message);
        }
      }

      // Emit message to receiver (includes full replyMsg so they can render the quote)
      const receiverSockets = connectedUsers.get(receiverId) || new Set();
      receiverSockets.forEach(({ socketId }) => {
        io.to(socketId).emit('receive_message', {
          messageId: message.id,
          chatId,
          senderId: socket.userId,
          encryptedMessage,
          messageType,
          fileUrl,
          createdAt: message.created_at,
          replyToMessageId: replyToMessageId || null,
          replyMsg,
        });
      });

      console.log(`[Socket] Message sent from ${socket.userId} to ${receiverId}`);
    } catch (error) {
      console.error('[Socket] Error sending message:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // Handle message edit
  socket.on('edit_message', async (data) => {
    const { messageId, chatId, text } = data;
    try {
      // Verify ownership
      const { data: msg } = await supabase
        .from('messages')
        .select('sender_id, is_deleted')
        .eq('id', messageId)
        .single();

      if (!msg || msg.sender_id !== socket.userId || msg.is_deleted) {
        socket.emit('error', { message: 'Cannot edit this message' });
        return;
      }

      await supabase
        .from('messages')
        .update({ encrypted_message: text, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      // Get chat participants to notify
      const { data: chat } = await supabase
        .from('chats')
        .select('user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      const receiverId = chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

      // Notify sender
      socket.emit('message_edited', { messageId, chatId, text, isEdited: true });

      // Notify receiver
      const receiverSockets = connectedUsers.get(receiverId) || new Set();
      receiverSockets.forEach(({ socketId }) => {
        io.to(socketId).emit('message_edited', { messageId, chatId, text, isEdited: true });
      });

      console.log(`[Socket] Message ${messageId} edited by ${socket.userId}`);
    } catch (error) {
      console.error('[Socket] Error editing message:', error);
    }
  });

  // Handle message deletion (soft delete)
  socket.on('delete_message', async (data) => {
    const { messageId, chatId } = data;
    try {
      // Verify ownership
      const { data: msg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (!msg || msg.sender_id !== socket.userId) {
        socket.emit('error', { message: 'Cannot delete this message' });
        return;
      }

      await supabase
        .from('messages')
        .update({ is_deleted: true, encrypted_message: 'This message was deleted', file_url: null, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      // Get chat participants to notify
      const { data: chat } = await supabase
        .from('chats')
        .select('user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      const receiverId = chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

      // Notify sender
      socket.emit('message_deleted', { messageId, chatId, isDeleted: true });

      // Notify receiver
      const receiverSockets = connectedUsers.get(receiverId) || new Set();
      receiverSockets.forEach(({ socketId }) => {
        io.to(socketId).emit('message_deleted', { messageId, chatId, isDeleted: true });
      });

      console.log(`[Socket] Message ${messageId} deleted by ${socket.userId}`);
    } catch (error) {
      console.error('[Socket] Error deleting message:', error);
    }
  });

  // Handle message reaction (emoji)
  socket.on('message_reaction', async (data) => {
    const { messageId, chatId, emoji } = data;
    try {
      // Validate chat ownership
      const { data: chat } = await supabase
        .from('chats')
        .select('user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      if (!chat) return;

      const receiverId = chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

      // Fetch current reactions from DB (if column exists)
      let currentReactions = {};
      const { data: msg, error: fetchErr } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchErr) {
        // reactions column likely doesn't exist yet — continue with optimistic state
        console.warn('[Socket] ⚠️  Could not fetch reactions from DB (column may be missing). Proceeding with optimistic state. Run: ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT \'{}\';');
      } else if (msg && msg.reactions) {
        currentReactions = typeof msg.reactions === 'string'
          ? JSON.parse(msg.reactions)
          : msg.reactions;
      }

      // Toggle reaction: same emoji again = remove, different = replace
      if (currentReactions[socket.userId] === emoji) {
        delete currentReactions[socket.userId];
      } else {
        currentReactions[socket.userId] = emoji;
      }

      // Persist to database (best effort — won't block broadcast)
      const { error: updateError } = await supabase
        .from('messages')
        .update({ reactions: currentReactions })
        .eq('id', messageId);

      if (updateError) {
        console.warn('[Socket] ⚠️  Could not save reaction to DB:', updateError.message);
      } else {
        console.log(`[Socket] ✅ Saved reaction "${emoji}" for message ${messageId} by ${socket.userId}`);
      }

      // ALWAYS broadcast to both participants regardless of DB save result
      const payload = { messageId, chatId, userId: socket.userId, emoji, reactions: currentReactions };
      socket.emit('message_reaction', payload);
      const receiverSockets = connectedUsers.get(receiverId) || new Set();
      receiverSockets.forEach(({ socketId }) => {
        io.to(socketId).emit('message_reaction', payload);
        console.log(`[Socket] 📤 Reaction broadcast to receiver socket ${socketId}`);
      });

      console.log(`[Socket] Reaction "${emoji}" broadcast to ${receiverSockets.size} receiver socket(s)`);

    } catch (error) {
      console.error('[Socket] Error in message_reaction:', error);
    }
  });


  // Handle message delivered acknowledgement
  socket.on('message_delivered', async (data) => {
    const { messageId, chatId } = data;

    try {
      // Update message status to delivered
      await supabase
        .from('messages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      // Get message sender
      const { data: message } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (message) {
        // Emit delivered status to sender
        const senderSockets = connectedUsers.get(message.sender_id) || new Set();
        senderSockets.forEach(({ socketId }) => {
          io.to(socketId).emit('message_delivered', {
            messageId,
            status: 'delivered',
          });
        });
      }

      console.log(`[Socket] Message ${messageId} marked as delivered`);
    } catch (error) {
      console.error('[Socket] Error marking message delivered:', error);
    }
  });

  // Handle message read acknowledgement
  socket.on('message_read', async (data) => {
    const { messageIds, chatId } = data; // Can batch mark as read

    try {
      // Get privacy settings
      const { data: privacySettings } = await supabase
        .from('user_privacy_settings')
        .select('read_receipts_enabled')
        .eq('user_id', socket.userId)
        .single();

      if (!privacySettings?.read_receipts_enabled) {
        console.log(`[Socket] User ${socket.userId} has read receipts disabled`);
        return;
      }

      // Batch update messages to read status
      const messageIdArray = Array.isArray(messageIds) ? messageIds : [messageIds];

      await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .in('id', messageIdArray);

      // Get message senders and notify
      const { data: messages } = await supabase
        .from('messages')
        .select('id, sender_id')
        .in('id', messageIdArray);

      if (messages) {
        const senderIds = new Set(messages.map((m) => m.sender_id));
        senderIds.forEach((senderId) => {
          const senderSockets = connectedUsers.get(senderId) || new Set();
          const messagesFromSender = messages
            .filter((m) => m.sender_id === senderId)
            .map((m) => m.id);

          senderSockets.forEach(({ socketId }) => {
            io.to(socketId).emit('message_read', {
              messageIds: messagesFromSender,
              status: 'read',
            });
          });
        });
      }

      console.log(`[Socket] Batch marked ${messageIdArray.length} messages as read`);
    } catch (error) {
      console.error('[Socket] Error marking messages as read:', error);
    }
  });

  // ==================== TYPING INDICATORS ====================

  socket.on('typing_start', async (data) => {
    const { chatId } = data;

    try {
      // Add to typing set
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      typingUsers.get(chatId).add(socket.userId);

      // Get receiver
      const { data: chat } = await supabase
        .from('chats')
        .select('id, user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      if (chat) {
        const receiverId =
          chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

        // Emit typing indicator to receiver
        const receiverSockets = connectedUsers.get(receiverId) || new Set();
        receiverSockets.forEach(({ socketId }) => {
          io.to(socketId).emit('user_typing', {
            userId: socket.userId,
            chatId,
            isTyping: true,
          });
        });
      }

      console.log(`[Socket] User ${socket.userId} started typing in ${chatId}`);
    } catch (error) {
      console.error('[Socket] Error handling typing_start:', error);
    }
  });

  socket.on('typing_stop', async (data) => {
    const { chatId } = data;

    try {
      // Remove from typing set
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(socket.userId);
        if (typingUsers.get(chatId).size === 0) {
          typingUsers.delete(chatId);
        }
      }

      // Get receiver
      const { data: chat } = await supabase
        .from('chats')
        .select('id, user_a_id, user_b_id')
        .eq('id', chatId)
        .single();

      if (chat) {
        const receiverId =
          chat.user_a_id === socket.userId ? chat.user_b_id : chat.user_a_id;

        // Emit typing stop to receiver
        const receiverSockets = connectedUsers.get(receiverId) || new Set();
        receiverSockets.forEach(({ socketId }) => {
          io.to(socketId).emit('user_typing', {
            userId: socket.userId,
            chatId,
            isTyping: false,
          });
        });
      }

      console.log(`[Socket] User ${socket.userId} stopped typing in ${chatId}`);
    } catch (error) {
      console.error('[Socket] Error handling typing_stop:', error);
    }
  });

  // ==================== CONNECTION EVENTS ====================

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`[Socket] User disconnected: ${socket.userId}, Socket: ${socket.id}`);

    const user = userSockets.get(socket.id);
    if (user) {
      userSockets.delete(socket.id);

      // Remove from connected users
      if (connectedUsers.has(user.userId)) {
        connectedUsers.get(user.userId).forEach((device) => {
          if (device.socketId === socket.id) {
            connectedUsers.get(user.userId).delete(device);
          }
        });

        // If no more devices, remove user and broadcast offline
        if (connectedUsers.get(user.userId).size === 0) {
          connectedUsers.delete(user.userId);
          socket.broadcast.emit('user_offline', {
            userId: user.userId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Remove from typing indicators
      typingUsers.forEach((users) => {
        users.delete(user.userId);
      });
    }
  });

  // Handle user going online (for multi-device sync)
  socket.on('user_online', () => {
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 HAKA Socket.io server running on port ${PORT}`);
});

export default httpServer;
