import React from 'react';
import type { Issue } from '../types';
import { Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

interface ReviewPanelProps {
  issues: Issue[];
  onAccept: (issue: Issue) => void;
  onReject: (issue: Issue) => void;
  onHover: (issueId: string | null) => void;
  hoveredIssueId: string | null;
}

const severityColor = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-orange-600 bg-orange-50 border-orange-200',
  low: 'text-blue-600 bg-blue-50 border-blue-200',
};

const typeIcon = {
  typo: AlertCircle,
  omission: AlertTriangle,
  orthography: Info,
  variant: Info,
  idiom: AlertTriangle,
  grammar: AlertCircle,
  style: Info,
}; // Simplified map

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ issues, onAccept, onReject, onHover, hoveredIssueId }) => {
  if (issues.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        指摘事項はありません。
        <br />
        <span className="text-sm">（AIによる校正結果がここに表示されます）</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="font-bold text-lg mb-2">指摘リスト ({issues.length})</h2>
      {issues.map((issue) => {
        const Icon = typeIcon[issue.type] || Info;
        const isHovered = hoveredIssueId === issue.id;

        return (
          <div
            key={issue.id}
            className={clsx(
              "p-3 rounded-lg border transition-all duration-200",
              severityColor[issue.severity],
              isHovered ? "ring-2 ring-offset-1 ring-blue-400 shadow-md" : "border-opacity-50"
            )}
            onMouseEnter={() => onHover(issue.id)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Icon size={16} />
                <span className="capitalize">{issue.type}</span>
              </div>
              <span className="text-xs uppercase tracking-wider font-bold opacity-70">{issue.severity}</span>
            </div>

            <div className="mb-2 text-sm">
              <div className="line-through opacity-60 text-xs">{issue.original}</div>
              <div className="font-bold text-base flex items-center gap-2">
                {issue.suggestion}
              </div>
            </div>

            <p className="text-xs opacity-90 mb-3 leading-relaxed">
              {issue.reason}
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => onReject(issue)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white bg-opacity-50 hover:bg-opacity-100 transition-colors text-gray-700"
              >
                <X size={14} />
                無視
              </button>
              <button
                onClick={() => onAccept(issue)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-white shadow-sm hover:shadow transition-shadow text-green-700"
              >
                <Check size={14} />
                適用
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
