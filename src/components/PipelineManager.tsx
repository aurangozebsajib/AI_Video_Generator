import React, { useState, useEffect } from 'react';
import {
  Cpu,
  FileText,
  Play,
  Terminal,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Volume2,
  Users,
  Video,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AgentPersona, BENGALI_VOICE_CONFIGS } from '../types';
import {
  fetchPersonas,
  updatePersona,
  parseGoogleDocScript,
  runPipelineSimulation,
} from '../services/api';

interface PipelineManagerProps {
  onLoadScriptToEditor: (script: string, header: string, dialect: string) => void;
  onPlayVoiceoverSample?: (voiceId: string) => void;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  onLoadScriptToEditor,
}) => {
  // Script parsing state
  const [docScriptInput, setDocScriptInput] = useState<string>(
    `Video 1 | 2026-09-30\nDialect: old-dhaka\nআসসালামু আলাইকুম! প্রযুক্তির উৎকর্ষে আমাদের নতুন এআই ভিডিও এবং অডিও প্রোডাকশন পাইপলাইনে আপনাকে স্বাগতম। আজকের এই বিশেষ পর্বে আমরা কৃত্রিম বুদ্ধিমত্তা চালিত আধুনিক মাল্টি-ভয়েস ন্যারেশন এবং সিনেমাটিক ভিজ্যুয়াল সংশ্লেষণ সরাসরি উপভোগ করব।`
  );
  const [parsedData, setParsedData] = useState<{
    videoHeader: string;
    dialect: string;
    scriptText: string;
  } | null>(null);

  // Personas state
  const [personas, setPersonas] = useState<AgentPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('director');
  const [personaContent, setPersonaContent] = useState<string>('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [personaFeedback, setPersonaFeedback] = useState<string | null>(null);

  // Pipeline simulation state
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineLog, setPipelineLog] = useState<string | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

  // Load personas on mount
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const data = await fetchPersonas();
      setPersonas(data);
      if (data.length > 0) {
        const current = data.find((p) => p.id === selectedPersonaId) || data[0];
        setSelectedPersonaId(current.id);
        setPersonaContent(current.content);
      }
    } catch (err) {
      console.error('Failed to load personas:', err);
    }
  };

  const handleSelectPersona = (id: string) => {
    setSelectedPersonaId(id);
    const found = personas.find((p) => p.id === id);
    if (found) {
      setPersonaContent(found.content);
    }
  };

  const handleSavePersona = async () => {
    try {
      setIsSavingPersona(true);
      await updatePersona(selectedPersonaId, personaContent);
      setPersonaFeedback('Persona updated successfully!');
      setTimeout(() => setPersonaFeedback(null), 3000);
      await loadPersonas();
    } catch (err: any) {
      setPersonaFeedback(`Error: ${err.message}`);
    } finally {
      setIsSavingPersona(false);
    }
  };

  const handleParseScript = async () => {
    try {
      const parsed = await parseGoogleDocScript(docScriptInput);
      setParsedData(parsed);
    } catch (err) {
      console.error('Failed to parse script:', err);
    }
  };

  const handleLoadIntoStudio = () => {
    if (!parsedData) return;
    onLoadScriptToEditor(parsedData.scriptText, parsedData.videoHeader, parsedData.dialect);
  };

  const handleRunPipelineSimulation = async () => {
    try {
      setIsRunningPipeline(true);
      setSimulationStatus('running');
      setPipelineLog('Initiating autonomous Python pipeline execution in background...\n');

      const res = await runPipelineSimulation(true);
      setPipelineLog(res.log);
      setSimulationStatus(res.success ? 'success' : 'failed');
    } catch (err: any) {
      setPipelineLog(`Pipeline execution error:\n${err.message}`);
      setSimulationStatus('failed');
    } finally {
      setIsRunningPipeline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Architecture & Capabilities Overview */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Full Automation Pipeline & Multi-Agent Architecture</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Google Doc Script Ingestion & Multi-Voice Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Orchestrating Google Docs ingestion, Edge-TTS multi-voice synthesis (4 regional editions), Librosa audio tempo cross-correlation, FFmpeg video assembly, and automated Telegram channel dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunPipelineSimulation}
              disabled={isRunningPipeline}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
              <span>{isRunningPipeline ? 'Executing Pipeline...' : 'Test Full Pipeline (Dry-Run)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Google Doc Ingest & Multi-Agent Personas */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Google Doc Script Format & Dialect Parser */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Google Doc Ingestion & Dialect Parser</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Formats: Video N | YYYY-MM-DD
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Paste or preview scripts structured with the Google Doc Apps Script format (Video title header + dialect tag + Bengali story text):
            </p>

            <textarea
              value={docScriptInput}
              onChange={(e) => setDocScriptInput(e.target.value)}
              rows={5}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              placeholder="Video 1 | 2026-10-05&#10;Dialect: old-dhaka&#10;বাংলা স্ক্রিপ্ট..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                onClick={handleParseScript}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Parse Header & Dialect</span>
              </button>

              {parsedData && (
                <button
                  onClick={handleLoadIntoStudio}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send Script to Creative Studio</span>
                </button>
              )}
            </div>

            {/* Parsed Result Display */}
            {parsedData && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs space-y-2 mt-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Header:</span>
                    <span className="font-semibold text-slate-200">{parsedData.videoHeader}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Dialect:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-500/30">
                      {parsedData.dialect}
                    </span>
                  </div>
                </div>
                <div className="text-slate-300 pt-1 line-clamp-3">
                  <span className="text-slate-500">Clean Story: </span>
                  {parsedData.scriptText}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Multi-Agent Personas System */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Multi-Agent Brain Personas (brain/personas/)</span>
              </div>
              <span className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                4 Specialized Roles
              </span>
            </div>

            {/* Persona Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {personas.map((persona) => {
                const isSelected = selectedPersonaId === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-semibold capitalize truncate">{persona.id.replace('_', ' ')}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{persona.filename}</p>
                  </button>
                );
              })}
            </div>

            {/* Persona Prompt Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>System Instruction Prompt:</span>
                {personaFeedback && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{personaFeedback}</span>
                  </span>
                )}
              </div>
              <textarea
                value={personaContent}
                onChange={(e) => setPersonaContent(e.target.value)}
                rows={7}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleSavePersona}
                disabled={isSavingPersona}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingPersona ? 'Saving...' : 'Save Persona Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 4 Bengali Voices & Pipeline Simulation Terminal */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 3: The 4 Regional Bengali Voice Editions */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>4 Regional Bengali Voice Editions</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Edge-TTS & Gemini
              </span>
            </div>

            <div className="space-y-2">
              {BENGALI_VOICE_CONFIGS.map((cfg) => (
                <div
                  key={cfg.id}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{cfg.label}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {cfg.speaker}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{cfg.description}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Model: {cfg.edgeVoice} • Pacing: rate=+5%, pitch=-1Hz
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Live Execution Terminal Output */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Autonomous Execution Console</span>
              </div>
              {simulationStatus === 'running' && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">
                  Running...
                </span>
              )}
              {simulationStatus === 'success' && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Success (Exit 0)
                </span>
              )}
            </div>

            <div className="h-64 rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1 selection:bg-slate-800">
              {pipelineLog ? (
                <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">{pipelineLog}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <Terminal className="w-8 h-8 mb-2 opacity-30" />
                  <p>Console idle.</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Click "Test Full Pipeline" above to simulate the 6-stage autonomous workflow.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
