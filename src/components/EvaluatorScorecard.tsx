import React from 'react';
import { PipelineScores } from '../types.js';
import { Scale, CheckCircle2, AlertCircle, Award, Sparkles } from 'lucide-react';

interface EvaluatorScorecardProps {
  scores: PipelineScores;
}

export const EvaluatorScorecard: React.FC<EvaluatorScorecardProps> = ({ scores }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 7.0) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getScoreBarWidth = (score: number) => `${Math.min(100, Math.max(0, score * 10))}%`;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight">
              Autonomous Evaluator Scorecard
            </h3>
            <p className="text-xs text-slate-400">
              Scored via <span className="font-mono text-rose-300">gemini-3.8-flash</span> • Minimum release threshold &ge; 7.0/10
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
              Consensus Score
            </div>
            <div className="text-lg font-black font-mono text-emerald-400 leading-none">
              {scores.overall} <span className="text-xs font-normal text-slate-500">/ 10.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Score Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Tagline Card */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Tagline Quality
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.tagline.score)}`}>
                {scores.tagline.score}/10
              </span>
            </div>

            {/* Score progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                style={{ width: getScoreBarWidth(scores.tagline.score) }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic mb-3">
              &ldquo;{scores.tagline.reasoning}&rdquo;
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">Quality Gate (&ge;7.0)</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved</span>
            </span>
          </div>
        </div>

        {/* Marketing Copy Card */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Copy Quality
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.marketing_copy.score)}`}>
                {scores.marketing_copy.score}/10
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: getScoreBarWidth(scores.marketing_copy.score) }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic mb-3">
              &ldquo;{scores.marketing_copy.reasoning}&rdquo;
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">Quality Gate (&ge;7.0)</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved</span>
            </span>
          </div>
        </div>

        {/* Image Card */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Image Fidelity
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.image.score)}`}>
                {scores.image.score}/10
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full"
                style={{ width: getScoreBarWidth(scores.image.score) }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic mb-3">
              &ldquo;{scores.image.reasoning}&rdquo;
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">Quality Gate (&ge;7.0)</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
