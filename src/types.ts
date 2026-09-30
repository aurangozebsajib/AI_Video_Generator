export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';
export type VideoModel = 'veo-3.1-lite-generate-preview' | 'veo-3.1-generate-preview';

export type CameraMotion = 
  | 'dynamic'
  | 'pan-left'
  | 'pan-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'drone-aerial'
  | 'orbit-360'
  | 'tilt-up'
  | 'steadycam';

export type VisualStyle = 
  | 'cinematic'
  | 'cyberpunk'
  | 'photorealistic'
  | 'anime'
  | '3d-render'
  | 'vintage-film'
  | 'dark-fantasy'
  | 'documentary';

export interface StoryboardScene {
  sceneNumber: number;
  durationSec: number;
  shotType: string;
  cameraMovement: string;
  visualDescription: string;
  voiceover: string;
  soundDesign: string;
  imageUrl?: string;
  audioUrl?: string;
  isGeneratingVisual?: boolean;
  isGeneratingAudio?: boolean;
}

export interface StoryboardData {
  title: string;
  logline: string;
  genre: string;
  colorPalette: string[];
  scenes: StoryboardScene[];
}

export interface VideoProject {
  id: string;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  style: VisualStyle;
  cameraMotion: CameraMotion;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  model: VideoModel;
  mode: 'text-to-video' | 'image-to-video' | 'storyboard';
  createdAt: number;
  // Veo status
  operationName?: string;
  videoUrl?: string;
  videoBlobUrl?: string;
  status: 'idle' | 'generating' | 'polling' | 'rendering' | 'completed' | 'failed';
  error?: string;
  progressMessage?: string;
  // Reference Image
  referenceImage?: string; // base64 data url
  // Multi-scene Storyboard
  storyboard?: StoryboardData;
  // Voiceover audio
  voiceoverAudio?: string; // base64 wav
  voiceoverVoice?: string;
}

export interface PresetConcept {
  id: string;
  title: string;
  category: string;
  prompt: string;
  style: VisualStyle;
  cameraMotion: CameraMotion;
  aspectRatio: AspectRatio;
  previewThumbnail: string;
  description: string;
}
