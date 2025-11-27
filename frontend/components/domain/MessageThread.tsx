/**
 * MessageThread Component (Issue #94)
 *
 * Chat/messaging interface for communication between job seekers and employers
 * Used in employer-candidate conversations and interview scheduling discussions
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/domain/EmptyState';
import { Send } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

export interface MessageSender {
  id: string;
  name?: string;
  avatar?: string;
  type: 'employer' | 'seeker';
}

export interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: Date;
  read: boolean;
}

export interface MessageThreadProps {
  /** Messages to display */
  messages: Message[];
  /** Current user ID to determine message alignment */
  currentUserId: string;
  /** Callback when sending a new message */
  onSend?: (content: string) => void;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to show date separators */
  showDateSeparators?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Maximum height for scroll container */
  maxHeight?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get initials from name
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format timestamp
 */
function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

/**
 * Format date separator
 */
function formatDateSeparator(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
  showAvatars = true,
  showTimestamps = false,
  showDateSeparators = false,
  emptyMessage = 'No messages yet',
  loading = false,
  maxHeight = 600,
  className,
}: MessageThreadProps) {
  const [messageInput, setMessageInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (trimmed && onSend && !loading) {
      onSend(trimmed);
      setMessageInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (messages.length === 0 && !loading) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyState title={emptyMessage} variant="compact" showIcon={false} />
        {onSend && (
          <div className="mt-4 flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              aria-label="Message input"
            />
            <Button onClick={handleSend} disabled={loading || !messageInput.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Group messages by date if showing separators
  const messageGroups: { date: Date; messages: Message[] }[] = [];
  if (showDateSeparators) {
    messages.forEach((message) => {
      const lastGroup = messageGroups[messageGroups.length - 1];
      if (!lastGroup || !isSameDay(lastGroup.date, message.timestamp)) {
        messageGroups.push({ date: message.timestamp, messages: [message] });
      } else {
        lastGroup.messages.push(message);
      }
    });
  }

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {/* Messages Container */}
      <div
        ref={scrollRef}
        data-scroll-container
        className="flex-1 overflow-y-auto space-y-4 p-4"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {loading && (
          <div
            role="status"
            aria-label="Loading"
            className="flex items-center justify-center py-8"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && showDateSeparators ? (
          // Render with date separators
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formatDateSeparator(group.date)}
                </span>
              </div>

              {/* Messages for this date */}
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender.id === currentUserId}
                  showAvatar={showAvatars}
                  showTimestamp={showTimestamps}
                />
              ))}
            </div>
          ))
        ) : (
          // Render without date separators
          !loading &&
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.sender.id === currentUserId}
              showAvatar={showAvatars}
              showTimestamp={showTimestamps}
            />
          ))
        )}
      </div>

      {/* Message Input */}
      {onSend && (
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              aria-label="Message input"
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading || !messageInput.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual message bubble component
 */
function MessageBubble({
  message,
  isCurrentUser,
  showAvatar,
  showTimestamp,
}: {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
}) {
  return (
    <div
      data-message-id={message.id}
      role="article"
      aria-label={`Message from ${message.sender.name || 'Unknown'}`}
      className={cn('flex gap-3', isCurrentUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar (left side for others) */}
      {!isCurrentUser && showAvatar && (
        <Avatar data-message-avatar className="flex-shrink-0">
          {message.sender.avatar && <AvatarImage src={message.sender.avatar} alt={message.sender.name} />}
          <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn('flex flex-col max-w-[70%]', isCurrentUser && 'items-end')}>
        {/* Sender Name */}
        {!isCurrentUser && message.sender.name && (
          <span className="text-xs text-muted-foreground mb-1">{message.sender.name}</span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 break-words',
            isCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp and Read Status */}
        <div className="flex items-center gap-2 mt-1">
          {showTimestamp && (
            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
          )}
          {!message.read && isCurrentUser && (
            <span data-unread-indicator className="text-xs text-muted-foreground">
              Unread
            </span>
          )}
        </div>
      </div>

      {/* Avatar (right side for current user) */}
      {isCurrentUser && showAvatar && (
        <Avatar data-message-avatar className="flex-shrink-0">
          {message.sender.avatar && <AvatarImage src={message.sender.avatar} alt={message.sender.name} />}
          <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
