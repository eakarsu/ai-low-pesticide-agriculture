import AIReport from './AIReport';

interface AIResponseProps {
  content: string;
  title: string;
  isLoading: boolean;
  onRegenerate?: () => void;
}

export default function AIResponse({ content, title, isLoading, onRegenerate }: AIResponseProps) {
  if (!isLoading && !content) return null;
  return <div>
    <AIReport response={content} title={title} loading={isLoading} />
    {!isLoading && onRegenerate && <button type="button" onClick={onRegenerate} className="text-sm text-violet-700 underline">Regenerate</button>}
  </div>;
}
