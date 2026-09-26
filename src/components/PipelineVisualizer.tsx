import React from 'react';
import { AgentRunState } from '../types.js';
import { 
  Compass, 
  Type, 
  FileText, 
  Image as ImageIcon, 
  Scale, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface PipelineVisualizerProps {
  run: AgentRunState | null;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ run }) => {
  if (!run) return null;

  const isCompleted = run.status === 'completed';
  const isFailed = run.status === 'failed';
  const stage = run.stage;

  const getAgentStatusBadge = (status: string, attempts?: number) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          Passed {attempts && attempts > 1 ? `(${attempts}x)` : ''}
        </span>
      );
    }
    if (status === 'retrying') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
          Auto-Retrying ({attempts}x)
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 animate-pulse">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded">
        Queued
      </span>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Autonomous Multi-Agent Topology
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="text-slate-400">
            Run ID: <span className="font-mono text-slate-200">{run.run_id}</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Stage:</span>
            <span className="font-mono text-sky-300 font-medium capitalize">
              {stage.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Architecture Flow Graph */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch relative">
        
        {/* Step 1: Input & Planner Agent */}
        <div className={`p-4 rounded-xl border transition-all ${
          stage === 'planner_decomposition' 
            ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500' 
            : run.agents.planner.status === 'completed'
            ? 'bg-slate-900/80 border-slate-700'
            : 'bg-slate-950/40 border-slate-800 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200">Planner Agent</span>
            </div>
            {getAgentStatusBadge(run.agents.planner.status)}
          </div>
          <div className="text-[11px] text-slate-400 mb-2">
            Model: <span className="font-mono text-indigo-300">gemini-3.8-flash</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-3">
            Decomposes product idea into audience profile, visual art brief, and tonal boundaries.
          </p>
          {run.agents.planner.output && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
              <span className="text-indigo-400 font-semibold">Persona:</span> {run.agents.planner.output.target_audience.slice(0, 50)}...
            </div>
          )}
        </div>

        {/* Step 2: Parallel Workers (Fork) */}
        <div className="md:col-span-2 flex flex-col space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between px-1">
            <span>PARALLEL WORKER DISPATCH</span>
            <span className="text-[10px] font-mono text-sky-400">3 Parallel Workers</span>
          </div>

          {/* Worker A: Tagline */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
            run.agents.tagline_worker.status === 'active' || run.agents.tagline_worker.status === 'retrying'
              ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40'
              : run.agents.tagline_worker.status === 'completed'
              ? 'bg-slate-900/80 border-slate-700/80'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}>
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>Tagline Worker</span>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">gemini-3.8-flash</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                  {run.agents.tagline_worker.current_draft 
                    ? `"${run.agents.tagline_worker.current_draft}"` 
                    : 'Awaiting generation...'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {getAgentStatusBadge(run.agents.tagline_worker.status, run.attempt_counts.tagline)}
              {run.agents.tagline_worker.score !== undefined && (
                <div className="text-[11px] font-mono font-bold text-amber-300 mt-0.5">
                  {run.agents.tagline_worker.score}/10
                </div>
              )}
            </div>
          </div>

          {/* Worker B: Copy */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
            run.agents.copy_worker.status === 'active' || run.agents.copy_worker.status === 'retrying'
              ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
              : run.agents.copy_worker.status === 'completed'
              ? 'bg-slate-900/80 border-slate-700/80'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>Copy Worker</span>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">gemini-3.8-flash</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                  {run.agents.copy_worker.current_draft?.headline || 'Headline, body, benefits & CTA'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {getAgentStatusBadge(run.agents.copy_worker.status, run.attempt_counts.copy)}
              {run.agents.copy_worker.score !== undefined && (
                <div className="text-[11px] font-mono font-bold text-emerald-300 mt-0.5">
                  {run.agents.copy_worker.score}/10
                </div>
              )}
            </div>
          </div>

          {/* Worker C: Product Image */}
          <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
            run.agents.image_worker.status === 'active' || run.agents.image_worker.status === 'retrying'
              ? 'bg-sky-950/30 border-sky-500/80 ring-1 ring-sky-500/40'
              : run.agents.image_worker.status === 'completed'
              ? 'bg-slate-900/80 border-slate-700/80'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}>
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>Image Worker</span>
                  <span className="text-[10px] font-mono text-sky-400 font-normal">gemini-3.1-flash-lite-image</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                  Nano Banana 2 Lite studio render
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {getAgentStatusBadge(run.agents.image_worker.status, run.attempt_counts.image)}
              {run.agents.image_worker.score !== undefined && (
                <div className="text-[11px] font-mono font-bold text-sky-300 mt-0.5">
                  {run.agents.image_worker.score}/10
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Evaluator & Auto-Retry Loop */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          stage === 'evaluator_scoring' || stage === 'retry_refinement'
            ? 'bg-rose-950/30 border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
            : run.agents.evaluator.status === 'completed'
            ? 'bg-slate-900/80 border-slate-700'
            : 'bg-slate-950/40 border-slate-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Evaluator Agent</span>
              </div>
              {getAgentStatusBadge(run.agents.evaluator.status)}
            </div>
            <div className="text-[11px] text-slate-400 mb-1">
              Model: <span className="font-mono text-rose-300">gemini-3.8-flash</span>
            </div>
            <p className="text-xs text-slate-300">
              Rigorous 1–10 scoring. Gating threshold: <span className="font-bold text-rose-400">&ge; 7.0</span>.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1">
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Auto-Retries:</span>
              </span>
              <span className="font-mono font-bold text-slate-200">
                {(run.retry_history || []).length} triggered
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 italic">
              Governed in Antigravity code sandbox
            </div>
          </div>
        </div>

        {/* Step 4: Final Delivered Assets */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          isCompleted
            ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500'
            : 'bg-slate-950/40 border-slate-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200">Asset Delivery</span>
              </div>
              {isCompleted ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Ready
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Pending</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mb-1">
              Overall Quality Score
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {run.scores?.overall ? `${run.scores.overall}/10` : '—'}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            {isCompleted ? (
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Full traceability &amp; packaging verified.</span>
              </span>
            ) : (
              <span>Gated release awaiting quality pass.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
