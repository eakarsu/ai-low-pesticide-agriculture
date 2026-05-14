import { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';

interface AIResponseProps {
  content: string;
  title: string;
  isLoading: boolean;
  onRegenerate?: () => void;
}

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    // Bold headers
    if (line.startsWith('**') && line.endsWith('**')) {
      return <div key={i} className="font-bold text-white mt-3 mb-1">{line.replace(/\*\*/g, '')}</div>;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.replace(/^[-•]\s/, '');
      const parts = content.split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} className="flex gap-2 text-gray-200 text-sm mb-1">
          <span className="text-green-400 mt-0.5 flex-shrink-0">•</span>
          <span>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
          </span>
        </div>
      );
    }

    // Numbered items
    if (/^\d+\./.test(line)) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} className="text-gray-200 text-sm mb-2">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
        </div>
      );
    }

    // Regular with bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <div key={i} className="text-gray-200 text-sm mb-1">
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
      </div>
    );
  });
}

export default function AIResponse({ content, title, isLoading, onRegenerate }: AIResponseProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-violet-900 to-indigo-900 p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-violet-400 rounded-full" />
          <div className="h-4 bg-violet-700 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-violet-800 rounded w-full" />
          <div className="h-3 bg-violet-800 rounded w-4/5" />
          <div className="h-3 bg-violet-800 rounded w-5/6" />
          <div className="h-3 bg-violet-800 rounded w-3/4" />
          <div className="h-3 bg-violet-800 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-900 to-indigo-900 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-300" />
          <span className="font-semibold text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
          <button
            onClick={copy}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="prose prose-invert max-w-none">
        {renderText(content)}
      </div>
    </div>
  );
}
