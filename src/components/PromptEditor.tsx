import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Layers,
  Wand2,
  Video,
  Image as ImageIcon,
  Film,
  Upload,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { AspectRatio, BengaliVoiceOption, BENGALI_VOICE_CONFIGS, CameraMotion, Resolution, VideoModel, VisualStyle } from '../types';

interface PromptEditorProps {
  prompt: string;
  setPrompt: (val: string) => void;
  negativePrompt: string;
  setNegativePrompt: (val: string) => void;
  style: VisualStyle;
  setStyle: (val: VisualStyle) => void;
  cameraMotion: CameraMotion;
  setCameraMotion: (val: CameraMotion) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (val: AspectRatio) => void;
  resolution: Resolution;
  setResolution: (val: Resolution) => void;
  model: VideoModel;
  setModel: (val: VideoModel) => void;
  mode: 'text-to-video' | 'image-to-video' | 'storyboard';
  setMode: (mode: 'text-to-video' | 'image-to-video' | 'storyboard') => void;
  referenceImage?: string;
  setReferenceImage: (img?: string) => void;
  bengaliVoice: BengaliVoiceOption;
  setBengaliVoice: (voice: BengaliVoiceOption) => void;
  onGenerate: () => void;
  onEnhancePrompt: () => void;
  onGenerateStoryboard: () => void;
  isEnhancing: boolean;
  isGenerating: boolean;
  hasApiKey: boolean;
}

export const STYLES: { id: VisualStyle; label: string; icon: string; desc: string }[] = [
  { id: 'cinematic', label: 'Cinematic Movie', icon: '🎬', desc: 'Anamorphic lens, film grain, dramatic lighting' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', icon: '🌆', desc: 'Volumetric mist, neon reflections, futuristic' },
  { id: 'photorealistic', label: '8K Photoreal', icon: '📸', desc: 'Hyper-detailed textures, realistic physics' },
  { id: 'anime', label: 'Studio Anime', icon: '🎨', desc: 'Ghibli watercolor textures, celestial vibes' },
  { id: '3d-render', label: 'Pixar 3D CGI', icon: '👾', desc: 'Stylized 3D character animation lighting' },
  { id: 'vintage-film', label: '35mm Vintage', icon: '📼', desc: '1970s Kodachrome warm retro color tones' },
  { id: 'dark-fantasy', label: 'Dark Fantasy', icon: '🐉', desc: 'Eldritch lighting, mythical atmosphere' },
  { id: 'documentary', label: 'National Geo', icon: '🌍', desc: 'Nature documentary clarity & wide angle' },
];

export const CAMERA_MOTIONS: { id: CameraMotion; label: string; desc: string }[] = [
  { id: 'dynamic', label: 'Dynamic Flow', desc: 'AI-adapted kinetic motion' },
  { id: 'drone-aerial', label: 'Drone Flyover', desc: 'Sweeping high-altitude aerial perspective' },
  { id: 'pan-left', label: 'Pan Left', desc: 'Smooth horizontal glide to the left' },
  { id: 'pan-right', label: 'Pan Right', desc: 'Smooth horizontal glide to the right' },
  { id: 'zoom-in', label: 'Zoom In', desc: 'Intense cinematic dolly push towards subject' },
  { id: 'zoom-out', label: 'Zoom Out', desc: 'Dramatic pull-back revealing environment' },
  { id: 'orbit-360', label: 'Orbit 360', desc: 'Circular tracking shot around center point' },
  { id: 'tilt-up', label: 'Tilt Up', desc: 'Low-to-high vertical reveal tilt' },
  { id: 'steadycam', label: 'Steadycam', desc: 'Smooth floating handheld camera feel' },
];

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  setPrompt,
  negativePrompt,
  setNegativePrompt,
  style,
  setStyle,
  cameraMotion,
  setCameraMotion,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  model,
  setModel,
  mode,
  setMode,
  referenceImage,
  setReferenceImage,
  bengaliVoice,
  setBengaliVoice,
  onGenerate,
  onEnhancePrompt,
  onGenerateStoryboard,
  isEnhancing,
  isGenerating,
  hasApiKey,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setReferenceImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col gap-6">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="inline-flex p-1 bg-slate-950/70 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('text-to-video')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'text-to-video'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Text to Video</span>
          </button>

          <button
            onClick={() => setMode('image-to-video')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'image-to-video'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image to Video</span>
          </button>

          <button
            onClick={() => setMode('storyboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'storyboard'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Multi-Scene Director</span>
          </button>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-xs hidden sm:inline">Engine:</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as VideoModel)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="veo-3.1-lite-generate-preview">Veo 3.1 Lite (Fast)</option>
            <option value="veo-3.1-generate-preview">Veo 3.1 Pro (Cinematic)</option>
          </select>
        </div>
      </div>

      {/* Image Reference Section if mode is Image-to-Video */}
      {mode === 'image-to-video' && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Starting Reference Frame
            </span>
            {referenceImage && (
              <button
                onClick={() => setReferenceImage(undefined)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          {referenceImage ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-56 flex items-center justify-center bg-black/40">
              <img
                src={referenceImage}
                alt="Starting reference"
                className="w-full h-48 object-contain"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg shadow-md"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-900/30 hover:bg-slate-900/60"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-200">
                Click to upload a reference image to animate
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Main Prompt Input Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {mode === 'storyboard' ? 'Story Concept & Scenario' : 'Scene Description / Motion Prompt'}
          </label>

          <button
            type="button"
            onClick={onEnhancePrompt}
            disabled={isEnhancing || !prompt.trim()}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none transition-colors font-medium px-2 py-0.5 rounded-md hover:bg-indigo-500/10"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
            <span>{isEnhancing ? 'Directing with Gemini...' : 'Magic Prompt Enhance'}</span>
          </button>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={mode === 'storyboard' ? 3 : 4}
            placeholder={
              mode === 'storyboard'
                ? 'E.g., An astronaut discovering a hidden ancient alien library inside an asteroid crater on Mars...'
                : 'Describe your video scene: subject, action, lighting, environment, and motion dynamics...'
            }
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none shadow-inner"
          />
          <div className="absolute right-3 bottom-3 text-[11px] text-slate-500 font-mono">
            {prompt.length} chars
          </div>
        </div>
      </div>

      {/* Visual Style Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-400" /> Aesthetic Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStyle(st.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                style === st.id
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <span>{st.icon}</span>
                <span className="truncate">{st.label}</span>
              </div>
              <span className="text-[10px] text-slate-500 line-clamp-1">{st.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Motion & Aspect Ratio Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Camera Movement */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-pink-400" /> Camera Motion
          </label>
          <select
            value={cameraMotion}
            onChange={(e) => setCameraMotion(e.target.value as CameraMotion)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            {CAMERA_MOTIONS.map((cm) => (
              <option key={cm.id} value={cm.id}>
                {cm.label} — {cm.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio & Resolution */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Aspect Ratio & Quality
          </label>
          <div className="flex items-center gap-2">
            {/* Aspect Ratio buttons */}
            <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`py-1 text-center rounded-lg text-xs font-mono font-medium transition-all ${
                    aspectRatio === ar
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>

            {/* Resolution dropdown */}
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p FHD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bengali Voiceover Artist Selection */}
      <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Bengali Voiceover Tone
          </label>
          <span className="text-[11px] text-amber-400/90 font-medium">
            {BENGALI_VOICE_CONFIGS.find((v) => v.id === bengaliVoice)?.speaker}
          </span>
        </div>
        <div className="relative">
          <select
            value={bengaliVoice}
            onChange={(e) => setBengaliVoice(e.target.value as BengaliVoiceOption)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer pr-10"
          >
            {BENGALI_VOICE_CONFIGS.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.tone} ({voice.speaker}) — {voice.description}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>* Voice Profile: {BENGALI_VOICE_CONFIGS.find((v) => v.id === bengaliVoice)?.description}</span>
          <span className="font-mono text-[10px] text-slate-600 hidden sm:inline">
            {BENGALI_VOICE_CONFIGS.find((v) => v.id === bengaliVoice)?.edgeVoice}
          </span>
        </div>
      </div>

      {/* Advanced Drawer Toggle */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-300"
        >
          <span className="font-medium">Advanced Film Directing Parameters</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Negative Prompt (Elements to avoid):
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, distorted hands, flickering, jittery motion, watermark, bad anatomy"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              * Note: High quality models like Veo 3.1 dynamically account for motion physics, camera inertia, and lens flare.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        {mode === 'storyboard' ? (
          <button
            type="button"
            onClick={onGenerateStoryboard}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
          >
            <Film className={`w-4 h-4 ${isGenerating ? 'animate-bounce' : ''}`} />
            <span>{isGenerating ? 'Directing Storyboard...' : 'Generate Multi-Scene Storyboard'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || (!prompt.trim() && !referenceImage)}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing Video...' : 'Generate Video with Veo 3.1'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
