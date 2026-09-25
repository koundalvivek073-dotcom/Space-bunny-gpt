import React from 'react';
import { MarkdownRenderer, CodeBlock } from './MarkdownRenderer';

interface FormattedMessageProps {
  content: string;
  isStreaming?: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, isStreaming }) => {
  if (!content) return null;

  // Split content by code fences: ```language\ncode\n```
  const parts: Array<{ type: 'markdown' | 'code'; text: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-\+\#]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        text: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'text',
      text: match[2],
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    // Check if there is an unclosed code block during streaming
    const remaining = content.slice(lastIndex);
    const unclosedMatch = remaining.match(/^```([a-zA-Z0-9_\-\+\#]*)\n([\s\S]*)$/);
    if (unclosedMatch && isStreaming) {
      parts.push({
        type: 'code',
        language: unclosedMatch[1] || 'text',
        text: unclosedMatch[2],
      });
    } else {
      parts.push({
        type: 'markdown',
        text: remaining,
      });
    }
  }

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={`code-${index}`}
              language={part.language}
              text={part.text.replace(/\n$/, '')}
            />
          );
        }
        return (
          <MarkdownRenderer
            key={`md-${index}`}
            content={part.text}
            isStreaming={isStreaming}
          />
        );
      })}
    </div>
  );
};
