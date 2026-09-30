import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Film,
  Camera,
  Layers,
  Sliders,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Volume2,
  Share2,
  Cpu,
} from 'lucide-react';
import { Header } from './components/Header';
import { PromptEditor } from './components/PromptEditor';
import { VideoPlayer } from './components/VideoPlayer';
import { StoryboardDirector } from './components/StoryboardDirector';
import { PresetsModal } from './components/PresetsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PipelineManager } from './components/PipelineManager';
import {
  checkApiHealth,
  checkApiStatus,
  enhancePrompt,
  generateStoryboard,
  generateSceneVisual,
  generateVoiceover,
  startVeoGeneration,
  pollVeoStatus,
  downloadVeoVideo,
} from './services/api';
import {
  ApiHealthStatus,
  AspectRatio,
  BengaliVoiceOption,
  BENGALI_VOICE_CONFIGS,
  CameraMotion,
  PresetConcept,
  Resolution,
  VideoModel,
  VideoProject,
  VisualStyle,
} from './types';
import { PRESET_CONCEPTS } from './data/presets';

const STORAGE_KEY = 'ai_video_generator_projects_v1';

export const App: React.FC = () => {
  // App state
  const [hasApiKey, setHasApiKey] = useState(true);
  const [activeTab, setActiveTab] = useState<'studio' | 'pipeline'>('studio');
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Preemptive API Health State
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus>({
    status: 'checking',
    gemini: {
      name: 'Gemini 2.5 Flash',
      configured: true,
      accessible: true,
      details: 'Connecting...',
    },
    telegram: {
      name: 'Telegram Bot Dispatch',
      configured: false,
      accessible: false,
      details: 'Connecting...',
    },
    checkedAt: new Date().toISOString(),
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Current Project State
  const [prompt, setPrompt] = useState(
    'A high-tech cinematic camera glides through a neon-illuminated cyberpunk alley in the rain, reflective puddles, holographic signs buzzing, atmospheric steam, 8k resolution.'
  );
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, jitter, flickering, deformed anatomy, artifact, low frame rate'
  );
  const [style, setStyle] = useState<VisualStyle>('cyberpunk');
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>('drone-aerial');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [model, setModel] = useState<VideoModel>('veo-3.1-lite-generate-preview');
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video' | 'storyboard'>('text-to-video');
  const [referenceImage, setReferenceImage] = useState<string | undefined>(undefined);
  const [bengaliVoice, setBengaliVoice] = useState<BengaliVoiceOption>('standard');

  // Active Project object
  const [currentProject, setCurrentProject] = useState<VideoProject>({
    id: 'initial-demo',
    title: 'Cyberpunk Neo-Tokyo Flight',
    prompt:
      'A high-tech cinematic camera glides through a neon-illuminated cyberpunk alley in the rain, reflective puddles, holographic signs buzzing, atmospheric steam, 8k resolution.',
    style: 'cyberpunk',
    cameraMotion: 'drone-aerial',
    aspectRatio: '16:9',
    resolution: '720p',
    model: 'veo-3.1-lite-generate-preview',
    mode: 'text-to-video',
    createdAt: Date.now(),
    status: 'idle',
    referenceImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  });

  // Project history
  const [projects, setProjects] = useState<VideoProject[]>([]);

  // Loading states
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAllVisuals, setIsGeneratingAllVisuals] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preemptive API Health Check function
  const handleRefreshHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkApiHealth();
      setApiHealth(health);
      setHasApiKey(health.gemini.accessible || health.gemini.configured);
    } catch (err) {
      console.error('Failed to run preemptive health check:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Load status, health, and history on initial mount
  useEffect(() => {
    handleRefreshHealth();

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const saveProjectToHistory = (proj: VideoProject) => {
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== proj.id);
      const updated = [proj, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage save error (likely image size limit):', err);
      }
      return updated;
    });
  };

  // Enhance prompt with Gemini
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    try {
      setIsEnhancing(true);
      const res = await enhancePrompt(prompt, style, cameraMotion);
      setPrompt(res.enhancedPrompt);
      if (res.negativePrompt) setNegativePrompt(res.negativePrompt);
      showToast('✨ Prompt enhanced with cinematic lens & lighting directions!');
    } catch (err: any) {
      console.error(err);
      showToast(`Notice: ${err.message || 'Could not enhance prompt'}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate Video using Veo 3.1
  const handleGenerateVideo = async () => {
    const newProjectId = `proj-${Date.now()}`;
    const newProject: VideoProject = {
      id: newProjectId,
      title: prompt.slice(0, 40) + '...',
      prompt,
      negativePrompt,
      style,
      cameraMotion,
      aspectRatio,
      resolution,
      model,
      mode,
      referenceImage,
      createdAt: Date.now(),
      status: 'generating',
      progressMessage: 'Initiating generative synthesis with Veo 3.1...',
    };

    setCurrentProject(newProject);
    setIsGenerating(true);

    try {
      const payload: any = {
        prompt,
        model,
        resolution,
        aspectRatio,
      };

      if (mode === 'image-to-video' && referenceImage) {
        payload.imageBase64 = referenceImage;
      }

      const { operationName } = await startVeoGeneration(payload);

      setCurrentProject((prev) => ({
        ...prev,
        operationName,
        status: 'polling',
        progressMessage: 'Volumetric lighting & ray diffusion pass...',
      }));

      // Poll every 3.5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const status = await pollVeoStatus(operationName);

          const progressSteps = [
            'Simulating camera motion physics...',
            'Temporal consistency refinement...',
            'Synthesizing 24 frames per second...',
            'Applying cinematic lens aberrations...',
            'Encoding final stream buffer...',
          ];
          const randomStep = progressSteps[Math.floor(Math.random() * progressSteps.length)];

          setCurrentProject((prev) => ({
            ...prev,
            progressMessage: randomStep,
          }));

          if (status.done) {
            clearInterval(pollInterval);

            if (status.error) {
              throw new Error(status.error.message || 'Veo generation error');
            }

            // Download video
            setCurrentProject((prev) => ({
              ...prev,
              progressMessage: 'Downloading finished video stream...',
            }));

            const videoBlob = await downloadVeoVideo(operationName);
            const videoBlobUrl = URL.createObjectURL(videoBlob);

            const finishedProject: VideoProject = {
              ...newProject,
              videoBlobUrl,
              status: 'completed',
              progressMessage: undefined,
            };

            setCurrentProject(finishedProject);
            saveProjectToHistory(finishedProject);
            setIsGenerating(false);
            showToast('🎉 Video successfully generated and ready for playback!');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          console.error('Polling error:', pollErr);
          setCurrentProject((prev) => ({
            ...prev,
            status: 'failed',
            error: pollErr.message || 'Failed while polling video operation',
          }));
          setIsGenerating(false);
        }
      }, 3500);
    } catch (err: any) {
      console.error('Generate video error:', err);
      setCurrentProject((prev) => ({
        ...prev,
        status: 'failed',
        error:
          err.message ||
          'Video generation requires an enabled Gemini API Key in Settings > Secrets. You can also use the Multi-Scene Director to storyboard and render scenes in real-time!',
      }));
      setIsGenerating(false);
      showToast('Note: Veo video generation returned an error or requires API key.');
    }
  };

  // Generate Multi-Scene Storyboard with Gemini
  const handleGenerateStoryboard = async () => {
    if (!prompt.trim()) return;
    try {
      setIsGenerating(true);
      const storyboard = await generateStoryboard(prompt, undefined, 3, 15, style);

      const newProject: VideoProject = {
        id: `storyboard-${Date.now()}`,
        title: storyboard.title || prompt.slice(0, 35),
        prompt,
        negativePrompt,
        style,
        cameraMotion,
        aspectRatio,
        resolution,
        model,
        mode: 'storyboard',
        createdAt: Date.now(),
        status: 'idle',
        storyboard,
      };

      setCurrentProject(newProject);
      saveProjectToHistory(newProject);
      showToast('🎬 Multi-scene screenplay & storyboard generated!');

      // Automatically generate first scene visual
      handleGenerateSceneVisual(0, storyboard);
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err.message || 'Failed to generate storyboard'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate visual frame for a scene
  const handleGenerateSceneVisual = async (sceneIndex: number, currentSb = currentProject.storyboard) => {
    if (!currentSb || !currentSb.scenes[sceneIndex]) return;

    const scene = currentSb.scenes[sceneIndex];

    // Mark loading
    setCurrentProject((prev) => {
      if (!prev.storyboard) return prev;
      const updatedScenes = [...prev.storyboard.scenes];
      updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], isGeneratingVisual: true };
      return {
        ...prev,
        storyboard: { ...prev.storyboard, scenes: updatedScenes },
      };
    });

    try {
      const imageUrl = await generateSceneVisual(scene.visualDescription, aspectRatio);

      setCurrentProject((prev) => {
        if (!prev.storyboard) return prev;
        const updatedScenes = [...prev.storyboard.scenes];
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          imageUrl,
          isGeneratingVisual: false,
        };
        const updatedProj = {
          ...prev,
          storyboard: { ...prev.storyboard, scenes: updatedScenes },
        };
        saveProjectToHistory(updatedProj);
        return updatedProj;
      });
      showToast(`Visual frame generated for Scene ${scene.sceneNumber}!`);
    } catch (err: any) {
      console.error(err);
      setCurrentProject((prev) => {
        if (!prev.storyboard) return prev;
        const updatedScenes = [...prev.storyboard.scenes];
        updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], isGeneratingVisual: false };
        return {
          ...prev,
          storyboard: { ...prev.storyboard, scenes: updatedScenes },
        };
      });
      showToast(`Frame generation notice: ${err.message}`);
    }
  };

  // Generate visual frames for all scenes sequentially
  const handleGenerateAllVisuals = async () => {
    if (!currentProject.storyboard) return;
    setIsGeneratingAllVisuals(true);
    for (let i = 0; i < currentProject.storyboard.scenes.length; i++) {
      await handleGenerateSceneVisual(i);
    }
    setIsGeneratingAllVisuals(false);
    showToast('All scene frames synthesized successfully!');
  };

  // Generate voiceover audio using selected Bengali voice (standard, deep, energetic, soft)
  const handleGenerateVoiceover = async (text: string, voice: BengaliVoiceOption = bengaliVoice) => {
    try {
      const voiceConfig = BENGALI_VOICE_CONFIGS.find((v) => v.id === voice);
      showToast(`🎙️ Generating voiceover with ${voiceConfig?.tone || voice}...`);
      const audioUrl = await generateVoiceover(text, voice);
      setCurrentProject((prev) => ({
        ...prev,
        voiceoverAudio: audioUrl,
        voiceoverVoice: voice,
      }));
      showToast(`Voiceover narration (${voiceConfig?.tone || voice}) generated successfully!`);
    } catch (err: any) {
      console.error(err);
      showToast(`TTS notice: ${err.message}`);
    }
  };

  // Pick Preset
  const handleSelectPreset = (preset: PresetConcept) => {
    setPrompt(preset.prompt);
    setStyle(preset.style);
    setCameraMotion(preset.cameraMotion);
    setAspectRatio(preset.aspectRatio);
    setCurrentProject((prev) => ({
      ...prev,
      title: preset.title,
      prompt: preset.prompt,
      style: preset.style,
      cameraMotion: preset.cameraMotion,
      aspectRatio: preset.aspectRatio,
      referenceImage: preset.previewThumbnail,
    }));
    showToast(`Loaded preset: "${preset.title}"`);
  };

  // Select project from library
  const handleSelectProject = (proj: VideoProject) => {
    setCurrentProject(proj);
    setPrompt(proj.prompt);
    if (proj.negativePrompt) setNegativePrompt(proj.negativePrompt);
    setStyle(proj.style);
    setCameraMotion(proj.cameraMotion);
    setAspectRatio(proj.aspectRatio);
    setResolution(proj.resolution);
    setModel(proj.model);
    setMode(proj.mode);
    setReferenceImage(proj.referenceImage);
  };

  // New clean project
  const handleNewProject = () => {
    setPrompt('');
    setReferenceImage(undefined);
    setCurrentProject({
      id: `proj-${Date.now()}`,
      title: 'New Video Production',
      prompt: '',
      style: 'cinematic',
      cameraMotion: 'dynamic',
      aspectRatio: '16:9',
      resolution: '720p',
      model: 'veo-3.1-lite-generate-preview',
      mode: 'text-to-video',
      createdAt: Date.now(),
      status: 'idle',
    });
    showToast('Created new project canvas');
  };

  // Delete project from library
  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleLoadScriptFromPipeline = (scriptText: string, header: string, dialect: string) => {
    setPrompt(scriptText);
    const dialectMap: Record<string, BengaliVoiceOption> = {
      'old-dhaka': 'deep',
      'chittagong': 'deep',
      'sylheti': 'energetic',
      'kolkata': 'soft',
      'rangpuri': 'standard',
      'barishal': 'standard',
    };
    if (dialectMap[dialect.toLowerCase()]) {
      setBengaliVoice(dialectMap[dialect.toLowerCase()]);
    }
    setCurrentProject((prev) => ({
      ...prev,
      title: header,
      prompt: scriptText,
    }));
    setActiveTab('studio');
    showToast(`Loaded "${header}" (${dialect}) into Creative Studio!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        hasApiKey={hasApiKey}
        health={apiHealth}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={handleRefreshHealth}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewProject={handleNewProject}
        historyCount={projects.length}
      />

      {/* Primary Workspace Navigation Tabs */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>Creative Studio & Veo 3.1</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pipeline'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-300" />
            <span>Autonomous Pipeline & Multi-Agent Brain</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
              Background CI
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'pipeline' ? (
          <PipelineManager onLoadScriptToEditor={handleLoadScriptFromPipeline} />
        ) : (
          /* Workspace Grid: Left = Controls & Editor, Right = Player & Monitor */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Prompting & Director Controls (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-6">
              <PromptEditor
                prompt={prompt}
                setPrompt={setPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                style={style}
                setStyle={setStyle}
                cameraMotion={cameraMotion}
                setCameraMotion={setCameraMotion}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                resolution={resolution}
                setResolution={setResolution}
                model={model}
                setModel={setModel}
                mode={mode}
                setMode={setMode}
                referenceImage={referenceImage}
                setReferenceImage={setReferenceImage}
                bengaliVoice={bengaliVoice}
                setBengaliVoice={setBengaliVoice}
                onGenerate={handleGenerateVideo}
                onEnhancePrompt={handleEnhancePrompt}
                onGenerateStoryboard={handleGenerateStoryboard}
                isEnhancing={isEnhancing}
                isGenerating={isGenerating}
                hasApiKey={hasApiKey}
              />

              {/* If Storyboard mode is active and storyboard exists, show screenplay below */}
              {mode === 'storyboard' && currentProject.storyboard && (
                <StoryboardDirector
                  storyboard={currentProject.storyboard}
                  bengaliVoice={bengaliVoice}
                  setBengaliVoice={setBengaliVoice}
                  onGenerateSceneVisual={(idx) => handleGenerateSceneVisual(idx)}
                  onGenerateAllVisuals={handleGenerateAllVisuals}
                  onGenerateVoiceover={handleGenerateVoiceover}
                  isGeneratingAllVisuals={isGeneratingAllVisuals}
                />
              )}
            </div>

            {/* Right Column: Player & Cinematic Preview (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              <VideoPlayer
                project={currentProject}
                aspectRatio={aspectRatio}
              />

              {/* Quick tips & Features card */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Production Tips</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                  <li>
                    Use <strong>Magic Prompt Enhance</strong> to automatically add ARRI Alexa lens details, lighting, and volumetric atmosphere.
                  </li>
                  <li>
                    Try <strong>Multi-Scene Director</strong> to generate a complete 3-scene story with camera movements, subtitles, and Gemini voiceovers.
                  </li>
                  <li>
                    Switch to <strong>Autonomous Pipeline & Multi-Agent Brain</strong> tab to edit the 4 agent personas (Director, Writer, Character Designer, Style Director) and simulate background runs!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>AI Video Generator • Powered by Google Gemini 3.8 & Veo 3.1</p>
      </footer>

      {/* Inspiration Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        projects={projects}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs font-medium shadow-2xl shadow-indigo-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
