import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GenerateVideosOperation, Modality } from '@google/genai';
import { agentRunsStore, startAutonomousPipeline, getGeminiClient } from './src/agentPipeline.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS helper headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Seed an initial demo run if empty so users instantly have context
const initialDemoRunId = 'run_demo_9824';
if (!agentRunsStore.has(initialDemoRunId)) {
  agentRunsStore.set(initialDemoRunId, {
    run_id: initialDemoRunId,
    idea: 'A compact espresso maker that fits in a backpack and runs on rechargeable USB-C batteries.',
    status: 'completed',
    stage: 'completed',
    agents: {
      planner: {
        status: 'completed',
        output: {
          target_audience: 'Outdoor enthusiasts, digital nomads, and specialty coffee connoisseurs on the move',
          value_proposition: 'True 9-bar espresso anywhere in the world, powered by universal USB-C charging',
          tone_and_style: 'Precision-engineered, adventurous, uncompromising, tactile',
          visual_direction: 'Sleek matte obsidian finish, machined anodized aluminum collar, morning mist mountain backdrop',
        },
      },
      tagline_worker: {
        status: 'completed',
        attempts: 2,
        current_draft: 'Peak Extraction. Anywhere On Earth.',
        score: 9.2,
      },
      copy_worker: {
        status: 'completed',
        attempts: 1,
        score: 8.8,
      },
      image_worker: {
        status: 'completed',
        attempts: 2,
        score: 8.9,
      },
      evaluator: {
        status: 'completed',
        current_round: 2,
      },
    },
    step_log: [
      {
        id: 'step_demo_1',
        run_id: initialDemoRunId,
        agent: 'orchestrator',
        type: 'thought',
        title: 'Antigravity Orchestration Initialized',
        content: 'Decomposing backpack espresso concept into worker task graph with 7.0 score quality gate.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'step_demo_2',
        run_id: initialDemoRunId,
        agent: 'planner',
        type: 'model_output',
        title: 'Creative Blueprint Finalized',
        content: 'Target persona: Digital nomads & mountaineers. Focus on real 9-bar pressure and USB-C speed.',
        timestamp: new Date(Date.now() - 3550000).toISOString(),
      },
      {
        id: 'step_demo_3',
        run_id: initialDemoRunId,
        agent: 'evaluator',
        type: 'evaluation',
        title: 'Round 1 Scoring Complete',
        content: 'Tagline attempt 1 ("Coffee On The Go") scored 5.8 < 7.0. Auto-retry triggered.',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        id: 'step_demo_4',
        run_id: initialDemoRunId,
        agent: 'retry_arbiter',
        type: 'retry',
        title: 'Tagline Worker Retry #2',
        content: 'Refined prompt incorporating evaluator feedback on punchiness and premium positioning.',
        timestamp: new Date(Date.now() - 3300000).toISOString(),
      },
      {
        id: 'step_demo_5',
        run_id: initialDemoRunId,
        agent: 'evaluator',
        type: 'evaluation',
        title: 'Round 2 Scoring Passed',
        content: 'Tagline attempt 2 ("Peak Extraction. Anywhere On Earth.") scored 9.2 >= 7.0. Quality threshold satisfied.',
        timestamp: new Date(Date.now() - 3200000).toISOString(),
      },
    ],
    attempt_counts: {
      tagline: 2,
      copy: 1,
      image: 2,
    },
    assets: {
      tagline: 'Peak Extraction. Anywhere On Earth.',
      marketing_copy: {
        headline: 'Laboratory-Grade 9-Bar Crema at 14,000 Feet',
        body: 'Meet the NomadForge Pulse: an aerospace-grade handheld espresso machine that produces authentic 9-bar extraction in under 45 seconds. Charged via standard USB-C, its thermal induction core maintains a precise 93°C brew temp through 18 consecutive shots on a single charge. Whether you are posted at a trailhead basecamp or a high-rise airport lounge, never settle for compromised coffee again.',
        call_to_action: 'Claim Your NomadForge Pulse — First Batch Shipping With Commemorative Titanium Dosing Cup',
        key_benefits: [
          'True 9-Bar Pneumatic Extraction chamber',
          'Instant USB-C Fast Charge (18 double shots per charge)',
          'Precision 93°C induction thermal jacket',
          'Aerospace grade CNC-machined unibody weighing under 420g',
        ],
      },
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
      image_prompt: 'High-end minimalist portable espresso maker, matte black anodized aluminum with brushed bronze accents, steaming rich crema espresso shot poured into a double-walled glass cup, set against a dramatic misty mountain morning summit table, commercial studio lighting, 8k resolution, cinematic depth of field.',
    },
    scores: {
      tagline: {
        score: 9.2,
        passed: true,
        reasoning: 'Exceptional economy of language. Conveys high performance ("Peak Extraction") while anchoring universal mobility ("Anywhere On Earth").',
        criteria_breakdown: { clarity: 9.5, creativity: 9.0, appeal: 9.2, brand_fit: 9.1 },
      },
      marketing_copy: {
        score: 8.8,
        passed: true,
        reasoning: 'Strong sensory imagery backed by concrete technical specs (9-bar, 93°C, 420g). Compelling tone that respects the target audience intelligence.',
        criteria_breakdown: { clarity: 9.0, creativity: 8.5, appeal: 9.0, brand_fit: 8.7 },
      },
      image: {
        score: 8.9,
        passed: true,
        reasoning: 'Atmospheric lighting and impeccable product surfacing. Beautiful juxtaposition of wilderness elevation and precision craftsmanship.',
        criteria_breakdown: { clarity: 9.1, creativity: 8.8, appeal: 9.0, brand_fit: 8.7 },
      },
      overall: 8.97,
    },
    retry_history: [
      {
        asset: 'tagline',
        attempt: 1,
        previous_score: 5.8,
        feedback: 'Too generic; sounds like instant coffee sachet packaging rather than high-end expedition gear.',
        decision: 'Agent rejected asset and triggered automatic prompt revision with strict brevity and premium tone constraints.',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
    ],
    traceability: {
      interaction_id: 'iact_antigravity_092026_demo_9824',
      sandbox_environment_id: 'env_sbx_linux_container_0831',
      orchestrator_model: 'antigravity-preview-09-2026',
      text_model: 'gemini-3.8-flash',
      image_model: 'gemini-3.1-flash-lite-image',
      total_duration_ms: 14250,
      native_code_execution_used: true,
      storage_bucket: 'gs://content-factory-assets-prod-asia-east1/runs/run_demo_9824',
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3100000).toISOString(),
  });
}

// -------------------------------------------------------------
// REQUIRED API CONTRACT ENDPOINTS
// -------------------------------------------------------------

// POST /generate {"idea": "..."} -> {"run_id": "..."}
const handleGenerate = (req: express.Request, res: express.Response) => {
  const { idea } = req.body || {};
  if (!idea || typeof idea !== 'string' || !idea.trim()) {
    return res.status(400).json({ error: 'Field "idea" is required and must be a non-empty string.' });
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // Kick off autonomous agent pipeline in background
  startAutonomousPipeline(runId, idea.trim()).catch((err) => {
    console.error(`[Pipeline Error] Run ${runId} encountered fatal error:`, err);
  });

  return res.status(202).json({
    run_id: runId,
    status: 'queued',
    message: 'Autonomous pipeline initiated. Multi-agent platform orchestrating via antigravity-preview-09-2026.',
  });
};

app.post('/generate', handleGenerate);
app.post('/api/generate', handleGenerate);

// GET /status/{run_id} -> live pipeline state
const handleStatus = (req: express.Request, res: express.Response) => {
  const runId = req.params.run_id;
  const run = agentRunsStore.get(runId);

  if (!run) {
    return res.status(404).json({ error: `Run with ID "${runId}" not found.` });
  }

  return res.status(200).json({
    run_id: run.run_id,
    idea: run.idea,
    status: run.status,
    stage: run.stage,
    agents: run.agents,
    step_log: run.step_log,
    attempt_counts: run.attempt_counts,
    created_at: run.created_at,
    updated_at: run.updated_at,
    error: run.error,
  });
};

app.get('/status/:run_id', handleStatus);
app.get('/api/status/:run_id', handleStatus);

// GET /result/{run_id} -> final assets, scores, retry history
const handleResult = (req: express.Request, res: express.Response) => {
  const runId = req.params.run_id;
  const run = agentRunsStore.get(runId);

  if (!run) {
    return res.status(404).json({ error: `Run with ID "${runId}" not found.` });
  }

  if (run.status === 'running' || run.status === 'queued') {
    return res.status(202).json({
      run_id: run.run_id,
      status: run.status,
      stage: run.stage,
      message: 'Pipeline is still actively executing. Please poll /status/:run_id until status is "completed".',
      step_count: run.step_log.length,
    });
  }

  if (run.status === 'failed') {
    return res.status(500).json({
      run_id: run.run_id,
      status: 'failed',
      error: run.error,
      step_log: run.step_log,
    });
  }

  return res.status(200).json({
    run_id: run.run_id,
    status: run.status,
    idea: run.idea,
    assets: run.assets,
    scores: run.scores,
    retry_history: run.retry_history || [],
    traceability: run.traceability,
  });
};

app.get('/result/:run_id', handleResult);
app.get('/api/result/:run_id', handleResult);

// Helper endpoints for UI
app.get('/api/runs', (req, res) => {
  const runs = Array.from(agentRunsStore.values()).map(r => ({
    run_id: r.run_id,
    idea: r.idea,
    status: r.status,
    stage: r.stage,
    overall_score: r.scores?.overall,
    created_at: r.created_at,
    retries_count: (r.retry_history || []).length,
  }));
  runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ runs });
});

// SSE endpoint for smooth real-time stream
app.get('/api/stream/:run_id', (req, res) => {
  const runId = req.params.run_id;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const interval = setInterval(() => {
    const run = agentRunsStore.get(runId);
    if (!run) {
      res.write(`data: ${JSON.stringify({ error: 'not_found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(run)}\n\n`);

    if (run.status === 'completed' || run.status === 'failed') {
      clearInterval(interval);
      res.end();
    }
  }, 800);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// -------------------------------------------------------------
// FEATURE 1: AUDIO TRANSCRIPTION (gemini-3.5-transcribe)
// -------------------------------------------------------------
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 payload is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this spoken audio accurately. Output only the clear, unformatted transcript text of what was spoken.',
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    return res.json({
      text: transcript,
      model: 'gemini-3.5-transcribe',
    });
  } catch (error: any) {
    console.error('[Transcribe Error]', error);
    return res.status(500).json({
      error: error.message || 'Audio transcription failed',
    });
  }
});

// -------------------------------------------------------------
// FEATURE 2: CREATE & EDIT IMAGES (gemini-3.1-flash-image-preview)
// -------------------------------------------------------------
app.post('/api/image/generate', async (req, res) => {
  try {
    const { prompt, editImageBase64, editImageMimeType, aspectRatio } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (editImageBase64) {
      const cleanBase64 = editImageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: editImageMimeType || 'image/png',
        },
      });
      parts.push({ text: `Modify and edit the image following this instruction: ${prompt}` });
    } else {
      parts.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
        },
      },
    });

    let imageUrl = '';
    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if ((part as any).inlineData?.data) {
        const mime = (part as any).inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${(part as any).inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      // Fallback placeholder if safety or format variation
      imageUrl = `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80`;
    }

    return res.json({
      imageUrl,
      prompt,
      mode: editImageBase64 ? 'edited' : 'created',
      model: 'gemini-3.1-flash-image-preview',
    });
  } catch (error: any) {
    console.error('[Image Studio Error]', error);
    return res.status(500).json({
      error: error.message || 'Image generation/editing failed',
    });
  }
});

// Context-Oriented Prompt Optimizer for Image Generation
app.post('/api/image/optimize-prompt', async (req, res) => {
  try {
    const { rawPrompt, context, targetAspect } = req.body || {};
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      return res.status(400).json({ error: 'rawPrompt string is required' });
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are the Principal Creative Director specializing in hyper-photorealistic commercial, keynote, and tech event imagery for Google DeepMind and AI Studio.
When a user provides a brief request (such as "google deepmind hackathon publishable image"), convert it into a single, cohesive, publication-grade image generation prompt specifically optimized for gemini-3.1-flash-image-preview.
Follow these design principles:
1. Google DeepMind Brand & Tech Context: Incorporate signature DeepMind motifs—luminous neural synaptic networks, multidimensional polyhedral lattices, glowing quantum tensors, refractive dichroic prisms, and electric cyan (#00F0FF), quantum violet (#8A2BE2), and neon cobalt (#1E90FF) highlights against deep space navy obsidian (#000414).
2. Composition & Publishing Quality: Specify camera angle, focal length (e.g. 50mm or 85mm prime lens), cinematic volumetric god-rays, rim lighting, atmospheric depth of field, and raytraced reflections on dark mirror pedestal.
3. Typography & Badging: If relevant for hackathons or events, describe clean futuristic embossed or holographic typography (e.g. "GOOGLE DEEPMIND HACKATHON").
4. Return ONLY a JSON object: {"optimizedPrompt": "...", "recommendedAspect": "16:9"|"1:1"|"3:4", "designNotes": "..."}. No markdown code block wraps.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Optimize this brief user prompt for maximum publishable quality: "${rawPrompt}". Extra context: ${context || 'Google DeepMind Hackathon / Key Visual'}. Target aspect ratio: ${targetAspect || '16:9'}.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    let data;
    try {
      data = JSON.parse(response.text || '{}');
    } catch (e) {
      data = {
        optimizedPrompt: `Official keynote key visual poster for Google DeepMind Hackathon 2026. A hyper-futuristic glowing neural nexus and multidimensional crystal AI lattice floating in deep space navy obsidian. Glowing quantum nodes pulsing with electric cyan, luminous violet, and neon cobalt blue energy ribbons. A polished dark mirror reflection beneath, subtle holographic typography displaying GOOGLE DEEPMIND HACKATHON with sleek futuristic typography. Volumetric god-rays, cinematic lighting, 8k commercial quality, award-winning technology conference keynote visual.`,
        recommendedAspect: '16:9',
        designNotes: 'Optimized with DeepMind neural architecture, signature cobalt/cyan palette, and keynote publishing lighting.',
      };
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Optimize Prompt Error]', error);
    return res.status(500).json({ error: error.message || 'Failed to optimize prompt' });
  }
});

// -------------------------------------------------------------
// FEATURE 3 & 4: VEO VIDEO GENERATION (veo-3.1-fast-generate-preview)
// (Text-to-Video, Animate Image into Video, and Video Asset Extension/Remix with 5s/8s/10s duration)
// -------------------------------------------------------------
app.post('/api/generate-video', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      imageMimeType,
      videoBase64,
      videoMimeType,
      aspectRatio,
      resolution,
      durationSeconds,
    } = req.body || {};

    if (!prompt && !imageBase64 && !videoBase64) {
      return res.status(400).json({ error: 'Either prompt, image, or video asset is required' });
    }

    const ai = getGeminiClient();
    const config: any = {
      numberOfVideos: 1,
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      resolution: resolution === '1080p' ? '1080p' : '720p',
    };

    // Veo 3 API strictly bounds durationSeconds between 4 and 8 (maximum 8s per single clip)
    let safeDuration = 8;
    if (durationSeconds !== undefined && durationSeconds !== null) {
      const parsedSec = Number(durationSeconds);
      if (!isNaN(parsedSec)) {
        safeDuration = Math.min(8, Math.max(4, Math.round(parsedSec)));
      }
    }
    config.durationSeconds = safeDuration;

    let operation;
    // Determine the primary visual keyframe: imageBase64 has top priority, followed by videoFrameBase64
    const activeVisualBase64 = imageBase64 || req.body?.videoFrameBase64;
    const activeVisualMime = imageBase64 ? (imageMimeType || 'image/png') : 'image/jpeg';

    if (activeVisualBase64) {
      // Image-to-Video Animation mode (Veo 3.1)
      const cleanImageBase64 = activeVisualBase64.replace(/^data:[^;]+;base64,/, '');
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Cinematic camera moves smoothly across the subject with dynamic studio lighting and atmospheric depth',
        image: {
          imageBytes: cleanImageBase64,
          mimeType: activeVisualMime,
        },
        config,
      });
    } else {
      // Text-to-Video mode
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Cinematic 8k commercial sequence with dynamic camera trajectory and studio lighting',
        config,
      });
    }

    return res.json({
      operationName: operation.name,
      model: 'veo-3.1-fast-generate-preview',
      aspectRatio: config.aspectRatio,
      durationSeconds: safeDuration,
    });
  } catch (error: any) {
    console.error('[Veo Generation Error]', error);
    return res.status(500).json({
      error: error.message || 'Video generation failed',
    });
  }
});

// Top-Notch Creator Level Video Storyboard & Prompt Enhancer (8s Cinema & Multi-Clip Sequence)
app.post('/api/video/optimize-prompt', async (req, res) => {
  try {
    const { rawPrompt, durationSeconds, context, assetType } = req.body || {};
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      return res.status(400).json({ error: 'rawPrompt is required' });
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are an elite Hollywood Director and Lead Creative Producer at Google DeepMind specializing in high-impact creator-level cinema, keynote openers, and commercial product spots for Veo 3 (veo-3.1-fast-generate-preview).
Note: Veo 3 generates up to 8 seconds per single generation pass.
When given a user prompt or idea (such as for a Google DeepMind Hackathon, tech product, or commercial teaser), structure it into a cohesive, top-notch creator level 8-second cinematic video prompt.
Direct the pacing across the 8 seconds:
- 0 to 2s: Hook shot, cinematic camera trajectory (e.g. continuous low-angle orbital crane or high-speed push-in).
- 2 to 5s: Dynamic kinetic motion, lighting flare, DeepMind neural lattice pulsing with electric cyan and quantum violet, or mechanical device transformation.
- 5 to 8s: Climax and hero frame hold, volumetric atmospheric god-rays, sleek holographic typographic title lockup (e.g. "GOOGLE DEEPMIND HACKATHON 2026").
Specify: 24fps film motion blur, photorealistic depth of field, anamorphic lens flares, and raytraced reflections on dark mirror pedestal.
Return ONLY valid JSON: {"optimizedPrompt": "...", "durationSeconds": 8, "recommendedAspect": "16:9", "creatorNotes": "..."}. No markdown wrappers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Transform this into a top-notch 8-second creator video prompt for Veo 3: "${rawPrompt}". Context: ${context || 'Google DeepMind Hackathon Keynote Video'}. Reference asset type: ${assetType || 'image and text'}. Target duration: ${Math.min(8, Number(durationSeconds) || 8)} seconds.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    let data;
    try {
      data = JSON.parse(response.text || '{}');
      if (data.durationSeconds) {
        data.durationSeconds = Math.min(8, Math.max(4, Number(data.durationSeconds) || 8));
      } else {
        data.durationSeconds = 8;
      }
    } catch (e) {
      data = {
        optimizedPrompt: `Official keynote opening video for Google DeepMind Hackathon 2026. Continuous cinematic orbital crane shot soaring towards a monumental levitating neural core of refractive dichroic glass and multidimensional crystal lattices. (0-2s) Electric cyan (#00F0FF) and quantum violet (#8A2BE2) energy pulses surge through synaptic pathways. (2-5s) Volumetric god-rays burst outward as sleek holographic typography ignites in mid-air: "GOOGLE DEEPMIND HACKATHON 2026". (5-8s) Camera locks onto hero angle with raytraced reflections on dark obsidian mirror ground, cinematic 24fps motion blur, 8k creator cinema masterpiece.`,
        durationSeconds: 8,
        recommendedAspect: '16:9',
        creatorNotes: '8-second creator sequence with 3-act pacing: hook, energy surge, and hero title lockup.',
      };
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Video Prompt Optimizer Error]', error);
    return res.status(500).json({ error: error.message || 'Failed to optimize video prompt' });
  }
});

// Image Content Verification & Automatic Animation Prompt Synthesizer
app.post('/api/video/analyze-image-prompt', async (req, res) => {
  try {
    const { imageBase64, imageMimeType, userIntent, context } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required to analyze image content' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const systemInstruction = `You are an expert Vision AI and Senior Video Motion Director for Veo 3 (veo-3.1-fast-generate-preview).
Your mission is to examine the provided image with extreme fidelity, verify its exact subject matter, materials, environment, text/logos, and style, and then author a high-fidelity image-to-video animation prompt.

CRITICAL RULES:
1. Grounded Verification: Identify what is ACTUALLY in the image (e.g. is it a luxury portable espresso maker, a futuristic DeepMind neural crystal lattice, a smartwatch, or a keynote stage?). Never hallucinate an unrelated product or topic.
2. Motion & Camera Direction: Tell Veo 3 how to animate THIS SPECIFIC image as its starting keyframe.
   - Prescribe realistic camera trajectories (e.g., slow orbital 3D pan, cinematic push-in, low-angle tracking, gentle crane rise).
   - Prescribe physical movement native to the scene (e.g., steam curling, liquid pouring, lights pulsing, fiber-optic energy surging, atmospheric haze drifting, raytraced reflections moving).
   - If there is a brand context (like Google DeepMind Hackathon or luxury tech commercial), weave subtle atmospheric lighting effects (like cyan and violet reflections, volumetric god-rays) that harmonize with the visual.
3. Structure the 8-second timing:
   - 0-2s: Initial subtle camera drift and kinetic wake-up.
   - 2-5s: Main kinetic action, dynamic light sweeps, material highlights.
   - 5-8s: Harmonious deceleration into a crisp, stable hero frame with raytraced reflections.

Return ONLY valid JSON matching this schema:
{
  "detectedSubject": "A brief summary of what is verified in the image (e.g. 'Luxury portable espresso maker on wet obsidian stone with mountain sunrise')",
  "motionPrompt": "The complete, highly-detailed animation prompt starting from this image",
  "recommendedDuration": 8,
  "recommendedAspect": "16:9",
  "keyframes": [
    "0-2s: ...",
    "2-5s: ...",
    "5-8s: ..."
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: imageMimeType || 'image/png',
              },
            },
            {
              text: `Verify the exact content of this image and generate a top-notch image-to-video animation prompt for Veo 3. User intent or context: ${userIntent || context || 'Animate with cinematic commercial quality'}.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    let data;
    try {
      data = JSON.parse(response.text || '{}');
      if (data.recommendedDuration) {
        data.recommendedDuration = Math.min(8, Math.max(4, Number(data.recommendedDuration) || 8));
      } else {
        data.recommendedDuration = 8;
      }
    } catch (e) {
      data = {
        detectedSubject: 'Verified visual asset',
        motionPrompt: 'Cinematic camera moves forward in slow continuous orbital push-in, soft volumetric lighting and natural atmospheric reflections animate gracefully across surfaces.',
        recommendedDuration: 8,
        recommendedAspect: '16:9',
        keyframes: ['0-2s: Camera pans gently', '2-5s: Lighting and reflections shift', '5-8s: Stabilizes into hero hold'],
      };
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Analyze Image Prompt Error]', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze image content' });
  }
});

app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body || {};
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGeminiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    return res.json({
      done: updated.done,
      error: updated.error,
    });
  } catch (error: any) {
    console.error('[Veo Status Error]', error);
    return res.status(500).json({
      error: error.message || 'Failed to check video status',
    });
  }
});

app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body || {};
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGeminiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const videoObj = updated.response?.generatedVideos?.[0]?.video;

    if (videoObj?.videoBytes) {
      const buf = Buffer.from(videoObj.videoBytes, 'base64');
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', buf.length);
      return res.end(buf);
    }

    const uri = videoObj?.uri;
    if (!uri) {
      return res.status(404).json({ error: 'No video output available yet' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey || '' },
    });

    if (!videoRes.ok) {
      const sep = uri.includes('?') ? '&' : '?';
      videoRes = await fetch(`${uri}${sep}key=${apiKey || ''}`);
    }

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      console.error('[Veo Download Fetch Error]', videoRes.status, errText);
      return res.status(502).json({ error: `Failed to download video stream (${videoRes.status})` });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    return res.end(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('[Veo Download Error]', error);
    return res.status(500).json({
      error: error.message || 'Failed to download video',
    });
  }
});

// Interactive live text conversation endpoint (creative director assistant)
app.post('/api/live/converse', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message string is required' });
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction:
          'You are the autonomous Multimodal Creative Director. You converse live with users in natural real-time voice and text, helping them brainstorm product ideas, refine marketing campaigns, critique video concepts, and polish taglines. Keep your responses crisp, punchy, conversational, and under 3-4 sentences so dialogue flows dynamically.',
      },
    });

    const reply = response.text || 'I hear your concept loud and clear. Let us refine the visual and verbal identity.';
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('[Live Converse Error]', error);
    return res.status(500).json({ error: error.message || 'Failed to generate live response' });
  }
});

// Agent synthesis and handoff endpoint: turns live conversation into structured briefs for image, video, and multi-agent factory
app.post('/api/live/synthesize-handoff', async (req, res) => {
  try {
    const { transcript, focusMessage } = req.body || {};
    
    let conversationText = '';
    if (Array.isArray(transcript)) {
      conversationText = transcript
        .map((t: any) => `${t.role === 'user' ? 'User' : 'Creative Director'}: ${t.text}`)
        .join('\n');
    }
    if (focusMessage) {
      conversationText += `\nSpecific Highlight/Prompt to build: ${focusMessage}`;
    }

    if (!conversationText.trim()) {
      return res.status(400).json({ error: 'No conversation or prompt provided to synthesize' });
    }

    const ai = getGeminiClient();
    const prompt = `You are the Lead Creative Planner and Agent Dispatcher.
Analyze this live conversation brainstorm between a user and the Creative Director:

--- BEGIN CONVERSATION ---
${conversationText}
--- END CONVERSATION ---

Your task is to write up comprehensive, professional creative specs and prompt handoffs for the downstream execution agents:
1. "product_concept": A crisp, high-impact 1-sentence product idea ready for the Autonomous Multi-Agent Factory pipeline.
2. "image_prompt": A rich, detailed photographic studio prompt ready for gemini-3.1-flash-image-preview (specify lighting, composition, materials, background, and cinematic styling).
3. "video_prompt": A cinematic commercial scene prompt ready for veo-3.1-fast-generate-preview (specify camera motion like dolly in/orbit, lighting shifts, and high-framerate action).
4. "tagline_suggestion": A punchy 3-6 word slogan.
5. "summary": A 2-sentence executive summary of the agreed creative direction.

Return strictly valid JSON with this exact structure:
{
  "summary": "...",
  "product_concept": "...",
  "image_prompt": "...",
  "video_prompt": "...",
  "tagline_suggestion": "..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('[Synthesize Handoff Error]', error);
    return res.status(500).json({ error: error.message || 'Failed to synthesize creative brief' });
  }
});

// Create HTTP server to mount both Express and WebSocket
const server = http.createServer(app);

// -------------------------------------------------------------
// FEATURE 5: LIVE VOICE CONVERSATIONS (gemini-3.8-live)
// -------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected to /live WebSocket');
  let session: any = null;

  try {
    const ai = getGeminiClient();
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction:
          'You are the autonomous Multimodal Creative Director. You converse live with users in natural real-time voice, helping them brainstorm product ideas, refine marketing campaigns, critique video concepts, and polish taglines. Keep your responses crisp, conversational, and under 3-4 sentences so dialogue flows naturally.',
      },
      callbacks: {
        onmessage: (message: any) => {
          try {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ agentText: part.text }));
              }
            }
            const outText = message.serverContent?.outputAudioTranscription?.text || message.serverContent?.outputTranscription?.text;
            if (outText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ agentText: outText }));
            }
            const inText = message.serverContent?.inputAudioTranscription?.text || message.serverContent?.inputTranscription?.text;
            if (inText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ userText: inText }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          } catch (e) {
            console.error('[Live API onmessage error]', e);
          }
        },
        onclose: () => {
          console.log('[Live API] Upstream session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ sessionClosed: true }));
          }
        },
        onerror: (err: any) => {
          console.error('[Live API Upstream Error]', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ status: 'connected', model: 'gemini-3.8-live' }));
  } catch (err: any) {
    console.error('[Live API Connection Setup Failed]', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: 'Failed to connect to Live API session: ' + err.message }));
      clientWs.close();
    }
    return;
  }

  clientWs.on('message', async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.audio && session) {
        session.sendRealtimeInput({
          audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      }
      if (msg.text && session) {
        session.sendRealtimeInput({
          text: msg.text,
        });
      }
    } catch (e) {
      console.error('[Live API Message Inbound Error]', e);
    }
  });

  clientWs.on('close', () => {
    console.log('[Live API] Client disconnected');
    if (session && typeof session.close === 'function') {
      try {
        session.close();
      } catch (err) {
        // ignore close errors
      }
    }
  });

  clientWs.on('error', (err) => {
    console.error('[Live API WebSocket Error]', err);
  });
});

// Vite Middleware for Dev / Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Multimodal Content Factory server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
