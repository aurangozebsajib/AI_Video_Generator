import React from 'react';
import { X, Sparkles, Compass, Play, ArrowRight } from 'lucide-react';
import { PRESET_CONCEPTS } from '../data/presets';
import { PresetConcept } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetConcept) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Cinematic Inspiration Library
              </h3>
              <p className="text-xs text-slate-400">
                Pick a master prompt preset curated for cutting-edge AI video generation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Presets Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_CONCEPTS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex flex-col"
            >
              {/* Thumbnail image */}
              <div className="relative h-40 overflow-hidden bg-slate-900">
                <img
                  src={preset.previewThumbnail}
                  alt={preset.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-medium text-slate-300 border border-white/10">
                  {preset.category}
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {preset.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                    {preset.aspectRatio}
                  </span>
                </div>
              </div>

              {/* Prompt snippet & action */}
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.prompt}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <span className="capitalize">{preset.style}</span>
                    <span>•</span>
                    <span className="capitalize">{preset.cameraMotion}</span>
                  </div>

                  <span className="text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 font-medium text-xs">
                    Load Preset <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
