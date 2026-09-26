import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Wand2,
  Sparkles,
  Upload,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  Video,
  Check,
  Zap,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string;
  initialPrompt?: string;
  onSendToVeo?: (imageUrl: string, prompt: string) => void;
}

const DEEPMIND_HACKATHON_PRESETS = [
  {
    id: 'deepmind_keynote',
    label: 'Google DeepMind Hackathon Key Visual',
    tag: '16:9 Keynote',
    aspect: '16:9' as const,
    prompt:
      'Official keynote key visual poster for Google DeepMind Hackathon 2026. A hyper-futuristic glowing neural nexus and multidimensional crystal AI lattice floating in deep space navy obsidian. Glowing quantum nodes pulsing with electric cyan (#00F0FF), luminous violet (#8A2BE2), and neon cobalt blue energy ribbons. A polished dark mirror reflection beneath, subtle holographic typography displaying GOOGLE DEEPMIND HACKATHON with sleek futuristic typography. Volumetric god-rays, cinematic lighting, 8k commercial quality, award-winning technology conference keynote visual.',
  },
  {
    id: 'deepmind_emblem',
    label: 'DeepMind Hackathon Trophy & Core Emblem',
    tag: '1:1 Badge',
    aspect: '1:1' as const,
    prompt:
      'Publishable official badge and prize emblem for Google DeepMind Hackathon 2026. A floating sculptural polyhedral core made of frosted titanium, refractive dichroic glass, and glowing fiber-optic synapses. Inscribed with subtle futuristic "DEEPMIND HACKATHON" laser etching. Radiant cyan and violet rim light, dark studio slate pedestal, volumetric mist, macro product photography, 8k masterwork.',
  },
  {
    id: 'deepmind_agents',
    label: 'DeepMind Autonomous Multi-Agent Graph',
    tag: '16:9 Landscape',
    aspect: '16:9' as const,
    prompt:
      'Key visual for Google DeepMind Autonomous Multi-Agent Hackathon project. Holographic floating data nodes, multi-agent neural graph visualization, glowing vector connections in electric teal and deep cobalt. Futuristic clean glass laboratory interface, cinematic depth of field, 8k tech publication standard.',
  },
  {
    id: 'product_launch',
    label: 'Commercial Hardware Launch Shot',
    tag: '1:1 Studio',
    aspect: '1:1' as const,
    prompt:
      'Commercial studio product hero photography of a luxury minimalist device, dramatic rim lighting, soft shadow falloff, 85mm prime lens f/4, pristine material detailing, magazine cover quality.',
  },
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  initialPrompt,
  onSendToVeo,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>(initialImage ? 'edit' : 'create');
  const [prompt, setPrompt] = useState<string>(
    initialPrompt ||
      DEEPMIND_HACKATHON_PRESETS[0].prompt
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImage || null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>(
    initialPrompt && (initialPrompt.includes('16:9') || initialPrompt.toLowerCase().includes('keynote'))
      ? '16:9'
      : '16:9'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [optimizationNotes, setOptimizationNotes] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
      if (
        initialPrompt.toLowerCase().includes('16:9') ||
        initialPrompt.toLowerCase().includes('keynote') ||
        initialPrompt.toLowerCase().includes('poster') ||
        initialPrompt.toLowerCase().includes('deepmind')
      ) {
        setAspectRatio('16:9');
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (initialImage) {
      setSelectedImage(initialImage);
      setActiveTab('edit');
    }
  }, [initialImage]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setErrorMsg(null);
    setOptimizationNotes(null);

    try {
      const res = await fetch('/api/image/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPrompt: prompt,
          context: 'Google DeepMind Hackathon / Key Visual & Publishable Graphic',
          targetAspect: aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to optimize prompt');
      }

      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt);
        if (data.recommendedAspect && ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(data.recommendedAspect)) {
          setAspectRatio(data.recommendedAspect);
        }
        if (data.designNotes) {
          setOptimizationNotes(data.designNotes);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to optimize prompt for context');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSelectPreset = (preset: (typeof DEEPMIND_HACKATHON_PRESETS)[0]) => {
    setPrompt(preset.prompt);
    setAspectRatio(preset.aspect);
    setOptimizationNotes(`Loaded ${preset.label} preset designed for publishable production output.`);
  };

  const handleGenerateOrEdit = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        prompt: prompt.trim(),
        aspectRatio,
      };

      if (activeTab === 'edit' && selectedImage) {
        payload.editImageBase64 = selectedImage;
        payload.editImageMimeType = selectedImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      }

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      setResultImage(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isDeepMindQuery =
    prompt.toLowerCase().includes('deepmind') ||
    prompt.toLowerCase().includes('hackathon') ||
    prompt.toLowerCase().includes('google');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Create & Edit Image Studio</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-pink-950 text-pink-300 border border-pink-800/60">
                  gemini-3.1-flash-image-preview
                </span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60">
                  DeepMind Context Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate publishable keynote visuals, hackathon hero graphics, and commercial assets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition text-xs font-medium"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/60 gap-4">
          <button
            onClick={() => {
              setActiveTab('create');
              setErrorMsg(null);
            }}
            className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create New Image from Text
          </button>
          <button
            onClick={() => {
              setActiveTab('edit');
              setErrorMsg(null);
            }}
            className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'edit'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Edit / Remix Image with Prompts
          </button>
        </div>

        {/* Body Workspace */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Context Presets Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    Quick Context Presets
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Click to load</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEEPMIND_HACKATHON_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/60 transition text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
                          {p.tag}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1">
                        {p.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Mode: Source Image Picker */}
              {activeTab === 'edit' && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Base Image to Edit
                  </span>
                  {selectedImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-700 max-h-48 group">
                      <img
                        src={selectedImage}
                        alt="Base to edit"
                        className="w-full h-44 object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 border border-slate-600">
                          <Upload className="w-3.5 h-3.5" />
                          Change Image
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-pink-500/50 hover:bg-slate-900/50 cursor-pointer transition">
                      <Upload className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-xs font-medium text-slate-300">Click to upload photo to edit</span>
                      <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* Prompt Input Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {activeTab === 'edit' ? 'Edit Instructions (Text Prompt)' : 'Image Generation Prompt'}
                  </label>

                  {/* AI Prompt Optimizer Button */}
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !prompt.trim()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600/30 to-violet-600/30 hover:from-blue-600/50 hover:to-violet-600/50 border border-blue-500/40 text-blue-300 hover:text-blue-200 text-xs font-medium transition active:scale-95 disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Optimize for Context (AI)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={5}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt or brief idea (e.g. google deepmind hackathon publishable image)..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-pink-500/80 transition resize-none leading-relaxed font-mono"
                  />
                </div>

                {/* DeepMind context suggestion alert */}
                {isDeepMindQuery && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-blue-950/40 border border-blue-800/50 text-[11px] text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      DeepMind Hackathon context detected. Click preset or AI Optimize for official keynote quality.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(DEEPMIND_HACKATHON_PRESETS[0])}
                      className="underline font-semibold hover:text-white shrink-0 ml-2"
                    >
                      Use Keynote Preset
                    </button>
                  </div>
                )}

                {optimizationNotes && (
                  <p className="mt-1.5 text-[11px] text-slate-400 italic">
                    ℹ️ {optimizationNotes}
                  </p>
                )}
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Aspect Ratio (Recommended: 16:9 for Keynote / Hero Visual, 1:1 for Badges)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['1:1', '3:4', '4:3', '9:16', '16:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 text-xs font-mono rounded-lg border transition ${
                        aspectRatio === ratio
                          ? 'bg-pink-950/80 border-pink-500 text-pink-300 font-semibold shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Main Action Button */}
            <button
              onClick={handleGenerateOrEdit}
              disabled={isLoading || !prompt.trim() || (activeTab === 'edit' && !selectedImage)}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/20 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synthesizing Visual via gemini-3.1-flash-image-preview...
                </>
              ) : activeTab === 'edit' ? (
                <>
                  <Wand2 className="w-4 h-4" />
                  Apply Image Edits
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate High-Resolution Publishable Image
                </>
              )}
            </button>
          </div>

          {/* Result Preview Column (6 cols) */}
          <div className="lg:col-span-6 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4 justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Generated Output Preview
                </span>
                {resultImage && (
                  <span className="text-[11px] text-pink-400 font-mono">
                    Model: gemini-3.1-flash-image-preview
                  </span>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 flex items-center justify-center min-h-[340px]">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin" />
                    <p className="text-xs text-pink-400 font-medium">
                      Rendering high-fidelity imagery via gemini-3.1-flash-image-preview...
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Computing neural lattices, lighting passes, and atmospheric textures
                    </p>
                  </div>
                ) : resultImage ? (
                  <img
                    src={resultImage}
                    alt="Result from gemini-3.1-flash-image-preview"
                    className="w-full h-full object-contain max-h-[420px] rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Ready to synthesize image</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Select a Google DeepMind Hackathon preset above or click "Generate High-Resolution Publishable Image"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {resultImage && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <a
                    href={resultImage}
                    download="deepmind-hackathon-asset.png"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5" />}
                    {copied ? 'Copied Prompt' : 'Copy Prompt'}
                  </button>
                </div>

                {onSendToVeo && (
                  <button
                    onClick={() => {
                      onSendToVeo(resultImage, prompt);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Animate Image with Veo Video
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
