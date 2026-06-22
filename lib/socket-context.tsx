'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  userId: string | null;
  deviceId: string | null;
  token: string | null;
  connect: (token: string, userId: string, deviceId: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const connect = (newToken: string, newUserId: string, newDeviceId: string) => {
    setToken(newToken);
    setUserId(newUserId);
    setDeviceId(newDeviceId);

    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
      {
        auth: {
          token: newToken,
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 10000,
        forceNew: true,
      }
    );

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    let connectAttempts = 0;
    newSocket.on('connect_error', (error: Error) => {
      connectAttempts++;
      if (connectAttempts === 1) {
        console.warn('[Socket] Connecting to server... (will retry automatically)');
      } else if (connectAttempts % 5 === 0) {
        console.warn(`[Socket] Still trying to connect (attempt ${connectAttempts}). Is the socket server running on port 3001?`);
      }
    });

    newSocket.on('receive_message', (data) => {
      console.log('[Socket] Received message globally, sending delivery receipt:', data.messageId);
      newSocket.emit('message_delivered', { messageId: data.messageId, chatId: data.chatId });
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);
    setUserId(null);
    setDeviceId(null);
    setToken(null);
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        userId,
        deviceId,
        token,
        connect,
        disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
