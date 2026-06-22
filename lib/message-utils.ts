import { Message, MessageStatus } from './types';

/**
 * Message status utilities for lifecycle tracking
 */

/**
 * Get status icon representation
 */
export const getStatusIcon = (status: MessageStatus): string => {
  switch (status) {
    case 'read':
      return '✔✔'; // Blue ticks
    case 'delivered':
      return '✔✔'; // Grey ticks
    case 'sent':
    default:
      return '✔'; // Single tick
  }
};

/**
 * Format timestamp for message display
 */
export const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Determine if message should show status indicator
 */
export const shouldShowStatus = (
  message: Message,
  currentUserId: string,
  privacySettings?: { readReceiptsEnabled: boolean }
): boolean => {
  // Only show status for messages sent by current user
  if (message.senderId !== currentUserId) {
    return false;
  }

  // Check privacy settings
  if (privacySettings && !privacySettings.readReceiptsEnabled) {
    // Still show up to delivered, just not read
    return message.status !== 'read';
  }

  return true;
};

/**
 * Get color for status indicator
 */
export const getStatusColor = (status: MessageStatus): string => {
  switch (status) {
    case 'read':
      return 'text-blue-500'; // Blue for read
    case 'delivered':
      return 'text-gray-400'; // Grey for delivered
    case 'sent':
    default:
      return 'text-gray-300'; // Light grey for sent
  }
};

/**
 * Sort messages chronologically
 */
export const sortMessages = (messages: Message[]): Message[] => {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

/**
 * Group messages by date for display
 */
export const groupMessagesByDate = (messages: Message[]) => {
  const groups: Map<string, Message[]> = new Map();

  messages.forEach((message) => {
    const date = new Date(message.createdAt);
    const dateKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return groups;
};

/**
 * Detect if messages are from same sender (for UI grouping)
 */
export const isSameSender = (msg1: Message | null, msg2: Message): boolean => {
  if (!msg1) return false;
  return msg1.senderId === msg2.senderId;
};

/**
 * Detect if messages are close in time (for UI grouping)
 */
export const isCloseInTime = (
  msg1: Message | null,
  msg2: Message,
  thresholdMinutes: number = 5
): boolean => {
  if (!msg1) return false;

  const time1 = new Date(msg1.createdAt).getTime();
  const time2 = new Date(msg2.createdAt).getTime();
  const diffMs = Math.abs(time2 - time1);
  const diffMins = diffMs / 60000;

  return diffMins <= thresholdMinutes;
};

/**
 * Get unread message count
 */
export const getUnreadCount = (
  messages: Message[],
  currentUserId: string
): number => {
  return messages.filter(
    (msg) => msg.senderId !== currentUserId && msg.status !== 'read'
  ).length;
};

/**
 * Get messages that need delivery confirmation
 */
export const getUndeliveredMessages = (messages: Message[]): Message[] => {
  return messages.filter((msg) => msg.status === 'sent');
};

/**
 * Get messages that haven't been read yet
 */
export const getUnreadMessages = (messages: Message[]): Message[] => {
  return messages.filter((msg) => msg.status !== 'read');
};

/**
 * Build batch read payload from messages
 */
export const buildBatchReadPayload = (
  messages: Message[],
  recipientId: string
): string[] => {
  return messages
    .filter((msg) => msg.senderId === recipientId && msg.status !== 'read')
    .map((msg) => msg.id);
};

/**
 * Validate message before sending
 */
export const validateMessage = (content: string): { valid: boolean; error?: string } => {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (content.length > 4096) {
    return { valid: false, error: 'Message too long (max 4096 characters)' };
  }

  return { valid: true };
};

/**
 * Calculate message size in bytes (for bandwidth estimation)
 */
export const getMessageSize = (message: Message): number => {
  let size = 0;
  size += message.id.length;
  size += message.encryptedMessage.length;
  size += message.messageType.length;
  if (message.fileUrl) size += message.fileUrl.length;
  return size;
};

/**
 * Retry logic for failed messages
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const getRetryDelay = (
  attempt: number,
  config: RetryConfig = {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  }
): number => {
  if (attempt >= config.maxAttempts) {
    return -1; // Give up
  }

  // Exponential backoff: baseDelay * 2^attempt
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelayMs);
};
