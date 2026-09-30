import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { ApiHealthStatus } from '../types';

interface ApiHealthIndicatorProps {
  health: ApiHealthStatus;
  isChecking: boolean;
  onRefreshHealth: () => void;
}

export const ApiHealthIndicator: React.FC<ApiHealthIndicatorProps> = ({
  health,
  isChecking,
  onRefreshHealth,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Status mapping
  const isHealthy = health.status === 'healthy';
  const isDegraded = health.status === 'degraded';
  const isError = health.status === 'error';

  const statusLabel = isChecking
    ? 'Checking APIs...'
    : isHealthy
    ? 'APIs Operational'
    : isDegraded
    ? 'API Degraded'
    : 'Connection Issue';

  const dotColorClass = isChecking
    ? 'bg-indigo-400 animate-pulse'
    : isHealthy
    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
    : isDegraded
    ? 'bg-amber-400 shadow-sm shadow-amber-400/80'
    : 'bg-rose-500 shadow-sm shadow-rose-500/80';

  const badgeBgClass = isChecking
    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
    : isHealthy
    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:border-emerald-500/40'
    : isDegraded
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:border-amber-500/40'
    : 'bg-rose-500/10 border-rose-500/20 text-rose-300 hover:border-rose-500/40';

  return (
    <div className="relative">
      {/* Indicator Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${badgeBgClass}`}
        title="Preemptive API Health & Connection Monitor"
      >
        <div className="relative flex items-center justify-center">
          <span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
          {isHealthy && !isChecking && (
            <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping" />
          )}
        </div>

        <span className="hidden sm:inline font-mono">{statusLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Flyout Health Details Card */}
      {isOpen && (
        <>
          {/* Backdrop close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-slate-900/95 border border-slate-800 p-4 shadow-2xl backdrop-blur-xl z-50 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  API Health Monitor
                </h4>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshHealth();
                }}
                disabled={isChecking}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
                title="Ping APIs to detect latency & timeouts"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isChecking ? 'Pinging...' : 'Re-check'}</span>
              </button>
            </div>

            {/* Service 1: Gemini AI API */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Google Gemini API
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {health.gemini.accessible ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {health.gemini.latencyMs ? `${health.gemini.latencyMs}ms` : 'Online'}
                    </span>
                  ) : health.gemini.configured ? (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      Timeout / Error
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Unconfigured
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Model: Gemini 2.5 Flash</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {health.gemini.details || 'Lightweight Ping'}
                </span>
              </div>

              {health.gemini.error && (
                <p className="text-[10px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-900/50 break-words">
                  ⚠️ {health.gemini.error}
                </p>
              )}
            </div>

            {/* Service 2: Telegram Bot API */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Telegram Pipeline Bot
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {health.telegram.accessible ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {health.telegram.latencyMs ? `${health.telegram.latencyMs}ms` : 'Ready'}
                    </span>
                  ) : health.telegram.configured ? (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      Token Invalid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                      Optional
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Dispatch: getMe test</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {health.telegram.details || 'Non-blocking'}
                </span>
              </div>

              {health.telegram.error && (
                <p className="text-[10px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-900/50 break-words">
                  ⚠️ {health.telegram.error}
                </p>
              )}
            </div>

            {/* Preemptive Safeguard notice */}
            <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-tight">
                Non-blocking 4s ping protection active to preemptively prevent socket timeouts and sudden task cancellations.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
