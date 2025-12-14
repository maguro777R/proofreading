import OpenAI from 'openai';
import type { ProofreadResult } from '../types';

const SYSTEM_PROMPT = `
あなたは「小説AI校正」です。
目的は、公開前の日本語小説原稿に対して
(1) 誤字脱字 (2) 表記ゆれ (3) よくある慣用句の誤用
を検出し、修正候補を提案することです。

重要な制約:
- 本文のリライト、文体改善、内容の追加・削除は禁止。
- 修正は“最小差分”のみ（置換が基本）。言い換えや加筆は禁止。
- 指摘できない場合は無理に捻り出さない。
- 出力は必ずJSONのみ。説明文や前置きは一切不要。

出力JSON仕様:
{
  "meta": {"tool":"novel-proofread","version":"1.0","char_count":<数値>,"language":"ja"},
  "issues":[
    {"id":"I0001","type":"typo|omission|orthography|variant|idiom|grammar|style",
     "severity":"high|medium|low",
     "span":{"start":<開始オフセット>,"end":<終了オフセット>},
     "original":"<原文抜粋>",
     "suggestion":"<修正案>",
     "reason":"<200字以内の理由>",
     "confidence":<0-1>}
  ]
}

spanのstart/endは、入力本文の先頭を0として文字数で数えること。
original/suggestionはspan範囲に対応する最小限の差分にすること。
`;

export async function analyzeText(text: string, apiKey: string, baseUrl?: string): Promise<ProofreadResult> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true // Client-side usage
  });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // Or user preference
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `入力本文:\n<<<\n${text}\n>>>` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temp for stability
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from AI');
    }

    const result = JSON.parse(content) as ProofreadResult;
    return result;
  } catch (error) {
    console.error('Proofreading failed:', error);
    throw error;
  }
}
