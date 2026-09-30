import React from 'react';
import { Film, Sparkles, History, Compass, Plus, Cpu, Info } from 'lucide-react';
import { ApiHealthIndicator } from './ApiHealthIndicator';
import { ApiHealthStatus } from '../types';

interface HeaderProps {
  hasApiKey: boolean;
  health: ApiHealthStatus;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
  onOpenPresets: () => void;
  onOpenHistory: () => void;
  onOpenSystemPrompts?: () => void;
  onNewProject: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  health,
  isCheckingHealth,
  onRefreshHealth,
  onOpenPresets,
  onOpenHistory,
  onOpenSystemPrompts,
  onNewProject,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                VeoGen Studio
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Video
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Generative Cinema Engine with Gemini & Veo 3.1
            </p>
          </div>
        </div>

        {/* Engine status, Health Monitor & action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Preemptive API Health Monitor */}
          <ApiHealthIndicator
            health={health}
            isChecking={isCheckingHealth}
            onRefreshHealth={onRefreshHealth}
          />

          {/* Presets Button */}
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
            title="Explore Video Presets"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Inspiration Presets</span>
          </button>

          {/* System Prompts Modal Button */}
          {onOpenSystemPrompts && (
            <button
              onClick={onOpenSystemPrompts}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
              title="System Instructions & Prompt Templates"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">System Prompts</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
            title="Saved Projects & History"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Library</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* New Project */}
          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Video</span>
          </button>
        </div>
      </div>
    </header>
  );
};
