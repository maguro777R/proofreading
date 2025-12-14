import os
import json
import logging
from typing import List, Optional, Literal
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import spacy
import language_tool_python
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- Data Models ---

class Span(BaseModel):
    start: int
    end: int

class Issue(BaseModel):
    id: str
    type: str # typo, omission, orthography, variant, idiom, grammar, style
    severity: Literal['high', 'medium', 'low']
    span: Span
    original: str
    suggestion: str
    reason: str
    confidence: Optional[float] = None

class ProofreadMeta(BaseModel):
    tool: str
    version: str
    char_count: int
    language: Literal['ja']

class ProofreadResult(BaseModel):
    meta: ProofreadMeta
    issues: List[Issue]

class AnalyzeRequest(BaseModel):
    text: str
    apiKey: Optional[str] = None # OpenAI API Key

# --- Global Tools ---

nlp = None
lt_tool = None

def get_nlp():
    global nlp
    if nlp is None:
        try:
            logger.info("Loading spaCy model...")
            # Prefer ginza if available, else core_news_sm
            try:
                nlp = spacy.load("ja_ginza")
            except OSError:
                nlp = spacy.load("ja_core_news_sm")
        except OSError:
             logger.warning("No spaCy model found. Please run: python -m spacy download ja_core_news_sm")
    return nlp

def get_lt():
    global lt_tool
    if lt_tool is None:
        logger.info("Loading LanguageTool...")
        lt_tool = language_tool_python.LanguageTool('ja')
    return lt_tool

# --- Logic ---

@app.post("/analyze", response_model=ProofreadResult)
async def analyze_text(request: AnalyzeRequest):
    text = request.text
    merged_issues: List[Issue] = []
    
    # 1. LanguageTool Analysis
    try:
        tool = get_lt()
        matches = tool.check(text)
        for i, match in enumerate(matches):
            issue = Issue(
                id=f"LT{i:04d}",
                type="grammar",
                severity="medium",
                span=Span(start=match.offset, end=match.offset + match.errorLength),
                original=text[match.offset : match.offset + match.errorLength],
                suggestion=match.replacements[0] if match.replacements else "",
                reason=match.message,
                confidence=0.8
            )
            merged_issues.append(issue)
    except Exception as e:
        logger.error(f"LanguageTool error: {e}")

    # 2. spaCy Analysis (Simple checks example - can be expanded)
    # For now, we rely on LanguageTool for grammar, but spaCy is ready for more structural checks.
    nlp_model = get_nlp()
    if nlp_model:
        doc = nlp_model(text)
        # Example: Check for very long sentences (style)
        for sent in doc.sents:
            if len(sent.text) > 300:
                issue = Issue(
                    id=f"SPACY_LONG_{sent.start}",
                    type="style",
                    severity="low",
                    span=Span(start=sent.start_char, end=sent.end_char),
                    original=sent.text[:20] + "...",
                    suggestion="",
                    reason="文が長すぎます（300文字以上）。分割を検討してください。",
                    confidence=0.6
                )
                merged_issues.append(issue)

    # 3. LLM Analysis (OpenAI)
    if request.apiKey:
        try:
            client = OpenAI(api_key=request.apiKey)
            
            system_prompt = """
            あなたは「小説AI校正」です。
            目的は、公開前の日本語小説原稿に対して
            (1) 誤字脱字 (2) 表記ゆれ (3) よくある慣用句の誤用
            を検出し、修正候補を提案することです。
            
            重要な制約:
            - 本文のリライト、文体改善、内容の追加・削除は禁止。
            - 修正は“最小差分”のみ（置換が基本）。言い換えや加筆は禁止。
            - 指摘できない場合は無理に捻り出さない。
            - 出力は必ずJSONのみ。
            
            出力JSON仕様:
            {
              "issues": [
                {
                  "type": "typo|omission|orthography|variant|idiom|grammar|style",
                  "severity": "high|medium|low",
                  "span": {"start": <int>, "end": <int>},
                  "original": "<string>",
                  "suggestion": "<string>",
                  "reason": "<string>",
                  "confidence": <float>
                }
              ]
            }
            spanのstart/endは、入力本文の先頭を0として文字数で数えること。
            """
            
            response = client.chat.completions.create(
                model='gpt-4o',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f"入力本文:\n<<<\n{text}\n>>>"}
                ],
                response_format={'type': 'json_object'},
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            if content:
                llm_result = json.loads(content)
                for i, item in enumerate(llm_result.get('issues', [])):
                    # Validate and map to Issue model
                    try:
                        # Ensure span is valid
                        start = item['span']['start']
                        end = item['span']['end']
                        # Basic deduplication: Check if we already have an overlap with same type
                        is_duplicate = False
                        for existing in merged_issues:
                            if existing.span.start == start and existing.type == item['type']:
                                is_duplicate = True
                                break
                        
                        if not is_duplicate:
                            merged_issues.append(Issue(
                                id=f"LLM{i:04d}",
                                type=item.get('type', 'style'),
                                severity=item.get('severity', 'low'),
                                span=Span(start=start, end=end),
                                original=item.get('original', ''),
                                suggestion=item.get('suggestion', ''),
                                reason=item.get('reason', ''),
                                confidence=item.get('confidence', 0.5)
                            ))
                    except (KeyError, ValueError) as ve:
                        logger.warning(f"Skipping invalid LLM issue: {ve}")

        except Exception as e:
            logger.error(f"OpenAI error: {e}")

    # Final Result
    return ProofreadResult(
        meta=ProofreadMeta(
            tool="combined-proofread",
            version="1.0",
            char_count=len(text),
            language="ja"
        ),
        issues=merged_issues
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
