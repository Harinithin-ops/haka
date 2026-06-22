'use client';

import React from 'react';

interface TypingIndicatorProps {
  userName: string;
  isVisible: boolean;
}

export function TypingIndicator({ userName, isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <p className="text-sm text-foreground/70">{userName} is typing</p>
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
