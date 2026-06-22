'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/socket-context';
import { ChatWindow } from '@/components/ChatWindow';
import Link from 'next/link';
import { LogOut, MessageSquare, Plus, Settings } from 'lucide-react';

interface Chat {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
  updated_at: string;
  recipientName: string;
  recipientId: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface AuthData {
  userId: string;
  phoneNumber: string;
  username: string;
  publicKey: string;
  avatarUrl?: string;
  deviceId: string;
  token: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected, connect } = useSocket();
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load auth data and initialize
  useEffect(() => {
    const authStr = localStorage.getItem('auth');
    if (!authStr) {
      // Check if there is an invite param in the URL, save it to pending_invite
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const invite = urlParams.get('invite');
        if (invite) {
          localStorage.setItem('pending_invite', invite);
        }
      }
      router.push('/login');
      return;
    }

    const auth = JSON.parse(authStr) as AuthData;
    setAuthData(auth);

    // Connect socket if not already connected (e.g. after a page refresh)
    if (!socket) {
      console.log('[Chat] Socket not connected, attempting connection');
      connect(auth.token, auth.userId, auth.deviceId);
    }

    // Fetch chats
    fetchChats(auth.token).then(() => {
      // Handle pending invite or current URL invite
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        let invite = urlParams.get('invite');
        const pendingInvite = localStorage.getItem('pending_invite');

        if (pendingInvite) {
          invite = pendingInvite;
          localStorage.removeItem('pending_invite');
        }

        if (invite) {
          handleSelectUserByInviteLink(invite, auth.token, auth.userId, auth.username);
        }
      }
    });
  }, [router, socket, isConnected, connect]);

  // Listen for real-time new chats via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (data: { chat: Chat }) => {
      console.log('[Chat] Received new chat notification:', data.chat);
      setChats((prev) => {
        const exists = prev.some((c) => c.id === data.chat.id);
        if (exists) return prev;
        return [data.chat, ...prev];
      });
    };

    socket.on('new_chat', handleNewChat);
    return () => {
      socket.off('new_chat', handleNewChat);
    };
  }, [socket]);

  const handleSelectUserByInviteLink = async (recipientId: string, token: string, currentUserId: string, currentUsername?: string) => {
    if (recipientId === currentUserId) {
      router.replace('/chat');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId }),
      });

      if (!response.ok) throw new Error('Failed to join chat from invite link');

      const data = await response.json();
      
      const newChat: Chat = {
        id: data.chat.id,
        user_a_id: data.chat.user_a_id,
        user_b_id: data.chat.user_b_id,
        created_at: data.chat.created_at,
        updated_at: data.chat.updated_at,
        recipientName: data.chat.recipientName,
        recipientId: data.chat.recipientId,
        lastMessage: data.chat.lastMessage,
        lastMessageTime: data.chat.lastMessageTime
      };

      setChats((prev) => {
        const exists = prev.some((c) => c.id === newChat.id);
        if (exists) {
          return prev;
        }
        return [newChat, ...prev];
      });

      // Emit socket event for new chat so the recipient is notified immediately
      if (socket) {
        socket.emit('new_chat', {
          chat: {
            id: data.chat.id,
            user_a_id: data.chat.user_a_id,
            user_b_id: data.chat.user_b_id,
            created_at: data.chat.created_at,
            updated_at: data.chat.updated_at,
            recipientId: currentUserId, // from recipient's perspective, the recipient is User A (currentUserId)
            recipientName: currentUsername || authData?.username || '', // from recipient's perspective, recipientName is User A's username
          },
          recipientId,
        });
      }

      handleSelectChat(newChat);
      router.replace('/chat');
    } catch (error) {
      console.error('Error adding contact from invite link:', error);
      alert('Failed to connect with contact via invite link.');
      router.replace('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChats = async (token: string) => {
    try {
      const response = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();
      // TODO: Populate with real recipient names
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/login');
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChatId(chat.id);
    setSelectedChat(chat);
  };

  if (!authData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-foreground/50">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-border flex flex-col bg-card ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="border-b border-border p-5 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">HAKA</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/settings">
                <button
                  className="p-2 hover:bg-background/50 rounded-lg transition-all text-foreground/70 hover:text-foreground active:scale-95"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-background/50 rounded-lg transition-all text-foreground/70 hover:text-foreground active:scale-95"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-foreground/60 font-medium">👤 {authData.username}</p>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* New Chat Invite & Search */}
        {showNewChat && (
          <div className="p-4 border-b border-border bg-background/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Share Invite Link Card */}
            <div className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Your Invite Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/chat?invite=${authData.userId}` : ''}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground/60 select-all overflow-ellipsis"
                />
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/chat?invite=${authData.userId}`;
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center min-w-[70px]"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-foreground/40">Share this link with a friend. Clicking it will automatically add you as a contact and start a chat!</p>
            </div>
          </div>
        )}

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-foreground/50 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span>Loading chats...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center text-foreground/50 flex flex-col items-center gap-3 justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="font-medium">No chats yet</p>
              <p className="text-xs">Start a new conversation with friends</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group ${
                    selectedChatId === chat.id
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20'
                      : 'hover:bg-muted text-foreground active:bg-muted/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      selectedChatId === chat.id
                        ? 'bg-white/20 text-white'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {chat.recipientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.recipientName}</p>
                      <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-white/70' : 'text-foreground/50'}`}>
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <ChatWindow
            chatId={selectedChat.id}
            currentUserId={authData.userId}
            currentUserName={authData.username}
            currentUserSecretKey={''} // TODO: Retrieve from secure storage
            recipientId={selectedChat.recipientId}
            recipientName={selectedChat.recipientName}
            recipientPublicKey={selectedChat.recipientName} // TODO: Fetch recipient's public key
            onBack={() => {
              setSelectedChat(null);
              setSelectedChatId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/50">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
