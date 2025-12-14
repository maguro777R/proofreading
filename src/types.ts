export type IssueType =
  | 'typo'
  | 'omission'
  | 'orthography'
  | 'variant'
  | 'idiom'
  | 'grammar'
  | 'style';

export type Severity = 'high' | 'medium' | 'low';

export interface Span {
  start: number;
  end: number;
}

export interface Issue {
  id: string;
  type: IssueType;
  severity: Severity;
  span: Span;
  original: string;
  suggestion: string;
  reason: string;
  confidence?: number;
}

export interface ProofreadResult {
  meta: {
    tool: string;
    version: string;
    text_id?: string;
    char_count: number;
    language: 'ja';
  };
  issues: Issue[];
}
