import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Sparkles, X, FileAudio, Check, AlertCircle, Loader2 } from 'lucide-react';
import { AudioRecorder } from '../utils/audioStreamer.js';

interface TranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseTranscript: (transcript: string) => void;
}

export const TranscribeModal: React.FC<TranscribeModalProps> = ({
  isOpen,
  onClose,
  onUseTranscript,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setTranscript('');
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordedDuration(0);

      timerRef.current = setInterval(() => {
        setRecordedDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Microphone access denied. Please grant permission.');
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsTranscribing(true);
    setErrorMsg(null);

    try {
      const { base64, mimeType } = await recorderRef.current.stop();
      recorderRef.current = null;

      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscript(data.text || '(No speech detected)');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Transcription error occurred');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsTranscribing(true);
    setTranscript('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const res = await fetch('/api/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: file.type || 'audio/webm' }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Transcription failed');
          }
          setTranscript(data.text || '(No speech detected in file)');
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to process audio file');
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read file');
      setIsTranscribing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Voice Audio Transcriber</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dictate your product vision or upload audio to transcribe with high fidelity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recording / Upload Stage */}
        <div className="p-6 bg-slate-900 flex flex-col items-center justify-center border-b border-slate-800">
          <div className="relative flex flex-col items-center">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition active:scale-95 animate-pulse"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                disabled={isTranscribing}
                className="w-20 h-20 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <Mic className="w-9 h-9" />
              </button>
            )}

            <div className="mt-4 text-center">
              {isRecording ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-base font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Recording: {formatSeconds(recordedDuration)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Tap the red square to finish and transcribe</p>
                </div>
              ) : isTranscribing ? (
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Transcribing audio with gemini-3.5-transcribe...
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-200">Tap to start speaking</p>
                  <p className="text-xs text-slate-400 mt-0.5">Describe your product idea or campaign vision</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-xs text-slate-400">or</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording || isTranscribing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Audio File
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Transcript Output Result */}
        <div className="p-6 bg-slate-950/50 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transcription Output
              </span>
              {transcript && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" /> Transcribed
                </span>
              )}
            </div>

            <div className="min-h-[100px] p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans">
              {transcript ? (
                transcript
              ) : (
                <span className="text-slate-400 italic">
                  Transcription text will appear here once you record or upload audio...
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (transcript) {
                  onUseTranscript(transcript);
                  onClose();
                }
              }}
              disabled={!transcript.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium shadow-lg shadow-cyan-600/20 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Send to Content Factory & Launch Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
