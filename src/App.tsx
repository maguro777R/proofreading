import { useState } from 'react';
import { Editor } from './components/Editor';
import { ReviewPanel } from './components/ReviewPanel';
import { analyzeText } from './services/llm';
import { applyIssue, shiftIssues } from './utils/text';
import type { Issue } from './types';
import { Sparkles, Settings, Eraser } from 'lucide-react';

function App() {
  const [text, setText] = useState<string>('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!apiKey) {
      setShowApiKey(true);
      return;
    }
    if (!text.trim()) {
      setStatusMessage("本文を入力してください。");
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage("AIが校正中...");

    try {
      const result = await analyzeText(text, apiKey);
      setIssues(result.issues);
      setStatusMessage("校正完了");
    } catch (error) {
      console.error(error);
      setStatusMessage("エラーが発生しました。APIキーなどを確認してください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAccept = (issue: Issue) => {
    const { newText, offsetDelta } = applyIssue(text, issue);
    setText(newText);
    const updatedIssues = shiftIssues(issues, issue, offsetDelta);
    setIssues(updatedIssues);
    setStatusMessage("修正を適用しました");
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleReject = (issue: Issue) => {
    setIssues(issues.filter(i => i.id !== issue.id));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-lg">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            AI Proofreader for Novels
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 mr-2">
            {statusMessage && <span className="animate-pulse">{statusMessage}</span>}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            {showApiKey && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border p-4 z-50">
                <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-400">
                  キーはローカルメモリにのみ保存され、外部には送信されません（解析リクエストを除く）。
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-all
              ${isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800 shadow-lg hover:shadow-xl active:scale-95'}
            `}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wait...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                校正開始
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <section className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="mb-4 flex justify-between items-end">
              <div>
                <h2 className="text-lg font-bold text-gray-800">原稿エディタ</h2>
                <p className="text-sm text-gray-500">
                  {text.length} 文字
                </p>
              </div>
              <button
                onClick={() => { setText(''); setIssues([]); }}
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
              >
                <Eraser size={12} />
                クリア
              </button>
            </div>

            <div className="flex-1">
              <Editor
                value={text}
                onChange={setText}
                issues={issues}
                hoveredIssueId={hoveredIssueId}
              />
            </div>

            <div className="mt-4 text-xs text-gray-400 text-center">
              AIは誤りを犯す可能性があります。必ず自身で確認してください。
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="w-96 bg-white border-l shadow-xl z-20 flex flex-col">
          <ReviewPanel
            issues={issues}
            onAccept={handleAccept}
            onReject={handleReject}
            onHover={setHoveredIssueId}
            hoveredIssueId={hoveredIssueId}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
