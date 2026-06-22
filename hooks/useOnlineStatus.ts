'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-context';

interface OnlineUser {
  userId: string;
  lastSeen: Date;
}

export const useOnlineStatus = () => {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(
    new Map()
  );
  const [lastActivity, setLastActivity] = useState<Map<string, Date>>(
    new Map()
  );

  // Initialize socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: { userId: string; timestamp: string }) => {
      const now = new Date(data.timestamp);
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          lastSeen: now,
        });
        return next;
      });
      console.log(`[Online] User ${data.userId} is online`);
    };

    const handleUserOffline = (data: { userId: string; timestamp: string }) => {
      const now = new Date(data.timestamp);
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      setLastActivity((prev) => {
        const next = new Map(prev);
        next.set(data.userId, now);
        return next;
      });
      console.log(`[Online] User ${data.userId} went offline`);
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket]);

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Get user status string
  const getUserStatus = useCallback(
    (userId: string): string => {
      if (isUserOnline(userId)) {
        return 'Online';
      }

      const lastSeen = lastActivity.get(userId);
      if (lastSeen) {
        const now = new Date();
        const diffMs = now.getTime() - lastSeen.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Last seen just now';
        if (diffMins < 60) return `Last seen ${diffMins}m ago`;
        if (diffHours < 24) return `Last seen ${diffHours}h ago`;
        if (diffDays < 7) return `Last seen ${diffDays}d ago`;
        return `Last seen ${lastSeen.toLocaleDateString()}`;
      }

      return 'Never';
    },
    [isUserOnline, lastActivity]
  );

  // Get online count
  const getOnlineCount = useCallback((): number => {
    return onlineUsers.size;
  }, [onlineUsers]);

  // Get all online users
  const getAllOnlineUsers = useCallback((): string[] => {
    return Array.from(onlineUsers.keys());
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getUserStatus,
    getOnlineCount,
    getAllOnlineUsers,
    isSocketConnected: isConnected,
  };
};
