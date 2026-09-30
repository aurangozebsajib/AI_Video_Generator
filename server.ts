import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateVideosOperation, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health and Status API
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Deep Preemptive Health Check for Gemini & Telegram APIs
app.get('/api/health', async (req: Request, res: Response) => {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '').trim();
  const telegramToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'error',
    gemini: {
      name: 'Gemini 2.5 Flash',
      configured: Boolean(geminiKey),
      accessible: false,
      latencyMs: 0,
      details: 'Unchecked',
      error: undefined as string | undefined,
    },
    telegram: {
      name: 'Telegram Bot Dispatch',
      configured: Boolean(telegramToken),
      accessible: false,
      latencyMs: 0,
      details: 'Unchecked',
      error: undefined as string | undefined,
    },
    checkedAt: new Date().toISOString(),
  };

  // 1. Lightweight non-blocking ping to Gemini API (timeout: 4s)
  const pingGemini = async () => {
    if (!geminiKey) {
      health.gemini.details = 'Unconfigured';
      health.gemini.error = 'GEMINI_API_KEY is not configured in environment';
      return;
    }
    const start = performance.now();
    try {
      // Lightweight models query to check auth & connectivity
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${geminiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        }
      );
      health.gemini.latencyMs = Math.round(performance.now() - start);

      if (response.ok) {
        health.gemini.accessible = true;
        health.gemini.details = `Operational (${health.gemini.latencyMs}ms)`;
      } else if (response.status === 400 || response.status === 403) {
        health.gemini.error = 'Invalid API key or permission denied';
        health.gemini.details = 'Authentication Failed';
      } else {
        health.gemini.error = `HTTP ${response.status} ${response.statusText}`;
        health.gemini.details = `Status ${response.status}`;
      }
    } catch (err: any) {
      health.gemini.latencyMs = Math.round(performance.now() - start);
      if (err.name === 'TimeoutError') {
        health.gemini.error = 'Connection timed out (>4000ms)';
        health.gemini.details = 'Ping Timeout';
      } else {
        health.gemini.error = err.message || 'Unreachable';
        health.gemini.details = 'Unreachable';
      }
    }
  };

  // 2. Lightweight non-blocking ping to Telegram Bot API (timeout: 4s)
  const pingTelegram = async () => {
    if (!telegramToken) {
      health.telegram.details = 'Unconfigured';
      health.telegram.error = 'TELEGRAM_BOT_TOKEN is not configured in environment';
      return;
    }
    const start = performance.now();
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${telegramToken}/getMe`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        }
      );
      health.telegram.latencyMs = Math.round(performance.now() - start);

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result) {
          health.telegram.accessible = true;
          health.telegram.details = `@${data.result.username || 'bot'} (${health.telegram.latencyMs}ms)`;
        } else {
          health.telegram.error = data.description || 'Invalid Telegram Bot Token';
          health.telegram.details = 'Invalid Token';
        }
      } else if (response.status === 401 || response.status === 404) {
        health.telegram.error = 'Unauthorized: Invalid Telegram bot token';
        health.telegram.details = 'Invalid Token';
      } else {
        health.telegram.error = `HTTP ${response.status}`;
        health.telegram.details = `Status ${response.status}`;
      }
    } catch (err: any) {
      health.telegram.latencyMs = Math.round(performance.now() - start);
      if (err.name === 'TimeoutError') {
        health.telegram.error = 'Connection timed out (>4000ms)';
        health.telegram.details = 'Ping Timeout';
      } else {
        health.telegram.error = err.message || 'Unreachable';
        health.telegram.details = 'Unreachable';
      }
    }
  };

  // Execute both pings in parallel without blocking the server
  await Promise.allSettled([pingGemini(), pingTelegram()]);

  // Overall status classification
  if (health.gemini.accessible && (health.telegram.accessible || !health.telegram.configured)) {
    health.status = 'healthy';
  } else if (health.gemini.accessible || health.telegram.accessible) {
    health.status = 'degraded';
  } else {
    health.status = 'error';
  }

  res.json(health);
});

// Prompt Enhancer API
app.post('/api/ai/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'cinematic', cameraMotion = 'dynamic' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAIClient();
    const systemInstruction = `You are a Hollywood director and visual effects supervisor specializing in AI video prompts (Veo, Sora, Runway Gen-3).
Your job is to expand short prompts into high-production-value video prompts with precise visual lighting, lens choices (e.g. 35mm anamorphic, f/1.8), camera motions, color grading, and dynamic physical interactions.
Output ONLY a JSON object with:
- enhancedPrompt: detailed 2-3 sentence visual description optimized for video generation models
- negativePrompt: elements to avoid (e.g. low resolution, flickering, distorted anatomy, jitter)
- suggestedCameraMotion: specific camera movement (e.g. slow cinematic dolly push-in, low-angle tracking shot, sweeping drone flyover)
- lightingMood: lighting setup (e.g. golden hour rim light, volumetric cyberpunk neon, soft diffused studio light)
- soundCue: suggested ambient sound and audio fx (e.g. gentle ocean breeze with distant acoustic guitar)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Transform this video idea into a cinematic video prompt:
Original Idea: "${prompt}"
Desired Style: ${style}
Camera Movement: ${cameraMotion}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            negativePrompt: { type: Type.STRING },
            suggestedCameraMotion: { type: Type.STRING },
            lightingMood: { type: Type.STRING },
            soundCue: { type: Type.STRING },
          },
          required: ['enhancedPrompt', 'negativePrompt', 'suggestedCameraMotion', 'lightingMood', 'soundCue'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({ error: error?.message || 'Failed to enhance prompt' });
  }
});

// Storyboard Generator API
app.post('/api/ai/storyboard', async (req: Request, res: Response) => {
  try {
    const { title, prompt, sceneCount = 3, targetDuration = 15, style = 'cinematic' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a structured video storyboard for an AI video project.
Project Title/Theme: "${title || prompt}"
Core Story Concept: "${prompt}"
Number of Scenes: ${sceneCount}
Target Duration: ${targetDuration} seconds
Visual Aesthetic: ${style}`,
      config: {
        systemInstruction: `You are an expert film director and storyboard artist. Create a cohesive, visually breathtaking multi-scene storyboard sequence. Every scene should seamlessly transition to the next. Include camera movement, visual composition, voiceover narration, and mood.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            logline: { type: Type.STRING },
            genre: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  durationSec: { type: Type.NUMBER },
                  shotType: { type: Type.STRING, description: 'Wide shot, Extreme close up, Drone aerial, Medium tracking' },
                  cameraMovement: { type: Type.STRING, description: 'Pan left, Slow zoom in, Orbit 360, Tilt up, Static' },
                  visualDescription: { type: Type.STRING, description: 'Vivid visual details of what is happening' },
                  voiceover: { type: Type.STRING, description: 'Narration spoken during this scene' },
                  soundDesign: { type: Type.STRING, description: 'Ambient music or SFX details' },
                },
                required: ['sceneNumber', 'durationSec', 'shotType', 'cameraMovement', 'visualDescription', 'voiceover', 'soundDesign'],
              },
            },
          },
          required: ['title', 'logline', 'genre', 'colorPalette', 'scenes'],
        },
      },
    });

    const storyboard = JSON.parse(response.text || '{}');
    res.json(storyboard);
  } catch (error: any) {
    console.error('Storyboard generation error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate storyboard' });
  }
});

// Scene Visual Concept Generator API (using gemini-3.1-flash-lite-image)
app.post('/api/ai/generate-scene-visual', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAIClient();
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `Cinematic movie film still, high production value, 8k resolution, photorealistic, professional color grading: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: selectedRatio,
        },
      },
    });

    let imageUrl: string | null = null;
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image data returned from model' });
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Scene visual generation error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate scene visual' });
  }
});

// Text-to-Speech Voiceover API (using gemini-3.8-flash-lite-tts with Bengali voice styling)
app.post('/api/ai/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'standard', style } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ai = getGenAIClient();

    // Map 4 Bengali voices: standard, deep, energetic, soft (with prebuilt voice and speech metadata)
    const voiceProfiles: Record<string, { geminiVoice: string; defaultStyle: string }> = {
      standard: {
        geminiVoice: 'Kore',
        defaultStyle: 'Clear, natural, articulate Bengali narration with standard native inflection and balanced storytelling cadence.',
      },
      deep: {
        geminiVoice: 'Charon',
        defaultStyle: 'Deep, resonant, baritone, authoritative, and cinematic dramatic Bengali narration.',
      },
      energetic: {
        geminiVoice: 'Puck',
        defaultStyle: 'Energetic, upbeat, dynamic, lively, bright, and emotionally expressive Bengali storytelling.',
      },
      soft: {
        geminiVoice: 'Zephyr',
        defaultStyle: 'Soft, gentle, calm, soothing, melodious, warm, and heartfelt Bengali reading.',
      },
    };

    const profile = voiceProfiles[voiceName.toLowerCase()] || {
      geminiVoice: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName) ? voiceName : 'Kore',
      defaultStyle: style || 'Cinematic narrator with clear emotional pacing in Bengali',
    };

    const chosenVoice = profile.geminiVoice;
    const chosenStyle = style || profile.defaultStyle;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 800),
              speechMetadata: {
                style: chosenStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from TTS model' });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
      voice: voiceName,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate voiceover audio' });
  }
});

// Veo Video Generation - Step 1: Start Generation
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      model = 'veo-3.1-lite-generate-preview',
      resolution = '720p',
      aspectRatio = '16:9',
      imageBase64,
      imageMimeType = 'image/png',
    } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Either prompt or image is required' });
    }

    const ai = getGenAIClient();
    const validAspectRatios = ['16:9', '9:16'];
    const selectedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';
    const validResolutions = ['720p', '1080p'];
    const selectedResolution = validResolutions.includes(resolution) ? resolution : '720p';

    const config: any = {
      numberOfVideos: 1,
      resolution: selectedResolution,
      aspectRatio: selectedRatio,
    };

    let payload: any = {
      model: model === 'veo-3.1-generate-preview' ? 'veo-3.1-generate-preview' : 'veo-3.1-lite-generate-preview',
      config,
    };

    if (prompt) {
      payload.prompt = prompt;
    }

    if (imageBase64) {
      const cleanBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
      payload.image = {
        imageBytes: cleanBase64,
        mimeType: imageMimeType,
      };
    }

    const operation = await ai.models.generateVideos(payload);

    if (!operation || !operation.name) {
      return res.status(500).json({ error: 'Failed to initiate video generation operation' });
    }

    res.json({
      operationName: operation.name,
      status: 'pending',
      model: payload.model,
      aspectRatio: selectedRatio,
      resolution: selectedResolution,
    });
  } catch (error: any) {
    console.error('Video generation start error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to start video generation',
      status: error?.status,
    });
  }
});

// Veo Video Generation - Step 2: Poll Status
app.post('/api/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGenAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({
      done: Boolean(updated.done),
      error: updated.error || null,
      hasVideo: Boolean(updated.response?.generatedVideos?.[0]?.video?.uri),
    });
  } catch (error: any) {
    console.error('Video status poll error:', error);
    res.status(500).json({ error: error?.message || 'Failed to check video status' });
  }
});

// Veo Video Generation - Step 3: Download Video Stream
app.post('/api/video-download', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const ai = getGenAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Video URI not found in operation response' });
    }

    const videoRes = await fetch(uri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: `Failed to download video from storage: ${videoRes.statusText}` });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="generated-video.mp4"');

    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      const streamToClient = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(Buffer.from(value));
        }
      };
      await streamToClient();
    } else {
      const buffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error('Video download error:', error);
    res.status(500).json({ error: error?.message || 'Failed to download video' });
  }
});

// Live System Prompt Execution
app.post('/api/ai/test-system-prompt', async (req: Request, res: Response) => {
  try {
    const { systemInstruction = '', userInput = '', temperature = 0.2 } = req.body;
    if (!userInput.trim()) {
      return res.status(400).json({ error: 'userInput is required' });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: Number(temperature),
      },
    });

    res.json({ output: response.text || '' });
  } catch (error: any) {
    console.error('System prompt test error:', error);
    res.status(500).json({ error: error?.message || 'Failed to execute system prompt' });
  }
});

// Pipeline & Multi-Agent Personas API
app.get('/api/pipeline/personas', async (_req: Request, res: Response) => {
  try {
    const fs = await import('fs/promises');
    const personasDir = path.resolve(__dirname, 'brain/personas');
    
    const personasList = [
      {
        id: 'director',
        name: 'The Director (Grok / Master Coordinator)',
        filename: 'director.txt',
        role: 'Controls overall story arc, shot cuts, scene breakdown, and timing.',
      },
      {
        id: 'writer',
        name: 'The Narration Writer (Gemini Specialist)',
        filename: 'writer.txt',
        role: 'Polishes spoken Bengali dialogues and preserves regional dialects.',
      },
      {
        id: 'character_designer',
        name: 'The Character Designer (OpenRouter Specialist)',
        filename: 'character_designer.txt',
        role: 'Ensures visual character consistency across multi-scene generations.',
      },
      {
        id: 'style_director',
        name: 'The Art & Style Director (Cloudflare AI Specialist)',
        filename: 'style_director.txt',
        role: 'Defines art style, color grading, lighting moods, and camera motion.',
      },
    ];

    const result = await Promise.all(
      personasList.map(async (p) => {
        let content = '';
        try {
          content = await fs.readFile(path.join(personasDir, p.filename), 'utf-8');
        } catch {
          content = `# ${p.name}\n${p.role}`;
        }
        return { ...p, content };
      })
    );

    res.json({ personas: result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch personas' });
  }
});

app.post('/api/pipeline/personas', async (req: Request, res: Response) => {
  try {
    const fs = await import('fs/promises');
    const { personaId, content } = req.body;
    if (!personaId || typeof content !== 'string') {
      return res.status(400).json({ error: 'personaId and content are required' });
    }

    const safeId = path.basename(personaId).replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetFile = path.resolve(__dirname, 'brain/personas', `${safeId}.txt`);
    await fs.writeFile(targetFile, content, 'utf-8');

    res.json({ success: true, message: `Updated persona ${safeId}` });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save persona' });
  }
});

// Parse Script helper for Google Doc format
app.post('/api/pipeline/parse-script', (req: Request, res: Response) => {
  const { rawContent = '' } = req.body;
  const lines = rawContent.split('\n').map((l: string) => l.trim()).filter(Boolean);

  let videoHeader = 'Video 1 | Production';
  let dialect = 'none';
  const scriptLines: string[] = [];

  for (const line of lines) {
    if (/^Video\s+\d+\s*\|/i.test(line)) {
      videoHeader = line;
      continue;
    }
    const dialectMatch = line.match(/^Dialect\s*:\s*([a-zA-Z0-9_\-]+)/i);
    if (dialectMatch) {
      dialect = dialectMatch[1].toLowerCase().trim();
      continue;
    }
    scriptLines.push(line);
  }

  const scriptText = scriptLines.join('\n') || rawContent;
  res.json({ videoHeader, dialect, scriptText });
});

// Run Pipeline in Dry-Run mode and return log output
app.post('/api/pipeline/run-dry-run', async (req: Request, res: Response) => {
  try {
    const { execFile } = await import('child_process');
    const { fullVideo = true, docId } = req.body;

    const args = ['main.py', '--dry-run'];
    if (fullVideo) args.push('--full-video');
    if (docId) args.push('--doc-id', docId);

    execFile('python3', args, { cwd: __dirname, timeout: 60000 }, (error, stdout, stderr) => {
      const outputLog = (stdout || '') + (stderr ? `\n[STDERR]:\n${stderr}` : '');
      res.json({
        success: !error,
        exitCode: error ? error.code : 0,
        log: outputLog || 'Executed successfully with no output.',
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to execute pipeline process' });
  }
});

// Direct Multi-Agent Brain Orchestration API
app.post('/api/pipeline/run-multi-agent-brain', async (req: Request, res: Response) => {
  try {
    const { execFile } = await import('child_process');
    const { scriptText = '', dialect = 'none' } = req.body;
    const cleanDialect = dialect.replace(/[^a-zA-Z0-9_\-]/g, '') || 'none';

    const pythonCode = `
import json, sys
from brain.multi_agent import orchestrate_multi_agent_brain

script = sys.stdin.read()
manifest = orchestrate_multi_agent_brain(script, dialect="${cleanDialect}", dry_run=True)
print("__JSON_START__" + json.dumps(manifest) + "__JSON_END__")
`;

    const child = execFile('python3', ['-c', pythonCode], { cwd: __dirname, timeout: 30000 }, (error, stdout, stderr) => {
      if (stdout.includes('__JSON_START__') && stdout.includes('__JSON_END__')) {
        const rawJson = stdout.split('__JSON_START__')[1].split('__JSON_END__')[0];
        try {
          const parsed = JSON.parse(rawJson);
          return res.json({ success: true, manifest: parsed });
        } catch {}
      }
      res.json({
        success: !error,
        manifest: null,
        log: stdout + (stderr ? `\n${stderr}` : ''),
      });
    });

    child.stdin?.write(scriptText || 'আসসালামু আলাইকুম! প্রযুক্তির উৎকর্ষে আমাদের নতুন এআই ভিডিও পাইপলাইনে স্বাগতম।');
    child.stdin?.end();
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to execute multi-agent brain' });
  }
});

// Client & Static Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AI Video Generator] Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
