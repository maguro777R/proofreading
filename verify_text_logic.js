
function applyIssue(text, issue) {
  const { start, end } = issue.span;
  const before = text.slice(0, start);
  const after = text.slice(end);
  const newText = before + issue.suggestion + after;
  const offsetDelta = issue.suggestion.length - (end - start);
  return { newText, offsetDelta };
}

function shiftIssues(issues, appliedIssue, offsetDelta) {
  return issues
    .filter(i => i.id !== appliedIssue.id)
    .map(i => {
      if (i.span.end <= appliedIssue.span.start) return i;
      if (i.span.start >= appliedIssue.span.end) {
        return {
          ...i,
          span: {
            start: i.span.start + offsetDelta,
            end: i.span.end + offsetDelta,
          },
        };
      }
      return null;
    })
    .filter(i => i !== null);
}

// Test
const text = "0123456789";
const issue1 = { id: "1", span: { start: 2, end: 4 }, suggestion: "XX" }; // "23" -> "XX" (len 2->2, delta 0)
const issue2 = { id: "2", span: { start: 5, end: 7 }, suggestion: "YYY" }; // "56" -> "YYY"

console.log("Original:", text);

// Apply issue1
const r1 = applyIssue(text, issue1);
console.log("Applied 1:", r1.newText);
console.log("Delta:", r1.offsetDelta);

const shifted = shiftIssues([issue1, issue2], issue1, r1.offsetDelta);
console.log("Shifted issues:", JSON.stringify(shifted));

// Test with delta
const issue3 = { id: "3", span: { start: 2, end: 4 }, suggestion: "XXX" }; // "23" -> "XXX" (len 2->3, delta +1)
const r2 = applyIssue(text, issue3);
console.log("Applied 3:", r2.newText);
console.log("Delta:", r2.offsetDelta);

const shifted2 = shiftIssues([issue3, issue2], issue3, r2.offsetDelta);
console.log("Shifted issues 2:", JSON.stringify(shifted2));
