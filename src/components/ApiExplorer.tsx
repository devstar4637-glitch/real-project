import React, { useState } from 'react';
import { AgentRunState } from '../types.js';
import { Terminal, Copy, Check, Play, Server, Code2 } from 'lucide-react';

interface ApiExplorerProps {
  run: AgentRunState | null;
}

export const ApiExplorer: React.FC<ApiExplorerProps> = ({ run }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'status' | 'result'>('status');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runId = run?.run_id || 'run_demo_9824';

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const executeLiveQuery = async (endpoint: string) => {
    setLoading(true);
    try {
      const resp = await fetch(endpoint);
      const data = await resp.json();
      setTestResponse(data);
    } catch (e: any) {
      setTestResponse({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const getCurlCommand = () => {
    if (activeTab === 'generate') {
      return `curl -X POST https://ais-dev-xyvr5uwxege4yalbo7lav2-477424036571.asia-east1.run.app/generate \\
  -H "Content-Type: application/json" \\
  -d '{"idea": "A compact espresso maker that fits in a backpack and runs on rechargeable USB-C batteries."}'`;
    }
    if (activeTab === 'status') {
      return `curl -X GET https://ais-dev-xyvr5uwxege4yalbo7lav2-477424036571.asia-east1.run.app/status/${runId}`;
    }
    return `curl -X GET https://ais-dev-xyvr5uwxege4yalbo7lav2-477424036571.asia-east1.run.app/result/${runId}`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight">
              GCP Cloud Run REST API Contract
            </h3>
            <p className="text-xs text-slate-400">
              Interactive contract inspector matching <code className="text-sky-300 font-mono">app.py</code> and <code className="text-sky-300 font-mono">server.ts</code> endpoints
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('generate'); setTestResponse(null); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'generate' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            POST /generate
          </button>
          <button
            onClick={() => { setActiveTab('status'); setTestResponse(null); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'status' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GET /status/{'{run_id}'}
          </button>
          <button
            onClick={() => { setActiveTab('result'); setTestResponse(null); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'result' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GET /result/{'{run_id}'}
          </button>
        </div>
      </div>

      {/* Description & Endpoint info */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              activeTab === 'generate' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}>
              {activeTab === 'generate' ? 'POST' : 'GET'}
            </span>
            <span className="text-slate-200 font-bold">
              {activeTab === 'generate' ? '/generate' : activeTab === 'status' ? `/status/${runId}` : `/result/${runId}`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab !== 'generate' && (
              <button
                onClick={() => executeLiveQuery(activeTab === 'status' ? `/status/${runId}` : `/result/${runId}`)}
                disabled={loading}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>{loading ? 'Querying...' : 'Test In Browser'}</span>
              </button>
            )}
            <button
              onClick={() => handleCopy(getCurlCommand(), 'curl')}
              className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              title="Copy cURL"
            >
              {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <pre className="text-slate-400 bg-slate-900/90 p-3 rounded-lg overflow-x-auto text-[11px] border border-slate-800">
          {getCurlCommand()}
        </pre>
      </div>

      {/* Live Response or Schema Preview */}
      <div>
        <div className="text-xs font-bold font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
          <span>{testResponse ? 'Live API Response Output' : 'Schema & Current State Output'}</span>
          {testResponse && (
            <span className="text-emerald-400 text-[10px] lowercase font-normal">HTTP 200 OK</span>
          )}
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-sky-300 max-h-72 overflow-y-auto overflow-x-auto shadow-inner">
          {JSON.stringify(
            testResponse || (
              activeTab === 'generate' 
                ? { idea: "A compact espresso maker that fits in a backpack and runs on rechargeable USB-C batteries." }
                : activeTab === 'status'
                ? {
                    run_id: run?.run_id || runId,
                    status: run?.status || 'completed',
                    stage: run?.stage || 'completed',
                    agents: run?.agents,
                    attempt_counts: run?.attempt_counts || { tagline: 1, copy: 1, image: 1 },
                    step_log_count: run?.step_log?.length || 5
                  }
                : {
                    run_id: run?.run_id || runId,
                    status: run?.status || 'completed',
                    assets: run?.assets,
                    scores: run?.scores,
                    retry_history: run?.retry_history || []
                  }
            ),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};
