'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Eye } from 'lucide-react';

interface ArticleActionsProps {
  articleId: string;
  viewCount: number;
}

export function ArticleActions({ articleId, viewCount }: ArticleActionsProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [voted, setVoted] = useState(false);
  const [currentViewCount, setCurrentViewCount] = useState(viewCount);
  const [isIncrementing, setIsIncrementing] = useState(false);

  // Increment view count on mount
  useEffect(() => {
    const incrementView = async () => {
      if (isIncrementing) return;
      setIsIncrementing(true);

      try {
        const response = await fetch(`/api/kb/${articleId}/view`, {
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentViewCount(data.viewCount);
        }
      } catch (error) {
        console.error('Failed to increment view count:', error);
      }
    };

    incrementView();
  }, [articleId]);

  const handleVote = async (isHelpful: boolean) => {
    if (voted) return;

    setHelpful(isHelpful);
    setVoted(true);

    try {
      await fetch(`/api/kb/${articleId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ helpful: isHelpful }),
      });
    } catch (error) {
      console.error('Failed to submit vote:', error);
      setVoted(false);
      setHelpful(null);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
      {/* View Count */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Eye className="h-4 w-4" />
        {currentViewCount} {currentViewCount === 1 ? 'visualização' : 'visualizações'}
      </div>

      {/* Helpful Buttons */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-900">
          Este artigo foi útil?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={voted}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              helpful === true
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : voted
                  ? 'border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            Sim {helpful === true && '✓'}
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={voted}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              helpful === false
                ? 'border-rose-300 bg-rose-50 text-rose-700'
                : voted
                  ? 'border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            Não {helpful === false && '✓'}
          </button>
        </div>
        {voted && (
          <p className="mt-2 text-xs text-slate-500">Obrigado pelo seu feedback!</p>
        )}
      </div>
    </div>
  );
}
