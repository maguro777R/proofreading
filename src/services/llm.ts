
import type { ProofreadResult } from '../types';


export async function analyzeText(text: string, apiKey: string): Promise<ProofreadResult> {
  // Call the local backend (which now handles spaCy + LanguageTool + OpenAI)
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        apiKey, // Pass the key to the backend
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend error: ${response.status}`);
    }

    const result = await response.json();
    return result as ProofreadResult;
  } catch (error) {
    console.error('Proofreading failed:', error);
    throw error;
  }
}
