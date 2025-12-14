import type { Issue } from '../types';

export function applyIssue(text: string, issue: Issue): { newText: string; offsetDelta: number } {
  const { start, end } = issue.span;
  const before = text.slice(0, start);
  const after = text.slice(end);
  const newText = before + issue.suggestion + after;
  const offsetDelta = issue.suggestion.length - (end - start);
  return { newText, offsetDelta };
}

export function shiftIssues(issues: Issue[], appliedIssue: Issue, offsetDelta: number): Issue[] {
  return issues
    .filter(i => i.id !== appliedIssue.id) // Remove applied
    .map(i => {
      // If issue was fully before the applied one, no change.
      if (i.span.end <= appliedIssue.span.start) {
        return i;
      }

      // If issue overlaps... strictly speaking we should invalidate it or warn.
      // For now, if it overlaps, we'll mark it as potentially invalid or just leave it (it might look weird).
      // Let's simpler logic: if it starts after the applied one's old end, shift it.
      if (i.span.start >= appliedIssue.span.end) {
        return {
          ...i,
          span: {
            start: i.span.start + offsetDelta,
            end: i.span.end + offsetDelta,
          },
        };
      }

      // Overlap case: The text content changed "underneath" this issue.
      // Ideally we delete it or re-verify.
      // Let's just return it as is but it might be broken.
      // Or maybe filter it out? Filtering out is safer to avoid applying garbage.
      // But maybe user wants to see it.
      // Let's keep it but it might point to wrong text.
      // Actually, let's just shift start/end by delta if start >= applied.end.
      // If it overlaps, it's tricky.
      // Safety: filter out overlapping issues.
      if (i.span.start < appliedIssue.span.end && i.span.end > appliedIssue.span.start) {
        // Overlapping. Remove it to be safe.
        return null;
      }
      return i;
    })
    .filter((i): i is Issue => i !== null);
}
