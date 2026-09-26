import React, { useState, useEffect, useRef } from 'react';
import { AgentRunState } from './types.js';
import { Header } from './components/Header.tsx';
import { PipelineVisualizer } from './components/PipelineVisualizer.tsx';
import { AssetShowcase } from './components/AssetShowcase.tsx';
import { EvaluatorScorecard } from './components/EvaluatorScorecard.tsx';
import { TraceabilityLedger } from './components/TraceabilityLedger.tsx';
import { ExecutionConsole } from './components/ExecutionConsole.tsx';
import { ApiExplorer } from './components/ApiExplorer.tsx';
import { LiveVoiceModal } from './components/LiveVoiceModal.tsx';
import { TranscribeModal } from './components/TranscribeModal.tsx';
import { ImageStudioModal } from './components/ImageStudioModal.tsx';
import { VeoVideoModal } from './components/VeoVideoModal.tsx';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  Layers, 
  Terminal, 
  Server, 
  Lightbulb, 
  Mic, 
  Radio, 
  Image as ImageIcon, 
  Film, 
  Zap
} from 'lucide-react';

const PRESET_IDEAS = [
  'A compact espresso maker that fits in a backpack and runs on rechargeable USB-C batteries.',
  'A neuro-acoustic smart sleep headband that generates personalized binaural soundscapes based on REM tracking.',
  'A folding solar electric commuter scooter with integrated regenerative braking.',
  'Biodegradable mycelium insulated wine packaging that dissolves in hot water.',
  'A pocket-sized thermal imaging camera that clips directly to any smartphone.',
];

export default function App() {
  const [productIdea, setProductIdea] = useState('');
  const [currentRun, setCurrentRun] = useState<AgentRunState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'console' | 'traceability' | 'api'>('pipeline');
  const [recentRuns, setRecentRuns] = useState<Array<{ run_id: string; idea: string; status: string; overall_score?: number }>>([]);
  
  // Modals state
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isTranscribeOpen, setIsTranscribeOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isVeoVideoOpen, setIsVeoVideoOpen] = useState(false);

  // Cross-modal data handoffs
  const [modalImage, setModalImage] = useState<string | undefined>(undefined);
  const [modalPrompt, setModalPrompt] = useState<string | undefined>(undefined);

  const pollIntervalRef = useRef<any>(null);

  // Load initial demo run and list of runs on mount
  useEffect(() => {
    loadRecentRuns();
    loadRunDetails('run_demo_9824');
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const loadRecentRuns = async () => {
    try {
      const resp = await fetch('/api/runs');
      if (resp.ok) {
        const data = await resp.json();
        setRecentRuns(data.runs || []);
      }
    } catch (e) {
      console.error('Failed to load recent runs:', e);
    }
  };

  const loadRunDetails = async (runId: string) => {
    try {
      const [statusResp, resultResp] = await Promise.all([
        fetch(`/status/${runId}`),
        fetch(`/result/${runId}`)
      ]);

      if (statusResp.ok) {
        const statusData = await statusResp.json();
        let fullData: AgentRunState = statusData;

        if (resultResp.ok && resultResp.status === 200) {
          const resultData = await resultResp.json();
          fullData = {
            ...fullData,
            assets: resultData.assets,
            scores: resultData.scores,
            retry_history: resultData.retry_history,
            traceability: resultData.traceability,
          };
        }
        setCurrentRun(fullData);
        setProductIdea(fullData.idea);

        // If still running, poll until complete
        if (fullData.status === 'running') {
          startPolling(runId);
        }
      }
    } catch (e) {
      console.error('Failed to load run:', e);
    }
  };

  const startPolling = (runId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/status/${runId}`);
        if (!resp.ok) return;

        const data = await resp.json();
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setIsSubmitting(false);

          if (data.status === 'completed') {
            const resResp = await fetch(`/result/${runId}`);
            if (resResp.ok) {
              const resData = await resResp.json();
              setCurrentRun({
                ...data,
                assets: resData.assets,
                scores: resData.scores,
                retry_history: resData.retry_history,
                traceability: resData.traceability,
              });
            } else {
              setCurrentRun(data);
            }
          } else {
            setCurrentRun(data);
          }
          loadRecentRuns();
        } else {
          setCurrentRun(prev => ({
            ...(prev || data),
            ...data,
          }));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1200);
  };

  const handleSubmit = async (e?: React.FormEvent, customIdea?: string) => {
    if (e) e.preventDefault();
    const ideaToUse = customIdea || productIdea;
    if (!ideaToUse.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const resp = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaToUse.trim() }),
      });

      if (!resp.ok) {
        throw new Error('Failed to initiate pipeline');
      }

      const { run_id } = await resp.json();
      startPolling(run_id);
      loadRecentRuns();
      setActiveTab('pipeline');
    } catch (err) {
      console.error('Submit error:', err);
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setProductIdea(preset);
  };

  const handleResetToNew = () => {
    setProductIdea('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenImageEditor = (imageUrl: string) => {
    setModalImage(imageUrl);
    setIsImageStudioOpen(true);
  };

  const handleOpenVeoAnimator = (imageUrl?: string, prompt?: string) => {
    setModalImage(imageUrl);
    setModalPrompt(prompt);
    setIsVeoVideoOpen(true);
  };

  const handleUseTranscript = (transcriptText: string) => {
    setProductIdea(transcriptText);
    handleSubmit(undefined, transcriptText);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      <Header 
        onNewRunClick={handleResetToNew} 
        activeRunId={currentRun?.run_id}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenTranscribe={() => setIsTranscribeOpen(true)}
        onOpenImageStudio={() => {
          setModalImage(currentRun?.assets?.image_url);
          setIsImageStudioOpen(true);
        }}
        onOpenVeoCinema={() => {
          setModalImage(currentRun?.assets?.image_url);
          setModalPrompt(currentRun?.assets?.image_prompt);
          setIsVeoVideoOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Model Suite Highlights Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setIsLiveVoiceOpen(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-800/30 hover:border-violet-600/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-violet-300 transition">
                Live Voice API
              </div>
              <div className="text-[11px] font-mono text-violet-400">gemini-3.8-live</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Bidirectional real-time voice</div>
            </div>
          </button>

          <button
            onClick={() => setIsTranscribeOpen(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-800/30 hover:border-cyan-600/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition">
                Audio Transcribe
              </div>
              <div className="text-[11px] font-mono text-cyan-400">gemini-3.5-transcribe</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Mic input &amp; speech-to-text</div>
            </div>
          </button>

          <button
            onClick={() => {
              setModalImage(currentRun?.assets?.image_url);
              setIsImageStudioOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 to-slate-900 border border-pink-800/30 hover:border-pink-600/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-pink-300 transition">
                Image Create &amp; Edit
              </div>
              <div className="text-[11px] font-mono text-pink-400">gemini-3.1-flash-image-preview</div>
              <div className="text-[10px] text-slate-400 mt-0.5">High-fidelity text &amp; edit prompts</div>
            </div>
          </button>

          <button
            onClick={() => {
              setModalImage(currentRun?.assets?.image_url);
              setModalPrompt(currentRun?.assets?.image_prompt);
              setIsVeoVideoOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-800/30 hover:border-amber-600/60 transition-all text-left flex items-start gap-3 group cursor-pointer shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition">
                Veo 3 Cinema
              </div>
              <div className="text-[11px] font-mono text-amber-400">veo-3.1-fast-generate-preview</div>
              <div className="text-[10px] text-slate-400 mt-0.5">16:9 &amp; 9:16 Video Generation</div>
            </div>
          </button>
        </section>

        {/* Hero Product Idea Input Card */}
        <section className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Content Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100 tracking-tight leading-tight">
              One Sentence In. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
                Full Production Assets Out.
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Planner decomposes your concept &rarr; parallel workers forge copy, tagline, and imagery &rarr; evaluator scores 1–10 &rarr; auto-retries in Antigravity code execution sandbox until &ge; 7.0.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productIdea}
                  onChange={(e) => setProductIdea(e.target.value)}
                  placeholder="Enter a one-sentence product idea (e.g. A compact espresso maker for backpackers...)"
                  className="w-full px-4 py-3.5 pr-12 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-inner"
                  disabled={isSubmitting}
                />
                {/* Voice Dictation Trigger inside input */}
                <button
                  type="button"
                  onClick={() => setIsTranscribeOpen(true)}
                  title="Speak into microphone with gemini-3.5-transcribe"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !productIdea.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Dispatch Agents</span>
                    <Send className="w-4 h-4 fill-slate-950" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick-Start Inspiration Presets */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center space-x-1 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Preset Ideas:</span>
            </span>
            {PRESET_IDEAS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/50 transition-colors text-left truncate max-w-[280px] cursor-pointer"
                title={preset}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        {/* Pipeline Navigation Tabs */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'pipeline'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Delivered Assets &amp; Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'console'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Agent Execution Console</span>
              {currentRun?.step_log?.length ? (
                <span className="text-[10px] font-mono bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded-full border border-slate-700">
                  {currentRun.step_log.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('traceability')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'traceability'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Retry History &amp; Lineage</span>
              {currentRun?.retry_history?.length ? (
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                  {currentRun.retry_history.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'api'
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Cloud Run API Contract</span>
            </button>
          </div>

          {/* Run Switcher Dropdown */}
          {recentRuns.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 hidden sm:inline">Recent Runs:</span>
              <select
                value={currentRun?.run_id || ''}
                onChange={(e) => loadRunDetails(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {recentRuns.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.run_id} — {r.status} {r.overall_score ? `(${r.overall_score}/10)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Tab 1: Pipeline & Assets */}
        {activeTab === 'pipeline' && (
          <div className="space-y-8">
            <PipelineVisualizer run={currentRun} />

            {currentRun?.status === 'running' && (
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-3 animate-pulse">
                <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Autonomous Agent Pipeline Actively Executing
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Antigravity agent is coordinating planner, text copy, image synthesis, and evaluation scoring inside its Linux sandbox.
                </p>
              </div>
            )}

            {currentRun?.assets && (
              <AssetShowcase 
                assets={currentRun.assets} 
                scores={currentRun.scores}
                productIdea={currentRun.idea}
                onOpenImageEditor={handleOpenImageEditor}
                onOpenVeoAnimator={(img, p) => handleOpenVeoAnimator(img, p)}
              />
            )}

            {currentRun?.scores && (
              <EvaluatorScorecard scores={currentRun.scores} />
            )}
          </div>
        )}

        {/* Tab 2: Execution Console */}
        {activeTab === 'console' && (
          <ExecutionConsole steps={currentRun?.step_log || []} />
        )}

        {/* Tab 3: Traceability & Retry Ledger */}
        {activeTab === 'traceability' && currentRun && (
          <TraceabilityLedger run={currentRun} />
        )}

        {/* Tab 4: Cloud Run API Contract */}
        {activeTab === 'api' && (
          <ApiExplorer run={currentRun} />
        )}

      </main>

      {/* Feature Modals */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        onSendIdeaToFactory={(idea) => {
          setProductIdea(idea);
          handleSubmit(undefined, idea);
        }}
        onSendToImageAgent={(prompt) => {
          setModalPrompt(prompt);
          setModalImage(undefined);
          setIsImageStudioOpen(true);
        }}
        onSendToVideoAgent={(prompt) => {
          setModalPrompt(prompt);
          setModalImage(undefined);
          setIsVeoVideoOpen(true);
        }}
      />

      <TranscribeModal
        isOpen={isTranscribeOpen}
        onClose={() => setIsTranscribeOpen(false)}
        onUseTranscript={handleUseTranscript}
      />

      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        initialImage={modalImage}
        initialPrompt={modalPrompt}
        onSendToVeo={(imgUrl, prompt) => {
          handleOpenVeoAnimator(imgUrl, prompt);
        }}
      />

      <VeoVideoModal
        isOpen={isVeoVideoOpen}
        onClose={() => setIsVeoVideoOpen(false)}
        initialImage={modalImage || currentRun?.assets?.image_url}
        initialPrompt={modalPrompt}
        activeBannerUrl={modalImage || currentRun?.assets?.image_url}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        Multimodal Content Factory &bull; gemini-3.8-live &bull; gemini-3.5-transcribe &bull; gemini-3.1-flash-image-preview &bull; veo-3.1-fast-generate-preview
      </footer>
    </div>
  );
}
