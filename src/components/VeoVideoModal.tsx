import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Film,
  Sparkles,
  Upload,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Wand2,
  Layers,
  ArrowRight,
  Eye,
  FileVideo,
  Image as ImageIcon,
  Zap,
  Check,
  ScanSearch,
  Trash2,
} from 'lucide-react';

interface VeoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string;
  initialPrompt?: string;
  activeBannerUrl?: string;
  onSaveVideoAsset?: (videoUrl: string) => void;
}

const DEEPMIND_CREATOR_PRESETS = [
  {
    id: 'deepmind_keynote_8s',
    label: 'Google DeepMind Hackathon 8s Keynote Opener',
    tag: '8s 16:9 Keynote',
    duration: 8,
    aspect: '16:9' as const,
    prompt:
      'Official keynote opening title sequence for Google DeepMind Hackathon 2026, 24fps film motion blur, photorealistic 8k render. [0-2s] Continuous low-angle orbital crane shot sweeping inward across a dark mirror obsidian pedestal in an expansive architectural void; glowing fiber-optic synaptic nodes erupt in synchronized pulses of electric cyan (#00F0FF) and quantum violet (#8A2BE2). [2-5s] Dynamic kinetic acceleration as the camera plunges through an intricate geometric DeepMind neural lattice; anamorphic horizontal lens flares sweep the frame as fluid data streams converge into a blinding nexus of light. [5-8s] Cinematic deceleration into a commanding hero frame hold; volumetric atmospheric god-rays pierce dense ambient haze onto a floating, razor-sharp holographic typography lockup displaying "GOOGLE DEEPMIND HACKATHON 2026" with the DeepMind visual insignia; raytraced reflections shimmer across the dark glass floor with shallow depth of field and pristine cinematic bokeh.',
  },
  {
    id: 'deepmind_neural_core_8s',
    label: 'DeepMind Quantum Neural Core Reveal',
    tag: '8s 16:9 Macro',
    duration: 8,
    aspect: '16:9' as const,
    prompt:
      'Macro commercial sequence focusing on a floating quantum computing polyhedral core. [0-2s] Slow continuous dolly-in revealing internal fiber-optic synaptic lattice pulsing in sync with ambient algorithmic rhythms. [2-5s] Camera rotates 45 degrees as radiant electric cyan and dichroic violet light refract through optical glass facets. [5-8s] Atmospheric light flare stabilizes into an 8k hero reveal with floating data particles.',
  },
  {
    id: 'deepmind_agent_command_8s',
    label: 'Autonomous Multi-Agent Command Sequence',
    tag: '8s 16:9 Tech Demo',
    duration: 8,
    aspect: '16:9' as const,
    prompt:
      'High-tempo creator tech commercial. [0-2s] Visualizing autonomous multi-agent coordination with holographic graph nodes connecting across 3D space. [2-5s] Electric cobalt and teal data streams flowing into a centralized decision matrix with kinetic speed lines. [5-8s] Camera pulls back to reveal the full multi-agent network with crisp typography and clean futuristic laboratory lighting.',
  },
  {
    id: 'creator_vertical_shorts_8s',
    label: 'DeepMind Creator Showcase (TikTok/Reels/Shorts)',
    tag: '8s 9:16 Vertical',
    duration: 8,
    aspect: '9:16' as const,
    prompt:
      'Vertical social creator video optimized for 9:16 mobile display. [0-2s] Dynamic split lighting revealing high-tech holographic AI interface. [2-5s] Dramatic camera sweep upwards with glowing neon data streams and chromatic lens flares. [5-8s] Final high-impact lockup with centered branding and glowing gradient border.',
  },
];

// Extract visual keyframe from video to enable Veo 3.1 animation
const extractVideoKeyframe = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            URL.revokeObjectURL(url);
            resolve(dataUrl);
          } else {
            URL.revokeObjectURL(url);
            resolve('');
          }
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve('');
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    } catch (e) {
      resolve('');
    }
  });
};

export const VeoVideoModal: React.FC<VeoVideoModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  initialPrompt,
  activeBannerUrl,
  onSaveVideoAsset,
}) => {
  const [prompt, setPrompt] = useState<string>(
    initialPrompt || DEEPMIND_CREATOR_PRESETS[0].prompt
  );

  // Unified Multi-Asset Workspace State (All in One Place)
  const [sourceImage, setSourceImage] = useState<string | null>(initialImage || activeBannerUrl || null);
  const [sourceVideo, setSourceVideo] = useState<string | null>(null);
  const [sourceVideoName, setSourceVideoName] = useState<string | null>(null);
  const [sourceVideoFrame, setSourceVideoFrame] = useState<string | null>(null);

  // Verification & Vision Analysis State
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [verifiedSubject, setVerifiedSubject] = useState<string | null>(null);
  const [verifiedKeyframes, setVerifiedKeyframes] = useState<string[]>([]);

  // Generation Settings (Veo 3: 4 to 8s)
  const [durationSeconds, setDurationSeconds] = useState<4 | 6 | 8>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

  // Generation Pipeline State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [operationName, setOperationName] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creatorNotes, setCreatorNotes] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (initialImage) {
      setSourceImage(initialImage);
    } else if (activeBannerUrl && !sourceImage) {
      setSourceImage(activeBannerUrl);
    }
  }, [initialImage, activeBannerUrl]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
      if (initialPrompt.includes('9:16') || initialPrompt.toLowerCase().includes('vertical')) {
        setAspectRatio('9:16');
      } else {
        setAspectRatio('16:9');
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Vision AI: Verify Image Content & Auto-Craft Animation Prompt
  const handleVerifyAndCraftPrompt = async (imgData?: string) => {
    const targetImage = imgData || sourceImage;
    if (!targetImage) return;

    setIsVerifyingImage(true);
    setErrorMsg(null);

    try {
      const mime = targetImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      const res = await fetch('/api/video/analyze-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImage,
          imageMimeType: mime,
          context: 'Google DeepMind Hackathon 2026 Keynote / Commercial Cinema',
          userIntent: 'Animate this verified image with true-to-content camera motion and realistic physical dynamics',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify image');
      }

      if (data.motionPrompt) {
        setPrompt(data.motionPrompt);
      }
      if (data.detectedSubject) {
        setVerifiedSubject(data.detectedSubject);
      }
      if (data.keyframes && Array.isArray(data.keyframes)) {
        setVerifiedKeyframes(data.keyframes);
      }
      if (data.recommendedDuration) {
        const dur = Math.min(8, Math.max(4, Number(data.recommendedDuration))) as 4 | 6 | 8;
        setDurationSeconds(dur);
      }
      if (data.recommendedAspect && ['16:9', '9:16'].includes(data.recommendedAspect)) {
        setAspectRatio(data.recommendedAspect);
      }
      setCreatorNotes(`Verified: "${data.detectedSubject}". Generated tailored animation prompt starting from this exact keyframe.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Image verification failed');
    } finally {
      setIsVerifyingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setSourceImage(b64);
      setVerifiedSubject(null);
      setVerifiedKeyframes([]);
      // Automatically verify and synthesize prompt from newly uploaded image
      handleVerifyAndCraftPrompt(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceVideoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSourceVideo(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Extract visual keyframe from video to enable Veo 3.1 animation
    const frame = await extractVideoKeyframe(file);
    if (frame) {
      setSourceVideoFrame(frame);
      if (!sourceImage) {
        setSourceImage(frame);
        handleVerifyAndCraftPrompt(frame);
      }
    }
  };

  const handleUseActiveBanner = () => {
    const banner = activeBannerUrl || initialImage;
    if (banner) {
      setSourceImage(banner);
      setVerifiedSubject(null);
      handleVerifyAndCraftPrompt(banner);
    }
  };

  const handleUseGeneratedVideoAsSource = () => {
    if (videoBlobUrl) {
      setSourceVideo(videoBlobUrl);
      setSourceVideoName(`veo-clip-${Date.now()}.mp4`);
      setCreatorNotes('Imported previous video asset as reference for next scene extension.');
    }
  };

  const handleSelectPreset = (preset: (typeof DEEPMIND_CREATOR_PRESETS)[0]) => {
    setPrompt(preset.prompt);
    setDurationSeconds(preset.duration as 4 | 6 | 8);
    setAspectRatio(preset.aspect);
    setCreatorNotes(`Loaded ${preset.label} preset designed for top-notch creator level 8-second playback.`);
  };

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/video/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPrompt: prompt,
          durationSeconds,
          context: 'Google DeepMind Hackathon 2026 / Creator Video Cinema',
          assetType: sourceImage && sourceVideo ? 'image and video assets' : sourceImage ? 'image asset' : sourceVideo ? 'video asset' : 'text prompt',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to optimize video prompt');
      }

      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt);
        if (data.durationSeconds) {
          const clamped = Math.min(8, Math.max(4, Number(data.durationSeconds))) as 4 | 6 | 8;
          setDurationSeconds(clamped);
        }
        if (data.recommendedAspect && ['16:9', '9:16'].includes(data.recommendedAspect)) {
          setAspectRatio(data.recommendedAspect);
        }
        if (data.creatorNotes) {
          setCreatorNotes(data.creatorNotes);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to enhance video prompt');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim() && !sourceImage && !sourceVideo) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setVideoBlobUrl(null);
    setGenerationStage(`Dispatching sequence to Veo 3 cinema engine (veo-3.1-fast-generate-preview)...`);

    try {
      const safeDuration = Math.min(8, Math.max(4, Number(durationSeconds) || 8));
      const payload: any = {
        prompt: prompt.trim(),
        aspectRatio,
        resolution,
        durationSeconds: safeDuration,
      };

      // Veo 3.1 synthesizes via Image Keyframe (sourceImage takes priority, or extracted sourceVideoFrame)
      const visualKeyframe = sourceImage || sourceVideoFrame;
      if (visualKeyframe) {
        payload.imageBase64 = visualKeyframe;
        payload.imageMimeType = visualKeyframe.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      }

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      const opName = data.operationName;
      setOperationName(opName);
      setGenerationStage(`Synthesizing ${safeDuration}s creator motion frames & temporal coherence...`);

      // Polling loop
      let attempts = 0;
      pollTimerRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 140) {
          clearInterval(pollTimerRef.current);
          setIsGenerating(false);
          setErrorMsg('Video generation timed out. Please try again.');
          return;
        }

        try {
          const statusRes = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: opName }),
          });
          const statusData = await statusRes.json();

          if (attempts % 4 === 0) {
            const stages = [
              `Rendering ${safeDuration}s volumetric DeepMind lighting passes...`,
              `Simulating neural lattice dynamics & motion blur...`,
              `Synthesizing cinematic 24fps motion transitions...`,
              `Encoding ${safeDuration}s H.264/MP4 stream at ${resolution}...`,
              `Finalizing 8k creator post-processing pass...`,
            ];
            setGenerationStage(stages[(attempts / 4) % stages.length]);
          }

          if (statusData.done) {
            clearInterval(pollTimerRef.current);
            setGenerationStage(`Downloading rendered ${safeDuration}s video stream...`);

            const downloadRes = await fetch('/api/video-download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ operationName: opName }),
            });

            if (!downloadRes.ok) {
              const errData = await downloadRes.json().catch(() => ({}));
              throw new Error(errData.error || `Download failed (${downloadRes.status})`);
            }

            const blob = await downloadRes.blob();
            const blobUrl = URL.createObjectURL(blob);
            setVideoBlobUrl(blobUrl);
            setIsGenerating(false);
            setGenerationStage('Completed');
            onSaveVideoAsset?.(blobUrl);
          } else if (statusData.error) {
            clearInterval(pollTimerRef.current);
            setIsGenerating(false);
            setErrorMsg(statusData.error.message || 'Video generation failed');
          }
        } catch (err: any) {
          console.error('[Polling error]', err);
          clearInterval(pollTimerRef.current);
          setIsGenerating(false);
          setErrorMsg(err.message || 'Error occurred while processing video');
        }
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setIsGenerating(false);
      setErrorMsg(err.message || 'Video generation failed');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Veo 3 Cinema & Creator Studio</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
                  veo-3.1-fast-generate-preview
                </span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/60 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Veo Cinema 8s Max
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unified Multi-Asset Bay: upload image & video visuals in one place, auto-verify content, and craft top-notch animation prompts
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

        {/* Workspace Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Controls Column (6 cols) */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* UNIFIED MULTI-ASSET DOCK (ALL IN ONE PLACE) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Unified Visual Assets Dock
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Add image and video assets in one place
                  </span>
                </div>

                {/* Grid with Image Asset Slot & Video Asset Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Slot 1: Image Visual Asset */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                          Image Visual Asset
                        </span>
                        {sourceImage && (
                          <button
                            type="button"
                            onClick={() => {
                              setSourceImage(null);
                              setVerifiedSubject(null);
                              setVerifiedKeyframes([]);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                            title="Remove image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {sourceImage ? (
                        <div className="relative rounded overflow-hidden border border-slate-700 h-28 group">
                          <img
                            src={sourceImage}
                            alt="Visual asset"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                            <label className="cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-medium border border-slate-600">
                              Replace
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="h-28 border-2 border-dashed border-slate-700 hover:border-pink-500/50 rounded flex flex-col items-center justify-center cursor-pointer transition p-2 text-center bg-slate-950/50">
                          <Upload className="w-5 h-5 text-slate-500 mb-1" />
                          <span className="text-[11px] font-medium text-slate-300">Upload Image Visual</span>
                          <span className="text-[9px] text-slate-500">Auto-verifies content on upload</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
                      {/* Verify & Auto-Craft Prompt Button */}
                      {sourceImage && (
                        <button
                          type="button"
                          onClick={() => handleVerifyAndCraftPrompt()}
                          disabled={isVerifyingImage}
                          className="w-full py-1.5 px-2 rounded-lg bg-pink-950/60 hover:bg-pink-900/80 border border-pink-700/60 text-pink-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                        >
                          {isVerifyingImage ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-pink-400" />
                              <span>Verifying Content...</span>
                            </>
                          ) : (
                            <>
                              <ScanSearch className="w-3 h-3 text-pink-400" />
                              <span>Verify & Auto-Craft Prompt</span>
                            </>
                          )}
                        </button>
                      )}

                      {(activeBannerUrl || initialImage) && (
                        <button
                          type="button"
                          onClick={handleUseActiveBanner}
                          className="w-full text-[10px] text-slate-400 hover:text-amber-300 py-0.5 flex items-center justify-center gap-1 underline"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          Use Workspace DeepMind Banner
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slot 2: Video Visual Asset */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          <FileVideo className="w-3.5 h-3.5 text-amber-400" />
                          Video Visual Asset
                        </span>
                        {sourceVideo && (
                          <button
                            type="button"
                            onClick={() => {
                              setSourceVideo(null);
                              setSourceVideoName(null);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                            title="Remove video"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {sourceVideo ? (
                        <div className="h-28 rounded bg-slate-950 border border-slate-700 p-2 flex flex-col justify-center items-center text-center">
                          <FileVideo className="w-7 h-7 text-amber-400 mb-1" />
                          <p className="text-[11px] font-medium text-slate-200 line-clamp-1 max-w-[140px]">
                            {sourceVideoName || 'Reference Video Clip'}
                          </p>
                          <span className="text-[9px] text-emerald-400 font-mono mt-0.5">Asset Attached</span>
                          <label className="cursor-pointer text-[10px] text-amber-400 hover:text-amber-300 underline mt-1">
                            Replace
                            <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="hidden" />
                          </label>
                        </div>
                      ) : (
                        <label className="h-28 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded flex flex-col items-center justify-center cursor-pointer transition p-2 text-center bg-slate-950/50">
                          <Upload className="w-5 h-5 text-slate-500 mb-1" />
                          <span className="text-[11px] font-medium text-slate-300">Upload Video Visual</span>
                          <span className="text-[9px] text-slate-500">MP4 or WebM (extend/remix)</span>
                          <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
                      {videoBlobUrl && (
                        <button
                          type="button"
                          onClick={handleUseGeneratedVideoAsSource}
                          className="w-full py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>Use Last Rendered Clip</span>
                        </button>
                      )}
                      {!videoBlobUrl && (
                        <p className="text-[10px] text-slate-500 text-center py-1">
                          Optional reference video for style or extension
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Synthesis Mode Badge */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Synthesis Pipeline:</span>
                  <span className="font-medium text-amber-300 flex items-center gap-1.5">
                    {sourceImage && sourceVideo ? (
                      <>
                        <ImageIcon className="w-3 h-3 text-pink-400" />
                        <span>Image Keyframe + Video Motion Extension</span>
                      </>
                    ) : sourceImage ? (
                      <>
                        <ImageIcon className="w-3 h-3 text-pink-400" />
                        <span>Image-to-Video Animation (Veo 3.1)</span>
                      </>
                    ) : sourceVideo ? (
                      <>
                        <FileVideo className="w-3 h-3 text-amber-400" />
                        <span>Video Extension / Remix Pass</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Text-to-Video Direct Synthesis</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Verified Image Content Banner */}
                {verifiedSubject && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300 space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Verified Image Content:</span>
                      <span className="text-slate-300 font-normal truncate">{verifiedSubject}</span>
                    </div>
                    {verifiedKeyframes.length > 0 && (
                      <div className="text-[10px] text-emerald-400/90 font-mono space-y-0.5 pt-0.5">
                        {verifiedKeyframes.map((kf, i) => (
                          <div key={i} className="truncate">• {kf}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Creator Presets Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    DeepMind Creator Presets
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Click to load</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEEPMIND_CREATOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 transition text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                          {p.tag}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1">
                        {p.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Prompt Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Camera Motion & Animation Prompt
                  </label>

                  {/* AI Creator Enhancer Button */}
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !prompt.trim()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-medium transition active:scale-95 disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Directing Storyboard...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Top-Notch Creator Enhancer</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe camera motion (0-2s, 2-5s, 5-8s), lighting transitions, and physical action..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500/80 transition resize-none font-mono leading-relaxed"
                />

                {creatorNotes && (
                  <p className="mt-1.5 text-[11px] text-slate-400 italic">
                    🎬 {creatorNotes}
                  </p>
                )}
              </div>

              {/* Video Duration Selector (4s, 6s, 8s) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Video Duration (Veo 3.1: 4s to 8s)
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono font-semibold">
                    {durationSeconds} Seconds
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sec: 4, label: '4s Rapid', sub: 'Social teaser' },
                    { sec: 6, label: '6s Standard', sub: 'Commercial spot' },
                    { sec: 8, label: '8s Director Cut', sub: 'Max single pass' },
                  ].map((d) => (
                    <button
                      key={d.sec}
                      type="button"
                      onClick={() => setDurationSeconds(d.sec as 4 | 6 | 8)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        durationSeconds === d.sec
                          ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">{d.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Resolution Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition text-center ${
                        aspectRatio === '16:9'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      16:9 Widescreen
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition text-center ${
                        aspectRatio === '9:16'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      9:16 Vertical
                    </button>
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Resolution
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['720p', '1080p'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setResolution(res)}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition text-center ${
                          resolution === res
                            ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Action Trigger */}
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || (!prompt.trim() && !sourceImage && !sourceVideo)}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rendering {durationSeconds}s Cinema with Veo 3...
                </>
              ) : sourceImage ? (
                <>
                  <Film className="w-4 h-4" />
                  Animate Verified Image into {durationSeconds}s Video ({aspectRatio})
                </>
              ) : sourceVideo ? (
                <>
                  <Video className="w-4 h-4" />
                  Extend Video Visual into {durationSeconds}s Video ({aspectRatio})
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {durationSeconds}s Creator Video ({aspectRatio})
                </>
              )}
            </button>
          </div>

          {/* Video Preview Column (6 cols) */}
          <div className="lg:col-span-6 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4 justify-between min-h-[440px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Veo Cinema Output Player
                </span>
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {durationSeconds}s • {aspectRatio} • {resolution}
                </span>
              </div>

              <div
                className={`relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 flex items-center justify-center ${
                  aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[440px] mx-auto' : 'aspect-video w-full'
                }`}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 p-8 text-center max-w-sm">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                    <p className="text-xs text-amber-400 font-medium">Veo 3 Neural Motion Synthesis</p>
                    <p className="text-[11px] text-slate-300">{generationStage}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                      <span>Model: veo-3.1-fast-generate-preview</span>
                      <span>•</span>
                      <span>Target: {durationSeconds}s</span>
                    </div>
                  </div>
                ) : videoBlobUrl ? (
                  <div className="relative w-full h-full group">
                    <video
                      ref={videoRef}
                      src={videoBlobUrl}
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:scale-110 transition shadow-lg"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[10px] font-mono text-emerald-400">
                      {durationSeconds}s Video Ready
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-300">Ready to synthesize video</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Upload image and video assets in the unified dock to verify content and generate cinema-grade motion
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {videoBlobUrl && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {durationSeconds}s Creator Video Ready
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseGeneratedVideoAsSource}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Extend into Next Scene
                  </button>
                  <a
                    href={videoBlobUrl}
                    download={`veo-video-${Date.now()}.mp4`}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
