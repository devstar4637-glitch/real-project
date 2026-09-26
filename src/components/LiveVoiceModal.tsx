import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  PhoneCall,
  PhoneOff,
  Radio,
  Sparkles,
  X,
  AlertCircle,
  Send,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Film,
  Layers,
  FileText,
  CheckCircle2,
  Edit3,
  Loader2,
  Share2,
} from 'lucide-react';
import { LiveAudioSession } from '../utils/audioStreamer.js';

interface SynthesizedSpec {
  summary: string;
  product_concept: string;
  image_prompt: string;
  video_prompt: string;
  tagline_suggestion: string;
}

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendIdeaToFactory?: (idea: string) => void;
  onSendToImageAgent?: (prompt: string) => void;
  onSendToVideoAgent?: (prompt: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onSendIdeaToFactory,
  onSendToImageAgent,
  onSendToVideoAgent,
}) => {
  const [sessionStatus, setSessionStatus] = useState<string>('disconnected');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [micDenied, setMicDenied] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');
  const [isSendingText, setIsSendingText] = useState<boolean>(false);
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{ id: string; role: 'user' | 'agent'; text: string; time: string }>
  >([
    {
      id: 'init-1',
      role: 'agent',
      text: 'Connected to gemini-3.8-live. Speak naturally or type any campaign idea to brainstorm, test brand taglines, or storyboard video ads.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Agent Spec Writer & Downstream Handoff state
  const [showHandoffHub, setShowHandoffHub] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizedSpec, setSynthesizedSpec] = useState<SynthesizedSpec | null>(null);
  const [activeSpecTab, setActiveSpecTab] = useState<'all' | 'image' | 'video' | 'pipeline'>('all');
  const [editedConcept, setEditedConcept] = useState<string>('');
  const [editedImagePrompt, setEditedImagePrompt] = useState<string>('');
  const [editedVideoPrompt, setEditedVideoPrompt] = useState<string>('');

  const sessionRef = useRef<LiveAudioSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartSession = async () => {
    setErrorMsg(null);
    setMicDenied(false);

    try {
      const session = new LiveAudioSession({
        onStatusChange: (status) => {
          setSessionStatus(status);
          if (status === 'mic_denied') {
            setMicDenied(true);
          } else if (status.startsWith('mic_error:')) {
            setMicDenied(true);
            setErrorMsg(status.replace('mic_error:', '').trim());
          } else if (status.startsWith('error:')) {
            setErrorMsg(status.replace('error:', '').trim());
          } else if (status === 'listening') {
            setMicDenied(false);
          }
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onInterrupted: () => {
          setSessionStatus('interrupted');
        },
        onTranscript: (data) => {
          setTranscriptHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === data.role && data.role === 'agent') {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  text: last.text.endsWith(data.text) ? last.text : `${last.text} ${data.text}`.trim(),
                },
              ];
            }
            return [
              ...prev,
              {
                id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                role: data.role,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
        },
      });

      sessionRef.current = session;
      await session.start();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to start Live session');
      setSessionStatus('error');
    }
  };

  const handleRetryMic = async () => {
    setErrorMsg(null);
    if (!sessionRef.current) {
      await handleStartSession();
      return;
    }
    const success = await sessionRef.current.retryMicrophone();
    if (success) {
      setMicDenied(false);
    }
  };

  const handleStopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setSessionStatus('disconnected');
    setAudioLevel(0);
    setMicDenied(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || textInput).trim();
    if (!message) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscriptHistory((prev) => [...prev, userMsg]);
    setTextInput('');

    if (sessionRef.current && (sessionStatus === 'listening' || sessionStatus === 'ready' || sessionStatus === 'connected')) {
      sessionRef.current.sendText(message);
      return;
    }

    setIsSendingText(true);
    try {
      const res = await fetch('/api/live/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: transcriptHistory.slice(-4),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setTranscriptHistory((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: 'agent',
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to converse with Live Creative Director', err);
    } finally {
      setIsSendingText(false);
    }
  };

  // Agent Spec Synthesis & Handoff trigger
  const handleSynthesizeHandoff = async (focusPrompt?: string) => {
    setIsSynthesizing(true);
    setShowHandoffHub(true);

    try {
      const res = await fetch('/api/live/synthesize-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptHistory,
          focusMessage: focusPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to synthesize creative brief');
      }

      const data: SynthesizedSpec = await res.json();
      setSynthesizedSpec(data);
      setEditedConcept(data.product_concept || '');
      setEditedImagePrompt(data.image_prompt || '');
      setEditedVideoPrompt(data.video_prompt || '');
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setErrorMsg('Failed to synthesize agent specs: ' + err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleLaunchFactory = () => {
    const conceptToUse = editedConcept || synthesizedSpec?.product_concept || '';
    if (conceptToUse && onSendIdeaToFactory) {
      handleStopSession();
      onSendIdeaToFactory(conceptToUse);
      onClose();
    }
  };

  const handleLaunchImageAgent = () => {
    const promptToUse = editedImagePrompt || synthesizedSpec?.image_prompt || '';
    if (promptToUse && onSendToImageAgent) {
      handleStopSession();
      onSendToImageAgent(promptToUse);
      onClose();
    }
  };

  const handleLaunchVideoAgent = () => {
    const promptToUse = editedVideoPrompt || synthesizedSpec?.video_prompt || '';
    if (promptToUse && onSendToVideoAgent) {
      handleStopSession();
      onSendToVideoAgent(promptToUse);
      onClose();
    }
  };

  const isLive =
    sessionStatus === 'listening' ||
    sessionStatus === 'speaking' ||
    sessionStatus === 'connected' ||
    sessionStatus === 'ready' ||
    sessionStatus === 'thinking';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Radio className={`w-5 h-5 ${isLive ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Live Voice Creative Director</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/60">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bidirectional real-time audio & multi-agent creative handoff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Handoff to Next Agent Button in Header */}
            <button
              onClick={() => handleSynthesizeHandoff()}
              disabled={isSynthesizing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                showHandoffHub
                  ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-violet-300 hover:text-white'
              }`}
            >
              {isSynthesizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              )}
              <span>Write Up Specs & Handoff</span>
            </button>

            <button
              onClick={() => {
                handleStopSession();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-700/80 transition"
              title="Close Live Agent session"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Close</span>
            </button>
          </div>
        </div>

        {/* Top View Toggle: Conversation Mode vs Agent Handoff Hub */}
        {showHandoffHub && (
          <div className="bg-slate-950 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Mode:</span>
              <button
                onClick={() => setShowHandoffHub(false)}
                className="px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Live Dialogue
              </button>
              <button
                onClick={() => setShowHandoffHub(true)}
                className="px-2.5 py-1 rounded-md bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30"
              >
                Agent Handoff Hub
              </button>
            </div>
            <button
              onClick={() => handleSynthesizeHandoff()}
              disabled={isSynthesizing}
              className="text-slate-400 hover:text-violet-300 flex items-center gap-1 transition"
            >
              <Sparkles className="w-3 h-3" />
              <span>Re-synthesize from latest turns</span>
            </button>
          </div>
        )}

        {/* MAIN BODY AREA */}
        {!showHandoffHub ? (
          <>
            {/* Live Audio Stage & Visualizer */}
            <div className="px-6 py-5 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800">
              <div className="relative flex items-center justify-center w-28 h-28">
                {isLive && (
                  <>
                    <div
                      className="absolute inset-0 rounded-full border border-violet-500/30 animate-ping opacity-60"
                      style={{ animationDuration: '2.5s' }}
                    />
                    <div
                      className="absolute -inset-3 rounded-full border border-emerald-500/20 animate-pulse"
                      style={{ transform: `scale(${1 + audioLevel * 0.4})`, transition: 'transform 0.05s ease-out' }}
                    />
                    <div
                      className="absolute -inset-6 rounded-full border border-cyan-500/10"
                      style={{ transform: `scale(${1 + audioLevel * 0.6})`, transition: 'transform 0.05s ease-out' }}
                    />
                  </>
                )}

                <div
                  className={`relative z-10 w-18 h-18 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isLive
                      ? sessionStatus === 'speaking'
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/25 ring-4 ring-emerald-500/20'
                        : sessionStatus === 'listening'
                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-violet-500/25 ring-4 ring-violet-500/20'
                        : 'bg-gradient-to-tr from-blue-600 to-violet-600 shadow-blue-500/25'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  {isLive ? (
                    sessionStatus === 'speaking' ? (
                      <Volume2 className="w-8 h-8 text-white animate-bounce" />
                    ) : sessionStatus === 'listening' ? (
                      <Mic className="w-8 h-8 text-white animate-pulse" />
                    ) : (
                      <Radio className="w-7 h-7 text-white animate-pulse" />
                    )
                  ) : (
                    <MicOff className="w-7 h-7" />
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 flex flex-col items-center text-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isLive
                        ? sessionStatus === 'speaking'
                          ? 'bg-emerald-400 animate-pulse'
                          : sessionStatus === 'listening'
                          ? 'bg-violet-400 animate-ping'
                          : 'bg-indigo-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-sm font-medium capitalize text-slate-200">
                    {isLive
                      ? sessionStatus === 'speaking'
                        ? 'Gemini 3.8 Live is speaking...'
                        : sessionStatus === 'listening'
                        ? 'Listening to your microphone...'
                        : sessionStatus === 'thinking'
                        ? 'Synthesizing creative response...'
                        : 'Connected & ready'
                      : 'Ready to connect'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time 16kHz PCM speech input &rarr; 24kHz synthesized audio output
                </p>
              </div>

              {/* Audio Waveform Bars */}
              {isLive && (
                <div className="flex items-center gap-1.5 mt-2.5 h-4">
                  {[0.4, 0.8, 1.2, 0.6, 1.1, 1.4, 0.7, 0.9, 1.3, 0.5, 0.8, 1.2].map((multiplier, i) => (
                    <div
                      key={i}
                      className="w-1 bg-violet-400/80 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(3, Math.min(18, audioLevel * 20 * multiplier))}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Microphone Permission Advisory & Retry Prompt */}
              {micDenied && (
                <div className="mt-3 w-full max-w-lg p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="flex-1 leading-relaxed">
                      <p className="font-semibold text-amber-100">Microphone permission blocked or unavailable</p>
                      <p className="text-amber-300/90 text-[11px]">
                        Click the <strong>Lock / Settings icon</strong> in your browser address bar, set{' '}
                        <strong>Microphone to "Allow"</strong>, then click <strong>Enable Microphone</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleRetryMic}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow transition active:scale-95"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Enable Microphone
                    </button>
                    <span className="text-[11px] text-amber-300/80">
                      You can also chat below via real-time text!
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && !micDenied && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                {!isLive ? (
                  <>
                    <button
                      onClick={handleStartSession}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm shadow-lg shadow-violet-600/25 transition active:scale-95"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Start Voice Conversation
                    </button>
                    <button
                      onClick={() => {
                        handleStopSession();
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-sm transition"
                      title="Close the Live Agent conversation modal"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Close Live Agent</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStopSession}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-medium text-sm shadow-lg shadow-rose-600/25 transition active:scale-95"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Conversation
                    </button>
                    <button
                      onClick={() => {
                        handleStopSession();
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 hover:text-white font-medium text-sm transition"
                      title="Hang up call and close the Live Agent modal"
                    >
                      <X className="w-4 h-4" />
                      <span>End & Close</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleSynthesizeHandoff()}
                  disabled={isSynthesizing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 hover:text-white font-medium text-sm transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Handoff to Next Agent</span>
                </button>
              </div>
            </div>

            {/* Conversation Log */}
            <div className="p-4 bg-slate-900/90 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Live Dialogue Stream
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  gemini-3.8-live
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {transcriptHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border text-sm transition-all group ${
                      item.role === 'agent'
                        ? 'bg-violet-950/30 border-violet-800/40 text-violet-100'
                        : 'bg-slate-800/70 border-slate-700/60 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-400 capitalize flex items-center gap-1.5">
                        {item.role === 'agent' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            Creative Director (Live API)
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-slate-400" />
                            You
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500">{item.time}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>

                    {/* Quick message dispatch actions */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleSynthesizeHandoff(item.text)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-900/40 hover:bg-violet-800/60 border border-violet-700/50 text-[11px] text-violet-300 font-medium transition"
                      >
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        Write Up Specs for This
                      </button>

                      {onSendIdeaToFactory && (
                        <button
                          onClick={() => {
                            handleStopSession();
                            onSendIdeaToFactory(item.text);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition"
                        >
                          <Layers className="w-3 h-3 text-cyan-400" />
                          Send to Factory
                        </button>
                      )}

                      {onSendToImageAgent && (
                        <button
                          onClick={() => {
                            handleStopSession();
                            onSendToImageAgent(item.text);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition"
                        >
                          <ImageIcon className="w-3 h-3 text-amber-400" />
                          Send to Image Agent
                        </button>
                      )}

                      {onSendToVideoAgent && (
                        <button
                          onClick={() => {
                            handleStopSession();
                            onSendToVideoAgent(item.text);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition"
                        >
                          <Film className="w-3 h-3 text-indigo-400" />
                          Send to Video Agent
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Real-time Bidirectional Text & Prompt Bar */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 shrink-0 font-medium">Quick ideas:</span>
                {[
                  'Critique my coffee grinder concept',
                  'Give me 3 punchy expedition taglines',
                  'Storyboard a 15s cinematic video ad',
                ].map((quickText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(quickText)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition text-xs"
                  >
                    {quickText}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={
                      isLive
                        ? 'Speak into mic or type a concept here...'
                        : 'Type a campaign concept to converse live with Creative Director...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!textInput.trim() || isSendingText}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium text-sm transition flex items-center gap-1.5 shadow-md shadow-violet-600/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* AGENT SPEC WRITER & DOWNSTREAM DISPATCH HUB */
          /* ========================================================================= */
          <div className="p-6 bg-slate-900/95 flex-1 overflow-y-auto space-y-6">
            {isSynthesizing ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                  <div className="relative w-16 h-16 rounded-2xl bg-violet-950/60 border border-violet-500/40 flex items-center justify-center text-violet-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">
                    Agent Writing Execution Specs...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Analyzing conversation context, extracting product positioning, and crafting dedicated prompts for image, video, and multi-agent factory dispatch.
                  </p>
                </div>
              </div>
            ) : synthesizedSpec ? (
              <div className="space-y-6">
                {/* Executive Summary Banner */}
                <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                      Synthesized Creative Direction
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {synthesizedSpec.summary}
                  </p>
                  {synthesizedSpec.tagline_suggestion && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-medium">Tagline hook:</span>
                      <span className="px-2 py-0.5 rounded bg-violet-900/50 text-violet-200 font-mono font-medium border border-violet-700/50">
                        "{synthesizedSpec.tagline_suggestion}"
                      </span>
                    </div>
                  )}
                </div>

                {/* Target Execution Agent Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {/* CARD 1: Full Autonomous Factory Pipeline */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-800/40 hover:border-cyan-600/60 transition space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Autonomous Multi-Agent Factory</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                              antigravity-preview-09-2026
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Dispatches Planner &rarr; Workers (copy, tagline, image) &rarr; Evaluator with auto-retry
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Synthesized Product Idea (Decomposed for Planner Agent):
                      </label>
                      <textarea
                        value={editedConcept}
                        onChange={(e) => setEditedConcept(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleLaunchFactory}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/20 transition active:scale-95"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Dispatch to Autonomous Factory Pipeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: Direct Image Generation Agent */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-800/40 hover:border-amber-600/60 transition space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-700/50 flex items-center justify-center text-amber-400">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Product Image Generation Agent</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                              gemini-3.1-flash-image-preview
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Writes photorealistic studio shot specs: lighting, materials, angle, & staging
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Synthesized Image Prompt Spec:
                      </label>
                      <textarea
                        value={editedImagePrompt}
                        onChange={(e) => setEditedImagePrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleLaunchImageAgent}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition active:scale-95"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Send to Image Agent & Generate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: Direct Video Generation Agent */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-800/40 hover:border-indigo-600/60 transition space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Cinematic Video Generation Agent</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                              veo-3.1-fast-generate-preview
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Writes cinematic camera motion, dramatic lighting shifts, and scene actions (16:9 / 9:16)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Synthesized Video Scene Storyboard:
                      </label>
                      <textarea
                        value={editedVideoPrompt}
                        onChange={(e) => setEditedVideoPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleLaunchVideoAgent}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition active:scale-95"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Send to Video Agent & Generate (Veo 3)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation & Close Bar */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setShowHandoffHub(false)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Live Dialogue</span>
                  </button>

                  <button
                    onClick={() => {
                      handleStopSession();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition active:scale-95"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                    <span>Close Live Agent</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p>Click "Write Up Specs & Handoff" to synthesize instructions for the execution agents.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
