'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeToReply: () => void;
  onLongPress?: (rect: DOMRect) => void;
  isMine: boolean;
  disabled?: boolean;
}

export function SwipeableMessage({
  children,
  onSwipeToReply,
  onLongPress,
  isMine,
  disabled = false,
}: SwipeableMessageProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isThresholdReached, setIsThresholdReached] = useState(false);

  // Refs to track drag state across events without triggering re-renders
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isSwipingHorizontalRef = useRef(false);
  const hasSwipedDirectionRef = useRef(false);
  const hasVibratedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const threshold = 60;
  const maxSwipe = 100;

  // Handle visual and haptic feedback when crossing threshold
  useEffect(() => {
    if (swipeOffset >= threshold) {
      if (!isThresholdReached) {
        setIsThresholdReached(true);
        // Play haptic feedback once when threshold is crossed
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate(12);
          } catch (e) {
            // Ignore security or permission errors for vibration
          }
        }
      }
    } else {
      if (isThresholdReached) {
        setIsThresholdReached(false);
      }
    }
  }, [swipeOffset, isThresholdReached]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasSwipedDirectionRef.current = false;
    isSwipingHorizontalRef.current = false;
    hasVibratedRef.current = false;

    // Start long press detection (500ms timeout)
    if (onLongPress) {
      longPressTimeoutRef.current = setTimeout(() => {
        if (isDraggingRef.current && !isSwipingHorizontalRef.current) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            onLongPress(rect);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              try { window.navigator.vibrate(15); } catch (_) {}
            }
          }
          // Reset dragging state so swipe doesn't trigger after long press
          isDraggingRef.current = false;
          setIsDragging(false);
          setSwipeOffset(0);
        }
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    // Cancel long press if user moves finger significantly (e.g. scrolling)
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }

    // Detect gesture direction once threshold movement is made
    if (!hasSwipedDirectionRef.current) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasSwipedDirectionRef.current = true;
        // If horizontal movement is dominant, lock into swiping mode
        if (Math.abs(dx) > Math.abs(dy) * 1.3) {
          isSwipingHorizontalRef.current = true;
        }
      }
    }

    if (isSwipingHorizontalRef.current) {
      // Only allow swiping to the right (positive dx)
      let offset = Math.max(0, dx);

      // Prevent default browser behavior (scrolling) during active horizontal swipe
      if (e.cancelable) {
        e.preventDefault();
      }

      // Apply resistance/rubber-banding past threshold
      if (offset > 70) {
        offset = 70 + (offset - 70) * 0.35;
      }

      // Clamp to absolute max swipe distance
      offset = Math.min(offset, maxSwipe);
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (isDraggingRef.current) {
      if (isSwipingHorizontalRef.current && swipeOffset >= threshold) {
        onSwipeToReply();
      }
      // Animate back to original position
      setSwipeOffset(0);
      setIsDragging(false);
      setIsThresholdReached(false);
      isDraggingRef.current = false;
    }
  };

  // Mouse Drag Handlers (for desktop browser preview / cross-device premium feeling)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return; // Only left click

    // Don't swipe if clicking interactive elements inside the bubble (buttons, dropdowns, links, etc.)
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="menu"]')
    ) {
      return;
    }

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasSwipedDirectionRef.current = false;
    isSwipingHorizontalRef.current = false;
    hasVibratedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const dx = moveEvent.clientX - startXRef.current;
      const dy = moveEvent.clientY - startYRef.current;

      if (!hasSwipedDirectionRef.current) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          hasSwipedDirectionRef.current = true;
          if (Math.abs(dx) > Math.abs(dy) * 1.3) {
            isSwipingHorizontalRef.current = true;
            // Prevent text selection during active desktop swipe
            document.body.style.userSelect = 'none';
          }
        }
      }

      if (isSwipingHorizontalRef.current) {
        let offset = Math.max(0, dx);
        
        if (offset > 70) {
          offset = 70 + (offset - 70) * 0.35;
        }
        
        offset = Math.min(offset, maxSwipe);
        setSwipeOffset(offset);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      cleanup();

      if (isDraggingRef.current) {
        if (isSwipingHorizontalRef.current && swipeOffset >= threshold) {
          onSwipeToReply();
        }
        setSwipeOffset(0);
        setIsDragging(false);
        setIsThresholdReached(false);
        isDraggingRef.current = false;
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled || !onLongPress) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      onLongPress(rect);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(15); } catch (_) {}
      }
    }
  };

  return (
    <div
      className="relative w-full overflow-visible select-none"
      style={{ touchAction: 'pan-y' }}
    >
      <div
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} relative overflow-visible`}
      >
        {/* Reply indicator positioned dynamically next to the bubble */}
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 mr-3 pointer-events-none flex items-center justify-center"
          style={{
            opacity: Math.min(swipeOffset / 50, 1),
            transform: `translateY(-50%) scale(${Math.min(0.6 + (swipeOffset / 50) * 0.4, 1.1)})`,
            transition: isDragging ? 'none' : 'opacity 200ms ease, transform 200ms ease',
          }}
        >
          <div
            className={`p-2 rounded-full flex items-center justify-center transition-all duration-200 ${
              isThresholdReached
                ? 'bg-primary text-primary-foreground scale-110 shadow-md ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
            }`}
            style={{
              transition: 'all 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <Reply className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* The child (message bubble) */}
        <div ref={containerRef} onContextMenu={handleContextMenu} className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
