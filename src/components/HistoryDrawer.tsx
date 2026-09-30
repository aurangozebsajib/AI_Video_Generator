import React from 'react';
import { X, Trash2, Film, Download, Clock, Play } from 'lucide-react';
import { VideoProject } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: VideoProject[];
  onSelectProject: (proj: VideoProject) => void;
  onDeleteProject: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onDeleteProject,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-100">Project History & Library</h3>
            <span className="text-xs text-slate-500 font-mono">({projects.length})</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No saved video productions yet.</p>
              <p className="mt-1 text-slate-600">Generated projects will appear here.</p>
            </div>
          ) : (
            projects.map((proj) => {
              const thumbnail =
                proj.storyboard?.scenes?.[0]?.imageUrl ||
                proj.referenceImage ||
                'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80';

              return (
                <div
                  key={proj.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-all flex items-center gap-3 group"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => {
                      onSelectProject(proj);
                      onClose();
                    }}
                    className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 cursor-pointer"
                  >
                    <img
                      src={thumbnail}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div
                    onClick={() => {
                      onSelectProject(proj);
                      onClose();
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h4 className="font-semibold text-xs text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                      {proj.title || 'Untitled Video'}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {proj.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>{proj.aspectRatio}</span>
                      <span>•</span>
                      <span className="capitalize">{proj.style}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(proj.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
