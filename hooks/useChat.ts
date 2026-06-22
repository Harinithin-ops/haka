'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Message, MessageStatus } from '@/lib/types';
import { debounce } from 'lodash';

interface UseChatOptions {
  chatId: string;
  currentUserId: string;
  onError?: (error: Error) => void;
}

export const useChat = ({ chatId, currentUserId, onError }: UseChatOptions) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messageCache = useRef<Map<string, Message>>(new Map());

  // Initialize socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
      const newMessage: Message = {
        id: data.messageId,
        chatId: data.chatId,
        senderId: data.senderId,
        encryptedMessage: data.encryptedMessage,
        messageType: data.messageType || 'text',
        fileUrl: data.fileUrl,
        status: 'delivered',
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(),
      };

      setMessages((prev) => {
        // Prevent duplicates
        if (messageCache.current.has(newMessage.id)) {
          return prev;
        }
        messageCache.current.set(newMessage.id, newMessage);
        return [...prev, newMessage];
      });
    };

    const handleMessageSentAck = (data: any) => {
      updateMessageStatus(data.messageId, 'sent');
    };

    const handleMessageDelivered = (data: any) => {
      updateMessageStatus(data.messageId, 'delivered');
    };

    const handleMessageRead = (data: any) => {
      if (Array.isArray(data.messageIds)) {
        data.messageIds.forEach((id: string) => {
          updateMessageStatus(id, 'read');
        });
      }
    };

    const handleUserTyping = (data: any) => {
      if (data.chatId === chatId) {
        setIsRemoteTyping(data.isTyping);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent_ack', handleMessageSentAck);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_read', handleMessageRead);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent_ack', handleMessageSentAck);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_read', handleMessageRead);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, chatId]);

  // Update message status
  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, status, updatedAt: new Date() } : msg
      )
    );

    const cached = messageCache.current.get(messageId);
    if (cached) {
      cached.status = status;
      cached.updatedAt = new Date();
      messageCache.current.set(messageId, cached);
    }
  }, []);

  // Debounced typing indicator
  const emitTyping = useCallback(
    debounce((isTyping: boolean) => {
      if (!socket || !isConnected) return;

      if (isTyping) {
        socket.emit('typing_start', { chatId });
      } else {
        socket.emit('typing_stop', { chatId });
      }

      setIsTyping(isTyping);
    }, 300),
    [socket, isConnected, chatId]
  );

  // Handle typing with timeout
  const handleTyping = useCallback(() => {
    emitTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 3000);
  }, [emitTyping]);

  // Send message
  const sendMessage = useCallback(
    async (encryptedMessage: string, messageType = 'text', fileUrl?: string) => {
      if (!socket || !isConnected || isSending) {
        onError?.(new Error('Socket not connected'));
        return;
      }

      setIsSending(true);
      emitTyping(false); // Stop typing indicator

      try {
        // Emit through socket
        socket.emit('send_message', {
          chatId,
          encryptedMessage,
          messageType,
          fileUrl,
        });

        // Create optimistic message
        const optimisticId = `temp_${Date.now()}`;
        const optimisticMessage: Message = {
          id: optimisticId,
          chatId,
          senderId: currentUserId,
          encryptedMessage,
          messageType: messageType as any,
          fileUrl,
          status: 'sent',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        messageCache.current.set(optimisticId, optimisticMessage);
        setMessages((prev) => [...prev, optimisticMessage]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [socket, isConnected, chatId, currentUserId, isSending, emitTyping, onError]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    (messageIds?: string[]) => {
      if (!socket || !isConnected) return;

      const ids = messageIds || messages
        .filter((msg) => msg.senderId !== currentUserId && msg.status !== 'read')
        .map((msg) => msg.id);

      if (ids.length === 0) return;

      socket.emit('message_read', { messageIds: ids, chatId });
    },
    [socket, isConnected, messages, currentUserId, chatId]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isTyping,
    isRemoteTyping,
    isSending,
    isLoading,
    sendMessage,
    handleTyping,
    markAsRead,
    updateMessageStatus,
  };
};
