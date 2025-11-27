/**
 * MessageThread Component Tests (Issue #94)
 *
 * TDD/BDD approach for chat/messaging interface component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageThread } from '@/components/domain/MessageThread';

const mockMessages = [
  {
    id: '1',
    content: 'Hello! I saw your application for the Senior Engineer role.',
    sender: {
      id: 'employer1',
      name: 'Jane Recruiter',
      avatar: 'https://example.com/avatar1.jpg',
      type: 'employer' as const,
    },
    timestamp: new Date('2024-01-15T10:00:00Z'),
    read: true,
  },
  {
    id: '2',
    content: 'Hi Jane! Thank you for reaching out. I\'m very interested in the position.',
    sender: {
      id: 'seeker1',
      name: 'John Candidate',
      avatar: 'https://example.com/avatar2.jpg',
      type: 'seeker' as const,
    },
    timestamp: new Date('2024-01-15T10:15:00Z'),
    read: true,
  },
  {
    id: '3',
    content: 'Great! Can you tell me about your experience with React?',
    sender: {
      id: 'employer1',
      name: 'Jane Recruiter',
      type: 'employer' as const,
    },
    timestamp: new Date('2024-01-15T10:20:00Z'),
    read: false,
  },
];

describe('MessageThread', () => {
  describe('Basic Rendering', () => {
    it('should render all messages', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      expect(screen.getByText(/Hello! I saw your application/)).toBeInTheDocument();
      expect(screen.getByText(/Thank you for reaching out/)).toBeInTheDocument();
      expect(screen.getByText(/Can you tell me about your experience/)).toBeInTheDocument();
    });

    it('should render sender names', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      expect(screen.getByText('Jane Recruiter')).toBeInTheDocument();
      expect(screen.getByText('John Candidate')).toBeInTheDocument();
    });

    it('should render timestamps', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" showTimestamps />);
      // Should show some form of time display
      const timestamps = screen.getAllByText(/10:/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('Message Alignment', () => {
    it('should align current user messages to the right', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const myMessage = container.querySelector('[data-message-id="2"]');
      expect(myMessage).toHaveClass('justify-end');
    });

    it('should align other user messages to the left', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const theirMessage = container.querySelector('[data-message-id="1"]');
      expect(theirMessage).toHaveClass('justify-start');
    });
  });

  describe('Avatar Display', () => {
    it('should show avatars when showAvatars is true', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" showAvatars />);
      const avatars = container.querySelectorAll('[data-message-avatar]');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('should hide avatars when showAvatars is false', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" showAvatars={false} />);
      const avatars = container.querySelectorAll('[data-message-avatar]');
      expect(avatars.length).toBe(0);
    });

    it('should show avatar fallback when no avatar URL', () => {
      const messages = [{
        ...mockMessages[2],
        sender: { ...mockMessages[2].sender, avatar: undefined },
      }];
      render(<MessageThread messages={messages} currentUserId="seeker1" showAvatars />);
      expect(screen.getByText('JR')).toBeInTheDocument(); // Initials
    });
  });

  describe('Read/Unread Status', () => {
    it('should show unread indicator for unread messages', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const unreadMessage = container.querySelector('[data-message-id="3"]');
      const unreadIndicator = unreadMessage?.querySelector('[data-unread-indicator]');
      expect(unreadIndicator).toBeInTheDocument();
    });

    it('should not show unread indicator for read messages', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const readMessage = container.querySelector('[data-message-id="1"]');
      const unreadIndicator = readMessage?.querySelector('[data-unread-indicator]');
      expect(unreadIndicator).not.toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('should render message input when onSend provided', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={() => {}} />);
      expect(screen.getByPlaceholderText(/type.*message/i)).toBeInTheDocument();
    });

    it('should not render input when onSend not provided', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      expect(screen.queryByPlaceholderText(/type.*message/i)).not.toBeInTheDocument();
    });

    it('should call onSend with message content when submitted', async () => {
      const onSend = jest.fn();
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={onSend} />);

      const input = screen.getByPlaceholderText(/type.*message/i);
      await userEvent.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending', async () => {
      const onSend = jest.fn();
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={onSend} />);

      const input = screen.getByPlaceholderText(/type.*message/i) as HTMLInputElement;
      await userEvent.type(input, 'Test message');
      await userEvent.click(screen.getByRole('button', { name: /send/i }));

      expect(input.value).toBe('');
    });

    it('should not send empty messages', async () => {
      const onSend = jest.fn();
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={onSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should send message on Enter key', async () => {
      const onSend = jest.fn();
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={onSend} />);

      const input = screen.getByPlaceholderText(/type.*message/i);
      await userEvent.type(input, 'Test message{Enter}');

      expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('should not send on Shift+Enter', async () => {
      const onSend = jest.fn();
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={onSend} />);

      const input = screen.getByPlaceholderText(/type.*message/i);
      await userEvent.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no messages', () => {
      render(<MessageThread messages={[]} currentUserId="user1" />);
      expect(screen.getByText(/no messages/i)).toBeInTheDocument();
    });

    it('should show custom empty message when provided', () => {
      render(<MessageThread messages={[]} currentUserId="user1" emptyMessage="Start a conversation" />);
      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    });
  });

  describe('Date Separators', () => {
    it('should show date separator for different days', () => {
      const messagesWithDates = [
        { ...mockMessages[0], timestamp: new Date('2024-01-15T10:00:00Z') },
        { ...mockMessages[1], timestamp: new Date('2024-01-16T10:00:00Z') },
      ];
      render(<MessageThread messages={messagesWithDates} currentUserId="seeker1" showDateSeparators />);
      expect(screen.getByText(/Jan.*15/)).toBeInTheDocument();
      expect(screen.getByText(/Jan.*16/)).toBeInTheDocument();
    });

    it('should not show date separators when disabled', () => {
      const messagesWithDates = [
        { ...mockMessages[0], timestamp: new Date('2024-01-15T10:00:00Z') },
        { ...mockMessages[1], timestamp: new Date('2024-01-16T10:00:00Z') },
      ];
      render(<MessageThread messages={messagesWithDates} currentUserId="seeker1" showDateSeparators={false} />);
      // Should not show date headings
      const dates = screen.queryAllByText(/Jan.*15/);
      expect(dates.length).toBe(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={() => {}} loading />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Scroll Behavior', () => {
    it('should have scroll container', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const scrollContainer = container.querySelector('[data-scroll-container]');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for messages', () => {
      const { container } = render(<MessageThread messages={mockMessages} currentUserId="seeker1" />);
      const messages = container.querySelectorAll('[role="article"]');
      expect(messages.length).toBe(mockMessages.length);
    });

    it('should have accessible send button', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={() => {}} />);
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toHaveAccessibleName();
    });

    it('should have proper label for input', () => {
      render(<MessageThread messages={mockMessages} currentUserId="seeker1" onSend={() => {}} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = {
        ...mockMessages[0],
        content: 'A'.repeat(1000),
      };
      render(<MessageThread messages={[longMessage]} currentUserId="seeker1" />);
      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle messages without sender names', () => {
      const noNameMessage = {
        ...mockMessages[0],
        sender: { ...mockMessages[0].sender, name: undefined },
      };
      render(<MessageThread messages={[noNameMessage]} currentUserId="seeker1" />);
      // Should render without errors
      expect(screen.getByText(/Hello! I saw your application/)).toBeInTheDocument();
    });

    it('should handle many messages', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessages[0],
        id: String(i),
        content: `Message ${i}`,
      }));
      const { container } = render(<MessageThread messages={manyMessages} currentUserId="seeker1" />);
      const messageElements = container.querySelectorAll('[role="article"]');
      expect(messageElements.length).toBe(100);
    });
  });
});
