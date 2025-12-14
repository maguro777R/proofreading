import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { Issue } from '../types';
import clsx from 'clsx';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  issues: Issue[];
  hoveredIssueId: string | null;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, issues, hoveredIssueId }) => {
  // Styles that must be identical for both layers
  const typography = "font-mono text-base leading-relaxed break-words whitespace-pre-wrap";
  const spacing = "p-8"; // Generous padding

  // Render the highlights background
  const renderHighlights = () => {
    // Sort issues by start position just in case
    const sortedIssues = [...issues].sort((a, b) => a.span.start - b.span.start);

    const elements = [];
    let lastIndex = 0;

    sortedIssues.forEach((issue) => {
      // 1. Text before the issue (transparent)
      if (issue.span.start > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`} className="text-transparent">
            {value.slice(lastIndex, issue.span.start)}
          </span>
        );
      }

      // 2. The issue text (highlighted background, transparent text)
      const isActive = hoveredIssueId === issue.id;
      elements.push(
        <mark
          key={issue.id}
          className={clsx(
            "text-transparent rounded px-0.5 -mx-0.5 transition-colors duration-200",
            isActive ? "bg-yellow-300 bg-opacity-80" : "bg-yellow-100 bg-opacity-60",
            // Add a subtle border or underline if needed
            isActive ? "border-b-2 border-yellow-500" : "border-b-2 border-yellow-200"
          )}
        >
          {value.slice(issue.span.start, issue.span.end)}
        </mark>
      );

      lastIndex = issue.span.end;
    });

    // 3. Remaining text
    if (lastIndex < value.length) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-transparent">
          {value.slice(lastIndex)}
        </span>
      );
    }

    // Always add a trailing space/newline to matching height if user types at end
    // But whitespace-pre-wrap handles it usually.
    // Sometimes a trailing newline in textarea doesn't push height, but in div it does.
    // We append a zero-width space or break if ending with \n? 
    // Actually, just rendering the exact value usually works for pre-wrap.
    if (value.endsWith('\n')) {
      elements.push(<span key="trailing-break" className="text-transparent">{'\n'}</span>);
    }

    return elements;
  };

  return (
    <div className="relative w-full min-h-[500px] border rounded-xl bg-white shadow-sm overflow-hidden text-gray-800">
      {/* Container for the grid alignment */}
      <div className="grid">
        {/* Layer 1: Backdrop (Highlights) */}
        <div
          aria-hidden="true"
          className={clsx(
            "col-start-1 row-start-1 select-none pointer-events-none z-0",
            typography,
            spacing
          )}
        >
          {renderHighlights()}
        </div>

        {/* Layer 2: Textarea (Content) */}
        <TextareaAutosize
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ここに小説の本文を入力してください..."
          className={clsx(
            "col-start-1 row-start-1 z-10 bg-transparent resize-none focus:outline-none w-full h-full",
            typography,
            spacing,
            // Text color is normal here
          )}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
