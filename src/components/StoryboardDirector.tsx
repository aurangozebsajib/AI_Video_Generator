import React from 'react';
import {
  Film,
  Camera,
  Volume2,
  Sparkles,
  Music,
  Clock,
  Play,
  Layers,
  Wand2,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { StoryboardData, StoryboardScene } from '../types';

interface StoryboardDirectorProps {
  storyboard: StoryboardData;
  onGenerateSceneVisual: (sceneIndex: number) => void;
  onGenerateAllVisuals: () => void;
  onGenerateVoiceover: (text: string) => void;
  isGeneratingAllVisuals: boolean;
  onSelectSceneForPreview?: (sceneIndex: number) => void;
}

export const StoryboardDirector: React.FC<StoryboardDirectorProps> = ({
  storyboard,
  onGenerateSceneVisual,
  onGenerateAllVisuals,
  onGenerateVoiceover,
  isGeneratingAllVisuals,
  onSelectSceneForPreview,
}) => {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" /> Storyboard Screenplay
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-medium border border-purple-500/20">
              {storyboard.genre || 'Cinematic Sci-Fi'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">{storyboard.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5 italic">"{storyboard.logline}"</p>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerateAllVisuals}
            disabled={isGeneratingAllVisuals}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-sm shadow-purple-500/20 disabled:opacity-50 transition-all"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingAllVisuals ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAllVisuals ? 'Synthesizing Visuals...' : 'Render All Frames'}</span>
          </button>
        </div>
      </div>

      {/* Color Palette Strip */}
      {storyboard.colorPalette && storyboard.colorPalette.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Color Palette:
          </span>
          <div className="flex items-center gap-1.5">
            {storyboard.colorPalette.map((color, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
              >
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scenes List */}
      <div className="space-y-4">
        {storyboard.scenes.map((scene, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 hover:border-slate-700/80 transition-all flex flex-col md:flex-row gap-4"
          >
            {/* Visual Thumbnail or Placeholder */}
            <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group">
                {scene.imageUrl ? (
                  <img
                    src={scene.imageUrl}
                    alt={`Scene ${scene.sceneNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3">
                    <Layers className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                    <span className="text-[11px] text-slate-500">Visual Frame Needed</span>
                  </div>
                )}

                {/* Overlay generate frame button */}
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onGenerateSceneVisual(idx)}
                    disabled={scene.isGeneratingVisual}
                    className="px-2.5 py-1 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{scene.imageUrl ? 'Re-roll Frame' : 'Generate Frame'}</span>
                  </button>
                </div>

                {scene.isGeneratingVisual && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Scene Metadata pill */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="font-semibold text-slate-300">
                  Scene {scene.sceneNumber}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {scene.durationSec || 4}s
                </span>
              </div>
            </div>

            {/* Scene Content Details */}
            <div className="flex-1 space-y-2.5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium flex items-center gap-1">
                  <Camera className="w-3 h-3" /> {scene.shotType}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                  {scene.cameraMovement}
                </span>
              </div>

              {/* Visual Description */}
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {scene.visualDescription}
              </p>

              {/* Voiceover narration */}
              {scene.voiceover && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Narration Voiceover
                    </span>
                    <p className="text-xs text-slate-300 italic">"{scene.voiceover}"</p>
                  </div>

                  <button
                    onClick={() => onGenerateVoiceover(scene.voiceover)}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                    title="Synthesize Voiceover Audio with Gemini TTS"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              )}

              {/* Sound Design */}
              {scene.soundDesign && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-pink-400" />
                  <span>Audio Design: {scene.soundDesign}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
