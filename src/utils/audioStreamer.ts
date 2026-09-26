// Audio streaming helper for gemini-3.8-live and gemini-3.5-transcribe

export class LiveAudioSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private isMicActive: boolean = false;
  private onStatusChange?: (status: string) => void;
  private onInterrupted?: () => void;
  private onAudioLevel?: (level: number) => void;
  private onTranscript?: (data: { role: 'user' | 'agent'; text: string }) => void;

  constructor(callbacks?: {
    onStatusChange?: (status: string) => void;
    onInterrupted?: () => void;
    onAudioLevel?: (level: number) => void;
    onTranscript?: (data: { role: 'user' | 'agent'; text: string }) => void;
  }) {
    this.onStatusChange = callbacks?.onStatusChange;
    this.onInterrupted = callbacks?.onInterrupted;
    this.onAudioLevel = callbacks?.onAudioLevel;
    this.onTranscript = callbacks?.onTranscript;
  }

  async start(): Promise<void> {
    // 1. Initialize output AudioContext first (requires user gesture, which called this)
    try {
      this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }
      this.nextStartTime = this.outputAudioCtx.currentTime;
    } catch (e) {
      console.warn('[LiveAudioSession] Output AudioContext initialization warning:', e);
    }

    // 2. Connect WebSocket to /live
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      this.isConnected = true;
      this.onStatusChange?.('connected');
      // Attempt to initialize microphone capture
      await this.initAudioCapture();
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          this.playAudioChunk(msg.audio);
          this.onStatusChange?.('speaking');
        }
        if (msg.agentText) {
          this.onTranscript?.({ role: 'agent', text: msg.agentText });
        }
        if (msg.userText) {
          this.onTranscript?.({ role: 'user', text: msg.userText });
        }
        if (msg.interrupted) {
          this.clearAudioQueue();
          this.onInterrupted?.();
          this.onStatusChange?.('interrupted');
        }
        if (msg.turnComplete) {
          this.onStatusChange?.(this.isMicActive ? 'listening' : 'ready');
        }
        if (msg.error) {
          console.error('[LiveAudioSession Error]', msg.error);
          this.onStatusChange?.(`error: ${msg.error}`);
        }
      } catch (err) {
        console.error('[LiveAudioSession Message Parse Error]', err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.onStatusChange?.('disconnected');
      this.stop();
    };

    this.ws.onerror = (err) => {
      console.error('[LiveAudioSession WebSocket Error]', err);
      this.onStatusChange?.('error');
    };
  }

  async retryMicrophone(): Promise<boolean> {
    return await this.initAudioCapture();
  }

  private async initAudioCapture(): Promise<boolean> {
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.inputAudioCtx) {
        await this.inputAudioCtx.close();
        this.inputAudioCtx = null;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Compute volume level for visualizer
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);
        this.onAudioLevel?.(Math.min(1, rms * 6));

        // Convert Float32 to 16-bit PCM little-endian
        const pcmBase64 = this.floatTo16BitPCMBase64(inputChannelData);
        this.ws.send(JSON.stringify({ audio: pcmBase64 }));
      };

      source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
      this.isMicActive = true;
      this.onStatusChange?.('listening');
      return true;
    } catch (err: any) {
      console.warn('[LiveAudioSession mic init notice]', err);
      this.isMicActive = false;
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('Permission') ||
        err.message?.includes('denied');
      
      this.onStatusChange?.(isDenied ? 'mic_denied' : `mic_error: ${err.message || 'Microphone unavailable'}`);
      return false;
    }
  }

  sendText(text: string) {
    if (!text || !text.trim()) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: text.trim() }));
      this.onStatusChange?.('thinking');
    }
  }

  private playAudioChunk(base64Audio: string) {
    if (!this.outputAudioCtx) return;

    try {
      const rawData = atob(base64Audio);
      const byteLength = rawData.length;
      const int16Array = new Int16Array(byteLength / 2);
      const dataView = new DataView(new ArrayBuffer(byteLength));

      for (let i = 0; i < byteLength; i++) {
        dataView.setUint8(i, rawData.charCodeAt(i));
      }

      for (let i = 0; i < int16Array.length; i++) {
        int16Array[i] = dataView.getInt16(i * 2, true); // little-endian
      }

      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      sourceNode.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      // Animate agent speech volume
      let sum = 0;
      for (let i = 0; i < Math.min(200, float32Array.length); i++) {
        sum += Math.abs(float32Array[i]);
      }
      const level = Math.min(1, (sum / 200) * 4);
      this.onAudioLevel?.(level);
    } catch (e) {
      console.error('[playAudioChunk error]', e);
    }
  }

  private clearAudioQueue() {
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
  }

  private floatTo16BitPCMBase64(float32Array: Float32Array): string {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // true for little-endian
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop() {
    this.isConnected = false;
    this.isMicActive = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.mediaStream = null;
    }
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (e) {}
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch (e) {}
      this.outputAudioCtx = null;
    }
    this.onStatusChange?.('stopped');
  }
}

// Helper to record audio via browser MediaRecorder for gemini-3.5-transcribe
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async start(): Promise<void> {
    this.audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose standard supported mime type
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  stop(): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('MediaRecorder not initialized'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ base64, mimeType });
          };
          reader.readAsDataURL(audioBlob);

          // Stop mic tracks
          this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          reject(e);
        }
      };

      this.mediaRecorder.stop();
    });
  }
}
