import React from 'react';
import { Cpu, Sparkles, ShieldCheck, Zap, Radio, Mic, Image as ImageIcon, Film } from 'lucide-react';

interface HeaderProps {
  onNewRunClick?: () => void;
  activeRunId?: string;
  onOpenLiveVoice?: () => void;
  onOpenTranscribe?: () => void;
  onOpenImageStudio?: () => void;
  onOpenVeoCinema?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRunClick,
  activeRunId,
  onOpenLiveVoice,
  onOpenTranscribe,
  onOpenImageStudio,
  onOpenVeoCinema,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100 tracking-tight text-lg">
                Multimodal Content Factory
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Autonomous
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Antigravity Orchestration • gemini-3.8-flash • Veo 3 • Live API
            </p>
          </div>
        </div>

        {/* Feature Quick Launcher Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* gemini-3.8-live */}
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              title="Real-time voice conversation with gemini-3.8-live"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/60 text-violet-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span className="hidden md:inline">Live Voice</span>
            </button>
          )}

          {/* gemini-3.5-transcribe */}
          {onOpenTranscribe && (
            <button
              onClick={onOpenTranscribe}
              title="Dictate with microphone & transcribe using gemini-3.5-transcribe"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Transcribe</span>
            </button>
          )}

          {/* gemini-3.1-flash-image-preview */}
          {onOpenImageStudio && (
            <button
              onClick={onOpenImageStudio}
              title="Create & Edit images with gemini-3.1-flash-image-preview"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-950/60 hover:bg-pink-900/60 border border-pink-800/60 text-pink-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden md:inline">Image Studio</span>
            </button>
          )}

          {/* veo-3.1-fast-generate-preview */}
          {onOpenVeoCinema && (
            <button
              onClick={onOpenVeoCinema}
              title="Generate 16:9 / 9:16 videos with veo-3.1-fast-generate-preview"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Veo 3 Cinema</span>
            </button>
          )}

          <div className="hidden lg:flex items-center space-x-3 text-xs font-mono text-slate-400 border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-900/60 ml-2">
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>antigravity</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Score &ge; 7.0</span>
            </div>
          </div>

          {activeRunId && (
            <button
              onClick={onNewRunClick}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>New Pipeline</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
