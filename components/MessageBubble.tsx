'use client';

import React from 'react';
import { Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  id: string;
  content: string;
  senderName: string;
  isOwn: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  messageType?: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
}

export function MessageBubble({
  id,
  content,
  senderName,
  isOwn,
  status,
  timestamp,
  messageType = 'text',
  fileUrl,
}: MessageBubbleProps) {
  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400 animate-pulse" title="Sending..." />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" title="Not sent" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" title="Read" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" title="Delivered" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" title="Sent" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (messageType) {
      case 'image':
        return (
          <img
            src={fileUrl}
            alt="Message image"
            className="max-w-xs rounded-lg"
          />
        );
      case 'audio':
        return (
          <audio
            controls
            className="w-48"
            src={fileUrl}
          />
        );
      case 'file':
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline break-all"
          >
            📎 {fileUrl.split('/').pop()}
          </a>
        );
      default:
        return <p className="text-sm break-words">{content}</p>;
    }
  };

  return (
    <div
      className={`flex gap-3 mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex flex-col gap-1 max-w-xs lg:max-w-md ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-semibold text-foreground/70">{senderName}</p>
        )}
        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-foreground rounded-bl-none'
          }`}
        >
          {renderContent()}
        </div>
        <div
          className={`flex items-center gap-2 text-xs text-foreground/50 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
}
