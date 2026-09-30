import { ApiHealthStatus, StoryboardData } from '../types';

export interface EnhancePromptResponse {
  enhancedPrompt: string;
  negativePrompt: string;
  suggestedCameraMotion: string;
  lightingMood: string;
  soundCue: string;
}

export async function checkApiStatus(): Promise<{ status: string; hasApiKey: boolean }> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch (err: any) {
    return { status: 'error', hasApiKey: false };
  }
}

export async function checkApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      status: 'error',
      gemini: {
        name: 'Gemini 2.5 Flash',
        configured: false,
        accessible: false,
        details: 'Connection Error',
        error: err.message || 'Failed to ping backend',
      },
      telegram: {
        name: 'Telegram Bot Dispatch',
        configured: false,
        accessible: false,
        details: 'Connection Error',
        error: err.message || 'Failed to ping backend',
      },
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function enhancePrompt(
  prompt: string,
  style: string,
  cameraMotion: string
): Promise<EnhancePromptResponse> {
  const res = await fetch('/api/ai/enhance-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style, cameraMotion }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to enhance prompt');
  }

  return await res.json();
}

export async function generateStoryboard(
  prompt: string,
  title?: string,
  sceneCount = 3,
  targetDuration = 15,
  style = 'cinematic'
): Promise<StoryboardData> {
  const res = await fetch('/api/ai/storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, title, sceneCount, targetDuration, style }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate storyboard');
  }

  return await res.json();
}

export async function generateSceneVisual(
  prompt: string,
  aspectRatio: string = '16:9'
): Promise<string> {
  const res = await fetch('/api/ai/generate-scene-visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate scene visual');
  }

  const data = await res.json();
  return data.imageUrl;
}

export async function generateVoiceover(
  text: string,
  voiceName: string = 'standard',
  style?: string
): Promise<string> {
  const res = await fetch('/api/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName, style }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate voiceover');
  }

  const data = await res.json();
  return `data:${data.mimeType || 'audio/wav'};base64,${data.audio}`;
}

export async function startVeoGeneration(params: {
  prompt?: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  imageBase64?: string;
}): Promise<{ operationName: string }> {
  const res = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to start video generation');
  }

  return await res.json();
}

export async function pollVeoStatus(
  operationName: string
): Promise<{ done: boolean; error: any; hasVideo: boolean }> {
  const res = await fetch('/api/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to poll video status');
  }

  return await res.json();
}

export async function downloadVeoVideo(operationName: string): Promise<Blob> {
  const res = await fetch('/api/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to download video');
  }

  return await res.blob();
}

export async function fetchPersonas(): Promise<any[]> {
  const res = await fetch('/api/pipeline/personas');
  if (!res.ok) throw new Error('Failed to fetch agent personas');
  const data = await res.json();
  return data.personas || [];
}

export async function updatePersona(personaId: string, content: string): Promise<void> {
  const res = await fetch('/api/pipeline/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId, content }),
  });
  if (!res.ok) throw new Error('Failed to save persona');
}

export async function parseGoogleDocScript(rawContent: string): Promise<{
  videoHeader: string;
  dialect: string;
  scriptText: string;
}> {
  const res = await fetch('/api/pipeline/parse-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawContent }),
  });
  if (!res.ok) throw new Error('Failed to parse script');
  return await res.json();
}

export async function runPipelineSimulation(fullVideo = true, docId?: string): Promise<{
  success: boolean;
  exitCode: number;
  log: string;
}> {
  const res = await fetch('/api/pipeline/run-dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullVideo, docId }),
  });
  if (!res.ok) throw new Error('Failed to run pipeline simulation');
  return await res.json();
}

