import React, { useState } from 'react';
import { AgentStep } from '../types.js';
import { 
  Terminal, 
  Brain, 
  Code2, 
  Scale, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check,
  Filter
} from 'lucide-react';

interface ExecutionConsoleProps {
  steps: AgentStep[];
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ steps }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'thought' | 'code' | 'evaluation' | 'retry'>('all');
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedStepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSteps = steps.filter(step => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'thought') return step.type === 'thought';
    if (activeFilter === 'code') return step.type === 'code_execution' || step.type === 'code_result';
    if (activeFilter === 'evaluation') return step.type === 'evaluation' || step.agent === 'evaluator';
    if (activeFilter === 'retry') return step.type === 'retry' || step.agent === 'retry_arbiter';
    return true;
  });

  const getAgentColor = (agent: AgentStep['agent']) => {
    switch (agent) {
      case 'orchestrator':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'planner':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      case 'tagline_worker':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'copy_worker':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'image_worker':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'evaluator':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'retry_arbiter':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getTypeIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'thought':
        return <Brain className="w-3.5 h-3.5 text-indigo-400" />;
      case 'code_execution':
      case 'code_result':
        return <Code2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'evaluation':
        return <Scale className="w-3.5 h-3.5 text-rose-400" />;
      case 'retry':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Console Header */}
      <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Live Traceability Stream ({steps.length} Steps)
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeFilter === 'all' 
                ? 'bg-sky-500 text-slate-950 font-bold' 
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('thought')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'thought' 
                ? 'bg-indigo-500 text-slate-950 font-bold' 
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3 h-3" />
            <span>Thoughts</span>
          </button>
          <button
            onClick={() => setActiveFilter('code')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'code' 
                ? 'bg-sky-500 text-slate-950 font-bold' 
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Sandbox Code</span>
          </button>
          <button
            onClick={() => setActiveFilter('evaluation')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'evaluation' 
                ? 'bg-rose-500 text-slate-950 font-bold' 
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>Evaluator</span>
          </button>
          <button
            onClick={() => setActiveFilter('retry')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'retry' 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retries</span>
          </button>
        </div>
      </div>

      {/* Step Items Feed */}
      <div className="p-4 space-y-2.5 max-h-[500px] overflow-y-auto font-mono text-xs">
        {filteredSteps.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No step events matching current filter.
          </div>
        ) : (
          filteredSteps.map((step) => {
            const isExpanded = expandedStepIds.has(step.id);
            const hasDetails = step.details && Object.keys(step.details).length > 0;

            return (
              <div 
                key={step.id} 
                className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="shrink-0">{getTypeIcon(step.type)}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${getAgentColor(step.agent)}`}>
                      {step.agent.replace(/_/g, ' ')}
                    </span>
                    {step.attempt && (
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">
                        Try #{step.attempt}
                      </span>
                    )}
                    <span className="text-slate-200 font-semibold text-xs">
                      {step.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 shrink-0">
                    <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <button
                      onClick={() => handleCopy(step.content, step.id)}
                      className="hover:text-slate-300 p-0.5 cursor-pointer"
                      title="Copy content"
                    >
                      {copiedId === step.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {hasDetails && (
                      <button
                        onClick={() => toggleExpand(step.id)}
                        className="hover:text-slate-300 p-0.5 cursor-pointer"
                        title="Toggle payload details"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-sky-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-2 text-slate-300 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                  {step.content}
                </div>

                {/* Expanded Details JSON */}
                {isExpanded && hasDetails && (
                  <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-300">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1 font-bold">
                      Payload Metadata:
                    </div>
                    <pre className="font-mono text-sky-300 whitespace-pre">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
