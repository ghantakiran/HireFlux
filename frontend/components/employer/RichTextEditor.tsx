/**
 * Rich Text Editor Component - Sprint 19-20 Week 39 Day 4 - Issue #21
 *
 * Simple rich text editor for company description with:
 * - Bold, Italic, Underline formatting
 * - Bullet lists, Numbered lists
 * - Headers (H2, H3)
 * - Character count with limit (5000)
 * - Markdown-style output
 *
 * Note: This is a lightweight implementation. For production,
 * consider migrating to TipTap, Slate, or React Quill for advanced features.
 *
 * BDD Scenarios:
 * - Format text with bold, italic formatting
 * - Create bullet and numbered lists
 * - Add headers
 * - Character limit validation
 */

'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  maxLength = 5000,
  placeholder = 'Enter company description...',
  className = '',
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Wrap selected text
      newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
      newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    } else {
      // Insert formatting markers
      const placeholderText = 'text';
      newText = `${beforeText}${prefix}${placeholderText}${suffix}${afterText}`;
      newCursorPos = start + prefix.length + placeholderText.length;
    }

    onChange(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertListItem = (listType: 'bullet' | 'numbered') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = value.substring(0, start);
    const afterText = value.substring(start);

    // Check if we're at the start of a line
    const lastNewline = beforeText.lastIndexOf('\n');
    const isStartOfLine = lastNewline === start - 1 || start === 0;

    const prefix = listType === 'bullet' ? '- ' : '1. ';
    const newText = isStartOfLine
      ? `${beforeText}${prefix}${afterText}`
      : `${beforeText}\n${prefix}${afterText}`;

    const newCursorPos = isStartOfLine ? start + prefix.length : start + prefix.length + 1;

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertHeading = (level: 2 | 3) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const prefix = '#'.repeat(level) + ' ';
    const headingText = selectedText || 'Heading';

    // Check if we're at the start of a line
    const lastNewline = beforeText.lastIndexOf('\n');
    const isStartOfLine = lastNewline === start - 1 || start === 0;

    const newText = isStartOfLine
      ? `${beforeText}${prefix}${headingText}${afterText}`
      : `${beforeText}\n${prefix}${headingText}${afterText}`;

    const newCursorPos = isStartOfLine
      ? start + prefix.length + headingText.length
      : start + prefix.length + headingText.length + 1;

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const characterCount = value.length;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Formatting Toolbar */}
      <div
        className={`flex items-center gap-1 p-2 border rounded-t-md bg-gray-50 transition-colors ${
          isFocused ? 'border-blue-500' : 'border-gray-300'
        }`}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('**', '**')}
          title="Bold"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('*', '*')}
          title="Italic"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('__', '__')}
          title="Underline"
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertHeading(2)}
          title="Heading 2"
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertHeading(3)}
          title="Heading 3"
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertListItem('bullet')}
          title="Bullet List"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertListItem('numbered')}
          title="Numbered List"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="ml-auto text-sm text-gray-500">
          {characterCount} / {maxLength}
        </div>
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`min-h-[200px] font-mono text-sm resize-y rounded-t-none ${
          isOverLimit ? 'border-red-500' : ''
        } ${isFocused ? 'border-blue-500' : ''}`}
        maxLength={maxLength}
      />

      {/* Character Limit Warning */}
      {isOverLimit && (
        <p className="text-sm text-red-600">
          Description exceeds maximum length by {characterCount - maxLength} characters
        </p>
      )}

      {/* Markdown Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-semibold">Markdown formatting supported:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>**bold** or *italic* text</li>
          <li>## Heading 2 or ### Heading 3</li>
          <li>- Bullet list or 1. Numbered list</li>
        </ul>
      </div>
    </div>
  );
}
