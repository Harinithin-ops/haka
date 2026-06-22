/**
 * HAKA Chat Application - Type Definitions
 */

// User & Authentication
export interface User {
  id: string;
  email: string;
  username: string;
  publicKey: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface AuthToken {
  userId: string;
  deviceId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  user: Omit<User, 'isOnline' | 'lastSeenAt'>;
  device: {
    id: string;
    name: string;
  };
  token: string;
}

// Chats
export interface Chat {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Messages
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  encryptedMessage: string;
  messageType: MessageType;
  fileUrl?: string;
  status: MessageStatus;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedMessagePayload {
  ciphertext: string;
  nonce: string;
  publicKey: string;
}

// Devices
export interface UserDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'web' | 'desktop';
  isActive: boolean;
  lastActivityAt: Date;
  socketId?: string;
  createdAt: Date;
}

// Typing Indicators
export interface TypingIndicator {
  id: string;
  chatId: string;
  userId: string;
  deviceId: string;
  startedAt: Date;
}

// Privacy Settings
export interface UserPrivacySettings {
  userId: string;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  onlineStatusVisible: boolean;
  updatedAt: Date;
}

// Socket.io Events
export namespace SocketEvents {
  // Outgoing (client emits)
  export interface SendMessage {
    chatId: string;
    encryptedMessage: string;
    messageType: MessageType;
    fileUrl?: string;
  }

  export interface MessageDelivered {
    messageId: string;
    chatId: string;
  }

  export interface MessageRead {
    messageIds: string[];
    chatId: string;
  }

  export interface TypingStart {
    chatId: string;
  }

  export interface TypingStop {
    chatId: string;
  }

  // Incoming (server sends)
  export interface ReceiveMessage {
    messageId: string;
    chatId: string;
    senderId: string;
    encryptedMessage: string;
    nonce: string;
    senderPublicKey: string;
    messageType: MessageType;
    fileUrl?: string;
    createdAt: string;
  }

  export interface MessageSentAck {
    messageId: string;
    status: 'sent';
  }

  export interface MessageDeliveredAck {
    messageId: string;
    status: 'delivered';
  }

  export interface MessageReadAck {
    messageIds: string[];
    status: 'read';
  }

  export interface UserTyping {
    userId: string;
    chatId: string;
    isTyping: boolean;
  }

  export interface UserOnline {
    userId: string;
    timestamp: string;
  }

  export interface UserOffline {
    userId: string;
    timestamp: string;
  }

  export interface SocketError {
    message: string;
  }
}

// API Request/Response types
export namespace API {
  // Auth endpoints
  export interface SignupRequest {
    email: string;
    username: string;
    password: string;
    deviceName?: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
    deviceName?: string;
  }

  // Chat endpoints
  export interface CreateChatRequest {
    recipientId: string;
  }

  export interface ChatsResponse {
    chats: Chat[];
  }

  // Messages endpoints
  export interface MessagesQuery {
    chatId: string;
    limit?: number;
    offset?: number;
  }

  export interface MessagesResponse {
    messages: Message[];
  }
}

// UI State Types
export interface ChatWindowState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
  isTyping: boolean;
  isSending: boolean;
}

export interface ChatListState {
  chats: Chat[];
  selectedChatId?: string;
  isLoading: boolean;
  error?: string;
}
