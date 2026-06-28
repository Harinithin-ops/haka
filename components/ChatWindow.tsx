'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/lib/socket-context';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { SwipeableMessage } from './SwipeableMessage';
import { decryptMessage } from '@/lib/encryption';
import { Toaster, toast } from 'sonner';
import { Send, Loader2, MoreVertical, ArrowLeft, Check, CheckCheck, AlertCircle, Clock, Image as ImageIcon, Smile, Reply, Pencil, Trash2, X, Copy, ChevronDown, Languages, Sparkles, MoreHorizontal } from 'lucide-react';
import { debounce } from 'lodash';
import { EMOJI_CATEGORIES, STICKERS, ALL_EMOJIS } from '@/lib/emoji-sticker-data';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  encryptedMessage: string;
  decryptedMessage?: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  read_at?: Date;
  delivered_at?: Date;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToMessageId?: string | null;
  replyMsg?: {
    id: string;
    encrypted_message: string;
    sender_id: string;
    message_type: string;
    file_url?: string;
    is_deleted?: boolean;
  } | null;
  reactions?: Record<string, string>;
  translatedText?: string;
  translatedLang?: string;
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserSecretKey: string;
  recipientId: string;
  recipientName: string;
  recipientPublicKey: string;
  onBack?: () => void;
}

export function ChatWindow({
  chatId,
  currentUserId,
  currentUserName,
  currentUserSecretKey,
  recipientId,
  recipientName,
  recipientPublicKey,
  onBack,
}: ChatWindowProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reply / Edit / Context menu state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ message: Message; open: boolean } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Long-press Context Menu & Reactions states
  const [longPressMenuMessage, setLongPressMenuMessage] = useState<Message | null>(null);
  const [longPressMenuRect, setLongPressMenuRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [menuView, setMenuView] = useState<'main' | 'translate'>('main');
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [chatsList, setChatsList] = useState<any[]>([]);
  const [showAllReactionPicker, setShowAllReactionPicker] = useState(false);

  const handleInitiateReply = (msg: Message) => {
    setReplyingToMessage(msg);
    setEditingMessage(null);
    setContextMenuMessageId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Helper for initiating forward action
  const handleInitiateForward = (msg: Message) => {
    setMessageToForward(msg);
    fetchChatsForForwarding();
    setForwardModalOpen(true);
    setLongPressMenuMessage(null);
    setLongPressMenuRect(null);
  };

  const fetchChatsForForwarding = async () => {
    try {
      const authStr = localStorage.getItem('auth');
      if (!authStr) return;
      const auth = JSON.parse(authStr);

      const response = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setChatsList(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to fetch chats for forwarding:', err);
    }
  };

  const handleForwardToChat = (chat: any) => {
    if (!socket || !messageToForward) return;

    const text = messageToForward.decryptedMessage || messageToForward.encryptedMessage;
    const type = messageToForward.messageType;
    const fileUrl = messageToForward.fileUrl || '';

    socket.emit('send_message', {
      chatId: chat.id,
      encryptedMessage: text,
      messageType: type,
      fileUrl: fileUrl,
      tempId: `forward_${Date.now()}`,
    });

    // Add optimistic message if forwarding to the CURRENT chat!
    if (chat.id === chatId) {
      const tempId = `forward_${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        senderId: currentUserId,
        senderName: currentUserName,
        encryptedMessage: text,
        decryptedMessage: text,
        messageType: type,
        fileUrl: fileUrl || undefined,
        status: 'pending',
        createdAt: new Date(),
        replyToMessageId: null,
        replyMsg: null,
        reactions: {},
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    toast.success(`Message forwarded to ${chat.recipientName}`);
    setForwardModalOpen(false);
    setMessageToForward(null);
  };

  // Helper for translating a message
  const handleTranslateMessage = async (msg: Message) => {
    setMenuView('translate');
  };

  const fetchTranslation = async (msg: Message, lang: string) => {
    const text = msg.decryptedMessage || msg.encryptedMessage;
    const toastId = toast.loading(`Translating message to ${lang.toUpperCase()}...`);
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`);
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, decryptedMessage: translated, translatedText: translated, translatedLang: lang } : m));
        toast.success(`Translated to ${lang.toUpperCase()}`, { id: toastId });
      } else {
        toast.error('Failed to translate message', { id: toastId });
      }
    } catch (err) {
      console.error('Translation error:', err);
      toast.error('Error contacting translation API', { id: toastId });
    } finally {
      setLongPressMenuMessage(null);
      setLongPressMenuRect(null);
    }
  };

  // Helper for generating AI image using Pollinations.ai
  const handleMakeAIImage = async (prompt: string) => {
    const toastId = toast.loading('🤖 AI generating image. Please wait...');
    try {
      const tempId = `ai_gen_${Date.now()}`;
      
      // Post a temporary notification message in the chat local list
      const generatingMessage: Message = {
        id: tempId,
        senderId: currentUserId,
        senderName: currentUserName,
        encryptedMessage: `🤖 AI is generating image for prompt: "${prompt}"...`,
        decryptedMessage: `🤖 AI is generating image for prompt: "${prompt}"...`,
        messageType: 'text',
        status: 'pending',
        createdAt: new Date(),
        replyToMessageId: null,
        replyMsg: null,
        reactions: {},
      };

      setMessages((prev) => [...prev, generatingMessage]);
      scrollToBottom();

      // Wait 3 seconds to simulate cool generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;

      // Emit real image message over socket
      socket?.emit('send_message', {
        chatId,
        encryptedMessage: '[Image]',
        messageType: 'image',
        fileUrl: imageUrl,
        tempId: `ai_img_${Date.now()}`,
      });

      // Optimistically add the new image message to local state
      const imgTempId = `ai_img_temp_${Date.now()}`;
      const imageMessage: Message = {
        id: imgTempId,
        senderId: currentUserId,
        senderName: currentUserName,
        encryptedMessage: '[Image]',
        decryptedMessage: '[Image]',
        messageType: 'image',
        fileUrl: imageUrl,
        status: 'pending',
        createdAt: new Date(),
        replyToMessageId: null,
        replyMsg: null,
        reactions: {},
      };

      // Filter out the "Generating..." text message and append the new image message
      setMessages((prev) => prev.filter(m => m.id !== tempId).concat(imageMessage));
      scrollToBottom();
      toast.success('AI Image generated successfully!', { id: toastId });
    } catch (err) {
      console.error('AI image generation error:', err);
      toast.error('Failed to generate AI image', { id: toastId });
    }
  };

  const getOverlayPositions = () => {
    if (!longPressMenuRect) return { bubbleStyle: {}, menuStyle: {}, reactionStyle: {}, menuOnTop: false };

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const { top, left, width, height } = longPressMenuRect;
    const isMine = longPressMenuMessage?.senderId === currentUserId;

    // Dimensions of components
    const reactionWidth = 320;
    const reactionHeight = 62;
    const menuWidth = 220;

    // Calculate dynamic context menu height based on visible items
    let itemCount = 3; // Reply, Forward, More (always present)
    if (menuView === 'translate') {
      itemCount = 6; // 6 translation languages
    } else {
      if (longPressMenuMessage?.messageType === 'text') {
        itemCount += 3; // Copy, Make AI Image, Translate
        if (isMine) itemCount += 1; // Edit
      }
      if (isMine) itemCount += 1; // Unsend
    }
    const menuHeight = 36 + itemCount * 40; // 36px header + 40px per item

    // 1. Position bubble replica
    const bubbleStyle: React.CSSProperties = {
      position: 'absolute',
      top: top,
      left: left,
      width: width,
      height: height,
    };

    // 2. Decide if menu goes on top or bottom
    const fitsOnBottom = top + height + menuHeight + 16 < screenHeight;
    const menuOnTop = !fitsOnBottom;

    // 3. Position Context Menu
    let menuTop = menuOnTop ? top - menuHeight - 8 : top + height + 8;
    let menuLeft = isMine ? left + width - menuWidth : left;

    // Clamp menu boundaries
    menuLeft = Math.max(16, Math.min(screenWidth - menuWidth - 16, menuLeft));
    menuTop = Math.max(16, Math.min(screenHeight - menuHeight - 16, menuTop));

    const menuStyle: React.CSSProperties = {
      position: 'absolute',
      top: menuTop,
      left: menuLeft,
      width: menuWidth,
    };

    // 4. Position Reaction Bar
    let reactionTop = menuOnTop ? top + height + 8 : top - reactionHeight - 8;
    let reactionLeft = isMine ? left + width - reactionWidth : left;

    // Clamp reaction boundaries
    reactionLeft = Math.max(16, Math.min(screenWidth - reactionWidth - 16, reactionLeft));
    reactionTop = Math.max(16, Math.min(screenHeight - reactionHeight - 16, reactionTop));

    const reactionStyle: React.CSSProperties = {
      position: 'absolute',
      top: reactionTop,
      left: reactionLeft,
      width: reactionWidth,
    };

    return { bubbleStyle, menuStyle, reactionStyle, menuOnTop };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRecipientTyping]);

  // Fetch historical messages on chatId change
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const authStr = localStorage.getItem('auth');
        if (!authStr) return;
        const auth = JSON.parse(authStr);

        const response = await fetch(`/api/messages?chatId=${chatId}`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const loadedMessages: Message[] = (data.messages || []).map((msg: any) => {
            let decryptedContent = msg.encrypted_message;
            try {
              decryptedContent = decryptMessage(
                {
                  ciphertext: msg.encrypted_message,
                  nonce: msg.nonce || '',
                  publicKey: msg.sender_public_key || '',
                },
                currentUserSecretKey,
                recipientPublicKey
              );
            } catch (err) {
              console.warn('[Chat] Failed to decrypt historical message:', err);
            }

            return {
              id: msg.id,
              senderId: msg.sender_id,
              senderName: msg.sender_id === currentUserId ? currentUserName : recipientName,
              encryptedMessage: msg.encrypted_message,
              decryptedMessage: decryptedContent,
              messageType: msg.message_type || 'text',
              fileUrl: msg.file_url,
              status: msg.status || 'sent',
              createdAt: new Date(msg.created_at),
              isEdited: msg.is_edited || false,
              isDeleted: msg.is_deleted || false,
              replyToMessageId: msg.reply_to_message_id || null,
              replyMsg: msg.reply_msg || null,
              reactions: typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {}),
            };
          });

          setMessages(loadedMessages);
          setTimeout(scrollToBottom, 100);
        }
      } catch (error) {
        console.error('[Chat] Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [chatId, currentUserId, currentUserName, recipientName, currentUserSecretKey, recipientPublicKey]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (data) => {
      try {
        const decryptedContent = decryptMessage(
          {
            ciphertext: data.encryptedMessage,
            nonce: data.nonce,
            publicKey: data.senderPublicKey,
          },
          currentUserSecretKey,
          recipientPublicKey
        );

        const newMessage: Message = {
          id: data.messageId,
          senderId: data.senderId,
          senderName: recipientName,
          encryptedMessage: data.encryptedMessage,
          decryptedMessage: decryptedContent,
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
          status: 'delivered',
          createdAt: new Date(data.createdAt),
          replyToMessageId: data.replyToMessageId || null,
          // Use replyMsg from server so recipient can render the quoted reply bubble
          replyMsg: data.replyMsg || null,
          reactions: {},
        };

        setMessages((prev) => [...prev, newMessage]);

        // Emit delivered acknowledgement
        socket.emit('message_delivered', { messageId: data.messageId, chatId });

        // Auto-mark as read after short delay
        setTimeout(() => {
          socket.emit('message_read', { messageIds: [data.messageId], chatId });
        }, 500);
      } catch (error) {
        console.error('[Chat] Failed to decrypt message:', error);
      }
    });

    socket.on('message_sent_ack', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.tempId ? { ...msg, id: data.messageId, status: 'sent' } : msg
        )
      );
    });

    socket.on('message_delivered', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, status: 'delivered' } : msg
        )
      );
    });

    socket.on('message_read', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
        )
      );
    });

    socket.on('message_reaction', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, reactions: typeof data.reactions === 'string' ? JSON.parse(data.reactions) : (data.reactions || {}) }
            : msg
        )
      );
    });

    // Close context menu on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    socket.on('user_typing', (data) => {
      if (data.userId === recipientId) {
        setIsRecipientTyping(data.isTyping);
      }
    });

    socket.on('message_edited', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, decryptedMessage: data.text, encryptedMessage: data.text, isEdited: true }
            : msg
        )
      );
    });

    socket.on('message_deleted', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, isDeleted: true, decryptedMessage: 'This message was deleted', encryptedMessage: 'This message was deleted', fileUrl: undefined, messageType: 'text' }
            : msg
        )
      );
    });

    socket.on('error', (data: { message?: string }) => {
      console.error('[Socket] Server error:', data?.message);
      toast.error(data?.message || 'Server error occurred');
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_sent_ack');
      socket.off('message_delivered');
      socket.off('message_read');
      socket.off('message_reaction');
      socket.off('user_typing');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('error');
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [socket, chatId, recipientId, recipientName, currentUserSecretKey, recipientPublicKey]);

  // Mark messages as read when messages are loaded or socket connects
  useEffect(() => {
    if (!socket || !isConnected || !chatId || messages.length === 0) return;

    const unreadMessageIds = messages
      .filter((msg) => msg.senderId !== currentUserId && msg.status !== 'read')
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      socket.emit('message_read', { messageIds: unreadMessageIds, chatId });
      
      // Update local state to prevent infinite loop
      setMessages((prev) =>
        prev.map((msg) =>
          unreadMessageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
        )
      );
    }
  }, [socket, isConnected, chatId, messages, currentUserId]);

  // Debounced typing indicator
  const sendTypingIndicator = useCallback(
    debounce((shouldType: boolean) => {
      if (!socket || !isConnected) return;

      if (shouldType) {
        socket.emit('typing_start', { chatId });
        setIsTyping(true);
      } else {
        socket.emit('typing_stop', { chatId });
        setIsTyping(false);
      }
    }, 300),
    [socket, isConnected, chatId]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    sendTypingIndicator(e.target.value.length > 0);

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  };

  const handleSendMessage = async (textOverride?: string, customFileType?: 'text' | 'image', customFileUrl?: string) => {
    const text = textOverride !== undefined ? textOverride : inputValue;
    const type = customFileType || 'text';
    const fileUrl = customFileUrl || '';

    if (type === 'text' && !text.trim()) return;
    if (!socket || !isConnected) {
      toast.error('Unable to send. Reconnecting to chat server...');
      return;
    }
    if (isSending) return;

    // Handle edit mode
    if (editingMessage && type === 'text') {
      socket.emit('edit_message', { messageId: editingMessage.id, chatId, text });
      setEditingMessage(null);
      setInputValue('');
      return;
    }

    setIsSending(true);
    if (textOverride === undefined) {
      setInputValue('');
    }

    const currentReply = replyingToMessage;
    setReplyingToMessage(null);

    try {
      // Emit typing stop
      socket.emit('typing_stop', { chatId });
      setIsTyping(false);

      const tempId = `temp_${Date.now()}`;
      
      socket.emit('send_message', {
        chatId,
        encryptedMessage: type === 'image' ? '[Image]' : text,
        messageType: type,
        fileUrl,
        tempId,
        replyToMessageId: currentReply?.id || null,
      });

      // Add optimistic message to UI with status 'pending'
      const optimisticMessage: Message = {
        id: tempId,
        senderId: currentUserId,
        senderName: currentUserName,
        encryptedMessage: type === 'image' ? '[Image]' : text,
        decryptedMessage: type === 'image' ? '[Image]' : text,
        messageType: type,
        fileUrl: type === 'image' ? fileUrl : undefined,
        status: 'pending',
        createdAt: new Date(),
        replyToMessageId: currentReply?.id || null,
        replyMsg: currentReply ? {
          id: currentReply.id,
          encrypted_message: currentReply.decryptedMessage || currentReply.encryptedMessage,
          sender_id: currentReply.senderId,
          message_type: currentReply.messageType,
          file_url: currentReply.fileUrl,
          is_deleted: currentReply.isDeleted,
        } : null,
        reactions: {},
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Set timeout to mark as failed if not acknowledged in 8 seconds
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId && msg.status === 'pending'
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }, 8000);
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      if (textOverride === undefined) {
        setInputValue(text); // Restore input
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Compress and resize using Canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          handleSendMessage('[Image]', 'image', compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = input.value;
    
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newValue = before + emoji + after;
    setInputValue(newValue);

    // Focus input and set selection cursor
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + emoji.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const filteredEmojis = searchQuery
    ? ALL_EMOJIS.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.emoji.includes(searchQuery)
      )
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRetryMessage = (failedMsg: Message) => {
    if (!socket || !isConnected) return;

    const tempId = failedMsg.id;

    // Reset message status to 'pending'
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === tempId ? { ...msg, status: 'pending', createdAt: new Date() } : msg
      )
    );

    // Re-emit message
    socket.emit('send_message', {
      chatId,
      encryptedMessage: failedMsg.encryptedMessage,
      messageType: failedMsg.messageType || 'text',
      fileUrl: failedMsg.fileUrl || '',
      tempId,
    });

    // Set timeout to mark as failed if not acknowledged in 8 seconds
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId && msg.status === 'pending'
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }, 8000);
  };

  const renderStatusIcon = (msg: Message) => {
    if (msg.senderId !== currentUserId) return null;

    switch (msg.status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-white/50 animate-pulse" title="Sending..." />;
      case 'failed':
        return (
          <button
            onClick={() => handleRetryMessage(msg)}
            className="flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-red-300 p-0.5 rounded animate-bounce"
            title="Failed to send. Click to retry."
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        );
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-cyan-300 animate-in zoom-in duration-200" title="Read" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-white/60" title="Delivered" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-white/60" title="Sent" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 md:px-6 bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors -ml-2"
                title="Back to chats"
              >
                <ArrowLeft className="w-5 h-5 text-foreground/60" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
              {recipientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{recipientName}</h2>
              <p className={`text-xs font-medium transition-colors ${isConnected ? 'text-green-500' : 'text-foreground/50'}`}>
                {isConnected ? '● Online' : '○ Offline'}
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors" title="Options">
            <MoreVertical className="w-5 h-5 text-foreground/60" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-foreground/60 font-medium">No messages yet</p>
            <p className="text-foreground/40 text-sm">Start the conversation with {recipientName}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const displayText = msg.decryptedMessage || msg.encryptedMessage;

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}
                >
                  <SwipeableMessage
                    onSwipeToReply={() => handleInitiateReply(msg)}
                    onLongPress={(rect) => {
                      setLongPressMenuMessage(msg);
                      setLongPressMenuRect(rect);
                      setMenuView('main');
                    }}
                    isMine={isMine}
                    disabled={msg.isDeleted}
                  >
                    <div className="relative max-w-xs lg:max-w-sm xl:max-w-md">

                    {/* WhatsApp-style dropdown chevron trigger */}
                    {!msg.isDeleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = e.currentTarget.closest('.relative');
                          const rect = el?.getBoundingClientRect();
                          if (rect) {
                            setLongPressMenuMessage(msg);
                            setLongPressMenuRect(rect);
                            setMenuView('main');
                          }
                        }}
                        className={`absolute top-1 z-20 p-0.5 rounded-full transition-all duration-150 right-1 ${
                          isMine
                            ? 'text-white/0 group-hover:text-white/70 hover:!text-white bg-transparent group-hover:bg-black/10'
                            : 'text-foreground/0 group-hover:text-foreground/40 hover:!text-foreground/70 bg-transparent group-hover:bg-black/5'
                        }`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`px-3 py-2 rounded-2xl shadow-sm overflow-visible ${
                        isMine
                          ? msg.isDeleted
                            ? 'bg-muted/50 text-foreground/40 border border-border/40 rounded-tr-sm'
                            : 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm'
                          : msg.isDeleted
                            ? 'bg-muted/40 text-foreground/40 border border-border/40 rounded-tl-sm'
                            : 'bg-muted text-foreground rounded-tl-sm border border-border'
                      }`}
                    >
                      {/* WhatsApp-style reply quote */}
                      {msg.replyMsg && !msg.isDeleted && (
                        <div
                          className={`mb-2 rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-90 ${
                            isMine ? 'bg-black/15' : 'bg-background/70'
                          }`}
                          onClick={() => {
                            const el = messageRefs.current.get(msg.replyMsg!.id);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          <div className={`flex border-l-4 ${isMine ? 'border-white/60' : 'border-primary'}`}>
                            <div className="pl-2.5 pr-6 py-1.5 min-w-0 flex-1">
                              <p className={`text-[11px] font-semibold truncate mb-0.5 ${isMine ? 'text-white/80' : 'text-primary'}`}>
                                {msg.replyMsg.sender_id === currentUserId ? 'You' : recipientName}
                              </p>
                              <p className={`text-xs truncate ${isMine ? 'text-white/55' : 'text-foreground/50'}`}>
                                {msg.replyMsg.is_deleted
                                  ? '🚫 Deleted message'
                                  : msg.replyMsg.message_type === 'image'
                                  ? '📷 Photo'
                                  : (msg.replyMsg.encrypted_message || '').substring(0, 70)}
                              </p>
                            </div>
                            {msg.replyMsg.message_type === 'image' && msg.replyMsg.file_url && !msg.replyMsg.is_deleted && (
                              <img src={msg.replyMsg.file_url} className="w-12 h-12 object-cover flex-shrink-0" alt="reply" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message content */}
                      {msg.isDeleted ? (
                        <p className="text-sm italic flex items-center gap-1.5 opacity-60 pr-1">
                          <span>🚫</span><span>This message was deleted</span>
                        </p>
                      ) : msg.messageType === 'image' ? (
                        <div className="my-0.5">
                          <img
                            src={msg.fileUrl}
                            alt="Shared image"
                            onClick={() => setPreviewImageUrl(msg.fileUrl || null)}
                            className="max-h-64 rounded-xl object-cover cursor-zoom-in hover:opacity-95 transition-all shadow-sm max-w-[280px]"
                          />
                        </div>
                      ) : (
                        msg.translatedText ? (
                          <div className="space-y-1.5 pr-6">
                            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.translatedText}</p>
                            <div className="text-[10px] opacity-60 italic flex items-center gap-1.5 border-t border-border/20 pt-1 mt-1">
                              <span>🌐 Translated to {msg.translatedLang?.toUpperCase()}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, translatedText: undefined, translatedLang: undefined } : m));
                                }}
                                className="underline hover:text-white/85 text-foreground/75 cursor-pointer font-semibold"
                              >
                                Show original
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed pr-6">{displayText}</p>
                        )
                      )}

                      {/* Footer: edited · time · ticks */}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 text-[11px] ${isMine ? 'text-white/55' : 'text-foreground/40'}`}>
                        {!msg.isDeleted && msg.isEdited && (
                          <span className="italic">edited</span>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {renderStatusIcon(msg)}
                      </div>
                    </div>

                    {/* Reaction Badges Bubble */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div 
                        className={`absolute bottom-[-10px] flex items-center gap-1 bg-[#181b22] border border-border/40 px-2 py-0.5 rounded-full shadow-md z-10 cursor-pointer hover:scale-105 transition-transform ${
                          isMine ? 'right-2' : 'left-2'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const userReaction = msg.reactions?.[currentUserId];
                          if (userReaction) {
                            socket?.emit('message_reaction', { messageId: msg.id, chatId, emoji: userReaction });
                          }
                        }}
                      >
                        <div className="flex -space-x-1 items-center">
                          {(() => {
                            const groups: Record<string, number> = {};
                            Object.values(msg.reactions).forEach((emoji) => {
                              groups[emoji] = (groups[emoji] || 0) + 1;
                            });
                            return Object.keys(groups).map((emoji) => (
                              <span key={emoji} className="text-[12px]">{emoji}</span>
                            ));
                          })()}
                        </div>
                        {Object.keys(msg.reactions).length > 1 && (
                          <span className="text-[10px] font-semibold text-foreground/60 pr-0.5">
                            {Object.keys(msg.reactions).length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SwipeableMessage>
              </div>
              );
            })}
            {isRecipientTyping && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 border border-border">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm">
        {/* Reply Banner */}
        {replyingToMessage && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-0 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
              <Reply className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">Replying to {replyingToMessage.senderId === currentUserId ? 'yourself' : recipientName}</p>
                <p className="text-xs text-foreground/50 truncate">
                  {replyingToMessage.isDeleted ? '🚫 Deleted message' : replyingToMessage.messageType === 'image' ? '📷 Image' : (replyingToMessage.decryptedMessage || replyingToMessage.encryptedMessage).substring(0, 80)}
                </p>
              </div>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground/50">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Edit Banner */}
        {editingMessage && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-0 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <Pencil className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Editing message</p>
                <p className="text-xs text-foreground/50 truncate">{(editingMessage.decryptedMessage || editingMessage.encryptedMessage).substring(0, 80)}</p>
              </div>
            </div>
            <button onClick={() => { setEditingMessage(null); setInputValue(''); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground/50">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-3 items-center px-4 py-4">
          {/* Image Upload Input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
            disabled={isSending}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || !!editingMessage}
            className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl disabled:opacity-50 transition-all duration-200 active:scale-95 flex items-center justify-center"
            title="Send image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPicker(!showPicker)}
            disabled={isSending || !!editingMessage}
            className={`p-3 rounded-xl disabled:opacity-50 transition-all duration-200 active:scale-95 flex items-center justify-center ${
              showPicker ? 'bg-primary text-white shadow-sm' : 'bg-primary/10 hover:bg-primary/20 text-primary'
            }`}
            title="Emoji & Stickers"
          >
            <Smile className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              ref={inputRef}
              placeholder={editingMessage ? 'Edit message...' : replyingToMessage ? 'Write a reply...' : 'Type a message...'}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className={`w-full px-4 py-3 pl-4 pr-12 bg-background border rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all placeholder:text-foreground/40 text-foreground ${
                editingMessage ? 'border-yellow-400/50 focus:ring-yellow-400' : 'border-border focus:ring-primary'
              }`}
            />
            {inputValue.length > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40">
                {inputValue.length}
              </div>
            )}
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isSending}
            className={`p-3 text-white rounded-full hover:shadow-lg hover:scale-105 disabled:bg-muted disabled:text-foreground/40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 ${
              editingMessage ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gradient-to-r from-primary to-accent'
            }`}
            title={editingMessage ? 'Save edit' : 'Send message'}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Lightbox / Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 active:scale-90"
            onClick={() => setPreviewImageUrl(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImageUrl}
            alt="Full size preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}

      {/* Emoji / Sticker Keyboard Drawer (WhatsApp & Gboard style) */}
      {showPicker && (
        <div className="border-t border-border bg-card h-80 flex flex-col select-none animate-in slide-in-from-bottom-5 duration-200">
          {/* Header Controls */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Bar */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-foreground/30"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/30 text-xs">🔍</span>
            </div>

            {/* Category Shortcuts (Only visible for Emoji tab) */}
            {pickerTab === 'emoji' && !searchQuery && (
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none justify-center">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeCategory === cat.id ? 'bg-primary text-white scale-105 shadow-sm' : 'hover:bg-primary/10 text-foreground/60'
                    }`}
                    title={cat.name}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    <span className="hidden md:inline text-xs">{cat.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid Content Viewer */}
          <div className="flex-1 overflow-y-auto p-4 bg-background/30">
            {pickerTab === 'emoji' ? (
              searchQuery ? (
                // Render Search Results
                <div>
                  <h4 className="text-xs font-semibold text-foreground/40 mb-3 uppercase tracking-wider">Search Results</h4>
                  {filteredEmojis.length === 0 ? (
                    <div className="text-center text-foreground/30 py-8 text-sm">No matching emojis found</div>
                  ) : (
                    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
                      {filteredEmojis.map(({ emoji }) => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="text-2xl hover:bg-primary/10 p-2 rounded-xl transition-all duration-100 hover:scale-110 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Render Category Emojis
                <div>
                  <h4 className="text-xs font-semibold text-foreground/40 mb-3 uppercase tracking-wider">
                    {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name}
                  </h4>
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
                    {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-2xl hover:bg-primary/10 p-2 rounded-xl transition-all duration-100 hover:scale-110 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              // Stickers Viewport
              <div>
                <h4 className="text-xs font-semibold text-foreground/40 mb-3 uppercase tracking-wider">WhatsApp & Gboard Stickers</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {STICKERS.map((sticker) => (
                    <div
                      key={sticker.id}
                      onClick={() => handleSendMessage('[Sticker]', 'image', sticker.svgDataUrl)}
                      className="w-20 h-20 hover:bg-primary/10 p-1.5 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-border/20 bg-background/50 hover:shadow-md"
                      title={sticker.name}
                    >
                      <img src={sticker.svgDataUrl} alt={sticker.name} className="w-16 h-16 object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tabs Panel */}
          <div className="h-12 border-t border-border bg-muted/15 flex items-center justify-between px-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPickerTab('emoji');
                  setSearchQuery('');
                }}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  pickerTab === 'emoji' ? 'bg-primary/10 text-primary' : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                😃 Emoji
              </button>
              <button
                onClick={() => {
                  setPickerTab('sticker');
                  setSearchQuery('');
                }}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  pickerTab === 'sticker' ? 'bg-primary/10 text-primary' : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                🖼️ Sticker
              </button>
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="px-3 py-1.5 text-xs text-foreground/50 hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── WhatsApp-style Delete Modal ── */}
      {deleteModal?.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:w-80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <p className="text-sm text-foreground/50 italic truncate">
                &ldquo;{(deleteModal.message.decryptedMessage || deleteModal.message.encryptedMessage).substring(0, 50)}&rdquo;
              </p>
            </div>
            <div className="border-t border-border/50" />

            {/* Delete for everyone — only if the message is from you */}
            <button
              onClick={() => {
                socket?.emit('delete_message', { messageId: deleteModal.message.id, chatId, deleteForEveryone: true });
                setDeleteModal(null);
              }}
              className="w-full px-5 py-4 text-left text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              Delete for everyone
            </button>

            <div className="border-t border-border/50" />

            {/* Delete for me */}
            <button
              onClick={() => {
                // Local-only soft-delete (optimistic)
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === deleteModal.message.id
                      ? { ...m, isDeleted: true, decryptedMessage: 'This message was deleted', fileUrl: undefined, messageType: 'text' as const }
                      : m
                  )
                );
                setDeleteModal(null);
              }}
              className="w-full px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0 text-foreground/50" />
              Delete for me
            </button>

            <div className="border-t border-border/50" />

            {/* Cancel */}
            <button
              onClick={() => setDeleteModal(null)}
              className="w-full px-5 py-4 text-left text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── LONG PRESS CONTEXT MENU & REACTIONS OVERLAY ── */}
      {longPressMenuMessage && longPressMenuRect && (() => {
        const { bubbleStyle, menuStyle, reactionStyle, menuOnTop } = getOverlayPositions();
        const isMine = longPressMenuMessage.senderId === currentUserId;
        const displayText = longPressMenuMessage.decryptedMessage || longPressMenuMessage.encryptedMessage;

        return (
          <div 
            className="fixed inset-0 bg-[#07090e]/70 backdrop-blur-[3px] z-50 animate-in fade-in duration-200"
            onClick={() => {
              setLongPressMenuMessage(null);
              setLongPressMenuRect(null);
              setShowAllReactionPicker(false);
              setMenuView('main');
            }}
          >
            {/* Bubble replica */}
            <div 
              style={bubbleStyle} 
              className={`pointer-events-none ${isMine ? 'flex justify-end' : 'flex justify-start'}`}
            >
              <div
                className={`relative px-4 py-2.5 rounded-2xl shadow-sm border transition-all duration-200 ${
                  isMine
                    ? longPressMenuMessage.isDeleted
                      ? 'bg-muted/50 text-foreground/40 border-border/40 rounded-tr-sm'
                      : 'bg-gradient-to-br from-primary to-accent text-white border-transparent rounded-tr-sm'
                    : longPressMenuMessage.isDeleted
                      ? 'bg-muted/40 text-foreground/40 border-border/40 rounded-tl-sm'
                      : 'bg-card text-foreground border-border rounded-tl-sm'
                }`}
                style={{ width: '100%', height: '100%' }}
              >
                {longPressMenuMessage.replyMsg && !longPressMenuMessage.isDeleted && (
                  <div
                    className={`mb-2 rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-90 ${
                      isMine ? 'bg-black/15' : 'bg-background/70'
                    }`}
                  >
                    <div className={`flex border-l-4 ${isMine ? 'border-white/60' : 'border-primary'}`}>
                      <div className="pl-2.5 pr-6 py-1.5 min-w-0 flex-1">
                        <p className={`text-[11px] font-semibold truncate mb-0.5 ${isMine ? 'text-white/80' : 'text-primary'}`}>
                          {longPressMenuMessage.replyMsg.sender_id === currentUserId ? 'You' : recipientName}
                        </p>
                        <p className={`text-xs truncate ${isMine ? 'text-white/55' : 'text-foreground/50'}`}>
                          {longPressMenuMessage.replyMsg.encrypted_message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {longPressMenuMessage.isDeleted ? (
                  <p className="text-sm italic opacity-60">This message was deleted</p>
                ) : longPressMenuMessage.messageType === 'image' ? (
                  <img src={longPressMenuMessage.fileUrl} className="max-h-64 rounded-xl object-cover max-w-[280px]" alt="Shared" />
                ) : (
                  <p className="text-sm break-words whitespace-pre-wrap pr-6">{displayText}</p>
                )}
                <div className={`flex items-center justify-end gap-1 mt-0.5 text-[11px] ${isMine ? 'text-white/55' : 'text-foreground/40'}`}>
                  {!longPressMenuMessage.isDeleted && longPressMenuMessage.isEdited && (
                    <span className="italic">edited</span>
                  )}
                  <span>{new Date(longPressMenuMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {renderStatusIcon(longPressMenuMessage)}
                </div>
              </div>
            </div>

            {/* Reaction Bar */}
            <div 
              style={reactionStyle}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181b22] border border-white/10 shadow-2xl rounded-3xl p-3 flex flex-col items-center gap-1.5 animate-in zoom-in-95 duration-200 z-50"
            >
              <span className="text-[10px] text-white/50 font-medium tracking-wide">
                Tap and hold to super react
              </span>
              <div className="flex items-center gap-3 w-full justify-center">
                {['💖', '😂', '💯', '😆', '🤐', '🤨'].map((emoji) => {
                  const userReaction = longPressMenuMessage.reactions?.[currentUserId];
                  const isActive = userReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        // Optimistic update
                        const msgId = longPressMenuMessage.id;
                        setMessages(prev => prev.map(m => {
                          if (m.id !== msgId) return m;
                          const prevReactions = m.reactions || {};
                          const existing = prevReactions[currentUserId];
                          const newReactions = { ...prevReactions };
                          if (existing === emoji) {
                            delete newReactions[currentUserId];
                          } else {
                            newReactions[currentUserId] = emoji;
                          }
                          return { ...m, reactions: newReactions };
                        }));
                        socket?.emit('message_reaction', { messageId: msgId, chatId, emoji });
                        setLongPressMenuMessage(null);
                        setLongPressMenuRect(null);
                      }}
                      className={`text-2xl hover:scale-125 active:scale-95 transition-all duration-150 p-1 rounded-xl ${
                        isActive ? 'bg-white/20 scale-110 ring-2 ring-white/30' : 'hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
                
                {/* Plus Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAllReactionPicker(!showAllReactionPicker)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-150 flex items-center justify-center cursor-pointer"
                  >
                    <span className="text-xl font-bold">+</span>
                  </button>

                  {/* Inline Full Emoji Picker */}
                  {showAllReactionPicker && (
                    <div 
                      className="absolute bottom-10 right-0 bg-[#1e222b] border border-white/10 shadow-2xl rounded-2xl p-2 w-48 grid grid-cols-4 gap-1.5 z-50 animate-in slide-in-from-bottom-2 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {['👍', '❤️', '🔥', '👏', '😢', '🙏', '🎉', '😮', '🤡', '🤔', '👀', '✨'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            // Optimistic update
                            const msgId = longPressMenuMessage.id;
                            setMessages(prev => prev.map(m => {
                              if (m.id !== msgId) return m;
                              const prevReactions = m.reactions || {};
                              const existing = prevReactions[currentUserId];
                              const newReactions = { ...prevReactions };
                              if (existing === emoji) {
                                delete newReactions[currentUserId];
                              } else {
                                newReactions[currentUserId] = emoji;
                              }
                              return { ...m, reactions: newReactions };
                            }));
                            socket?.emit('message_reaction', { messageId: msgId, chatId, emoji });
                            setLongPressMenuMessage(null);
                            setLongPressMenuRect(null);
                            setShowAllReactionPicker(false);
                          }}
                          className="text-xl hover:scale-125 active:scale-90 transition-transform p-1 hover:bg-white/10 rounded-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Options Menu List */}
            <div
              style={menuStyle}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181b22] border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-50 py-1"
            >
              {menuView === 'main' ? (
                <>
                  {/* Timestamp Header */}
                  <div className="px-4 py-2 text-center border-b border-white/10">
                    <span className="text-[11px] font-semibold text-white/50">
                      {new Date(longPressMenuMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {/* Reply */}
                  <button
                    onClick={() => {
                      handleInitiateReply(longPressMenuMessage);
                      setLongPressMenuMessage(null);
                      setLongPressMenuRect(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="font-medium">Reply</span>
                    <Reply className="w-4 h-4 text-white/50" />
                  </button>

                  {/* Forward */}
                  <button
                    onClick={() => {
                      handleInitiateForward(longPressMenuMessage);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <span className="font-medium">Forward</span>
                    <Send className="w-4 h-4 text-white/50 rotate-[-30deg]" />
                  </button>

                  {/* Copy */}
                  {longPressMenuMessage.messageType === 'text' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(longPressMenuMessage.decryptedMessage || longPressMenuMessage.encryptedMessage);
                        setLongPressMenuMessage(null);
                        setLongPressMenuRect(null);
                        toast.success('Copied to clipboard');
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-medium">Copy</span>
                      <Copy className="w-4 h-4 text-white/50" />
                    </button>
                  )}

                  {/* Edit */}
                  {isMine && longPressMenuMessage.messageType === 'text' && (
                    <button
                      onClick={() => {
                        setEditingMessage(longPressMenuMessage);
                        setReplyingToMessage(null);
                        setInputValue(longPressMenuMessage.decryptedMessage || longPressMenuMessage.encryptedMessage);
                        setLongPressMenuMessage(null);
                        setLongPressMenuRect(null);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-medium">Edit</span>
                      <Pencil className="w-4 h-4 text-white/50" />
                    </button>
                  )}

                  {/* Make AI Image */}
                  {longPressMenuMessage.messageType === 'text' && (
                    <button
                      onClick={() => {
                        handleMakeAIImage(longPressMenuMessage.decryptedMessage || longPressMenuMessage.encryptedMessage);
                        setLongPressMenuMessage(null);
                        setLongPressMenuRect(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Make AI image</span>
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </button>
                  )}

                  {/* Translate */}
                  {longPressMenuMessage.messageType === 'text' && (
                    <button
                      onClick={() => {
                        handleTranslateMessage(longPressMenuMessage);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-medium">Translate</span>
                      <Languages className="w-4 h-4 text-white/50" />
                    </button>
                  )}

                  {/* Unsend (Delete) */}
                  {isMine && (
                    <button
                      onClick={() => {
                        setDeleteModal({ message: longPressMenuMessage, open: true });
                        setLongPressMenuMessage(null);
                        setLongPressMenuRect(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/15 transition-colors text-left cursor-pointer"
                    >
                      <span className="font-semibold">Unsend</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* More */}
                  <button
                    onClick={() => {
                      alert(`Message ID: ${longPressMenuMessage.id}\nSender: ${longPressMenuMessage.senderName}\nType: ${longPressMenuMessage.messageType}\nCreated At: ${new Date(longPressMenuMessage.createdAt).toLocaleString()}`);
                      setLongPressMenuMessage(null);
                      setLongPressMenuRect(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left border-t border-white/10 mt-1 cursor-pointer"
                  >
                    <span className="font-medium">More</span>
                    <MoreHorizontal className="w-4 h-4 text-white/50" />
                  </button>
                </>
              ) : (
                // Translate language options
                <>
                  <div className="px-4 py-2 text-center border-b border-white/10 flex justify-between items-center">
                    <button 
                      onClick={() => setMenuView('main')}
                      className="text-xs font-semibold text-blue-400 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <span className="text-[11px] font-semibold text-white/50">
                      Translate
                    </span>
                    <div className="w-8" />
                  </div>
                  {[
                    { code: 'es', name: 'Spanish' },
                    { code: 'fr', name: 'French' },
                    { code: 'de', name: 'German' },
                    { code: 'hi', name: 'Hindi' },
                    { code: 'ta', name: 'Tamil' },
                    { code: 'en', name: 'English' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => fetchTranslation(longPressMenuMessage, lang.code)}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {lang.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── FORWARD MESSAGE DIALOG ── */}
      {forwardModalOpen && messageToForward && (
        <div 
          className="fixed inset-0 bg-[#07090e]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setForwardModalOpen(false);
            setMessageToForward(null);
          }}
        >
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border/20 flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">Forward Message</h3>
              <button 
                onClick={() => { setForwardModalOpen(false); setMessageToForward(null); }}
                className="p-1 hover:bg-muted rounded-lg transition-colors text-foreground/50 hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 border-b border-border/10 bg-muted/20">
              <p className="text-xs text-foreground/50 font-semibold mb-1">FORWARDING CONTENT</p>
              <p className="text-xs text-foreground/80 italic line-clamp-2 bg-background/50 p-2 rounded-lg border border-border/20">
                &ldquo;{messageToForward.decryptedMessage || messageToForward.encryptedMessage}&rdquo;
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground/40 px-2 uppercase">Select Chat</p>
              {chatsList.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-8">No other chats available</p>
              ) : (
                chatsList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleForwardToChat(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-all active:scale-[0.98] text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-xs text-primary group-hover:bg-primary/20 transition-colors">
                      {c.recipientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.recipientName}</p>
                    </div>
                    <Send className="w-4 h-4 text-foreground/30 rotate-[-30deg] group-hover:text-primary transition-all duration-150" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Manager */}
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}
