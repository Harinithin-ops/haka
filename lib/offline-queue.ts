/**
 * Offline Message Queue
 * Persists messages when offline and retries on reconnection
 */

export interface QueuedMessage {
  id: string;
  chatId: string;
  encryptedMessage: string;
  messageType: string;
  fileUrl?: string;
  timestamp: number;
  attempts: number;
}

const QUEUE_STORAGE_KEY = 'haka_offline_queue';
const MAX_QUEUE_SIZE = 100;

/**
 * Add message to offline queue
 */
export const addToQueue = (message: QueuedMessage): void => {
  try {
    const queue = getQueue();

    // Prevent queue from growing too large
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest message
    }

    queue.push(message);
    saveQueue(queue);
    console.log(`[Queue] Added message ${message.id}, queue size: ${queue.length}`);
  } catch (error) {
    console.error('[Queue] Error adding message:', error);
  }
};

/**
 * Get all queued messages
 */
export const getQueue = (): QueuedMessage[] => {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Queue] Error retrieving queue:', error);
    return [];
  }
};

/**
 * Remove message from queue
 */
export const removeFromQueue = (messageId: string): void => {
  try {
    const queue = getQueue();
    const filtered = queue.filter((msg) => msg.id !== messageId);
    saveQueue(filtered);
    console.log(`[Queue] Removed message ${messageId}, queue size: ${filtered.length}`);
  } catch (error) {
    console.error('[Queue] Error removing message:', error);
  }
};

/**
 * Clear entire queue
 */
export const clearQueue = (): void => {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    console.log('[Queue] Cleared offline queue');
  } catch (error) {
    console.error('[Queue] Error clearing queue:', error);
  }
};

/**
 * Update retry count for message
 */
export const incrementRetry = (messageId: string): void => {
  try {
    const queue = getQueue();
    const message = queue.find((msg) => msg.id === messageId);
    if (message) {
      message.attempts += 1;
      saveQueue(queue);
      console.log(`[Queue] Updated retry count for ${messageId}: ${message.attempts}`);
    }
  } catch (error) {
    console.error('[Queue] Error incrementing retry:', error);
  }
};

/**
 * Get queue size
 */
export const getQueueSize = (): number => {
  return getQueue().length;
};

/**
 * Check if queue has pending messages
 */
export const hasPendingMessages = (): boolean => {
  return getQueueSize() > 0;
};

/**
 * Get messages for specific chat
 */
export const getQueuedMessagesForChat = (chatId: string): QueuedMessage[] => {
  return getQueue().filter((msg) => msg.chatId === chatId);
};

/**
 * Save queue to localStorage
 */
const saveQueue = (queue: QueuedMessage[]): void => {
  try {
    // Limit stored messages to prevent localStorage overflow
    const limited = queue.slice(-MAX_QUEUE_SIZE);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('[Queue] Error saving queue:', error);
    // If localStorage is full, clear oldest messages
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      const limited = queue.slice(-Math.floor(MAX_QUEUE_SIZE / 2));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(limited));
    }
  }
};

/**
 * Process offline queue when reconnected
 */
export interface QueueProcessOptions {
  onMessage?: (message: QueuedMessage) => Promise<void>;
  onError?: (message: QueuedMessage, error: Error) => void;
  onComplete?: (successCount: number, failureCount: number) => void;
}

export const processQueue = async (options: QueueProcessOptions = {}): Promise<void> => {
  const queue = getQueue();

  if (queue.length === 0) {
    console.log('[Queue] No pending messages to process');
    options.onComplete?.(0, 0);
    return;
  }

  console.log(`[Queue] Processing ${queue.length} pending messages`);

  let successCount = 0;
  let failureCount = 0;

  for (const message of queue) {
    try {
      await options.onMessage?.(message);
      removeFromQueue(message.id);
      successCount++;
    } catch (error) {
      failureCount++;
      options.onError?.(message, error instanceof Error ? error : new Error(String(error)));

      // Increment retry count
      incrementRetry(message.id);
    }
  }

  console.log(
    `[Queue] Processing complete - Success: ${successCount}, Failures: ${failureCount}`
  );
  options.onComplete?.(successCount, failureCount);
};

/**
 * Export queue for debugging
 */
export const debugQueue = (): void => {
  const queue = getQueue();
  console.group('[Queue] Debug Info');
  console.log('Queue size:', queue.length);
  console.table(queue);
  console.groupEnd();
};
