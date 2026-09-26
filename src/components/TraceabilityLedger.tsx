import React from 'react';
import { RetryEvent, AgentRunState } from '../types.js';
import { 
  RotateCcw, 
  GitBranch, 
  Cpu, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Server, 
  CheckCircle,
  Database
} from 'lucide-react';

interface TraceabilityLedgerProps {
  run: AgentRunState;
}

export const TraceabilityLedger: React.FC<TraceabilityLedgerProps> = ({ run }) => {
  const retryHistory = run.retry_history || [];
  const traceability = run.traceability;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight">
              Traceability &amp; Autonomous Retry Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Complete provenance trail • Code execution retry loop &bull; Zero human-in-the-loop intervention
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            Total Retries: <strong className="text-amber-400">{retryHistory.length}</strong>
          </span>
          {traceability?.total_duration_ms && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{(traceability.total_duration_ms / 1000).toFixed(1)}s</span>
            </span>
          )}
        </div>
      </div>

      {/* Model Lineage Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-300 mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Orchestration Layer</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-100">
            antigravity-preview-09-2026
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Managed agent with native Linux code execution sandbox &amp; dynamic dispatch.
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Text, Strategy &amp; Eval</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-100">
            gemini-3.8-flash
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Powering creative planning, copywriting, tagline crafting, and 1–10 scoring.
          </p>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-sky-300 mb-1">
            <Server className="w-3.5 h-3.5" />
            <span>Visual Synthesis</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-100">
            gemini-3.1-flash-lite-image
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Nano Banana 2 Lite commercial studio product photography engine.
          </p>
        </div>

      </div>

      {/* Retry Events Timeline */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3 flex items-center space-x-1.5">
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Autonomous Retry Iterations ({retryHistory.length})</span>
        </h4>

        {retryHistory.length === 0 ? (
          <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All worker assets satisfied the strict <strong className="text-emerald-300">&ge; 7.0 quality threshold</strong> on their very first generation attempt. No automatic retries were required!
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {retryHistory.map((retry, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-slate-950/70 border border-amber-500/20 rounded-xl space-y-2 relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-200 capitalize font-mono">
                      {retry.asset.replace(/_/g, ' ')} Worker
                    </span>
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono font-bold">
                      Failed Score: {retry.previous_score}/10
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(retry.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block mb-0.5">
                    Evaluator Critique Trigger:
                  </span>
                  &ldquo;{retry.feedback}&rdquo;
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="text-amber-400/90 font-medium">
                    &bull; {retry.decision}
                  </span>
                  <span className="text-emerald-400 text-xs font-semibold flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Auto-Refined in Sandbox</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud Run & Firestore Metadata */}
      <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span>Firestore Collections: <span className="text-slate-200">agent_runs, tasks</span></span>
        </div>
        <div className="flex items-center space-x-2">
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span>Deployment Target: <span className="text-slate-200">GCP Cloud Run (FastAPI)</span></span>
        </div>
      </div>
    </div>
  );
};
