import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Film,
  Sparkles,
  Camera,
  AlertCircle,
  Clock,
  Layers,
  FileVideo,
} from 'lucide-react';
import { AspectRatio, VideoProject } from '../types';

interface VideoPlayerProps {
  project: VideoProject;
  aspectRatio: AspectRatio;
  onExportVideo?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  project,
  aspectRatio,
  onExportVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Aspect ratio styling
  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-w-[340px]'
      : aspectRatio === '1:1'
      ? 'aspect-square max-w-[500px]'
      : 'aspect-video max-w-full';

  // Handling Veo generated video
  const hasRealVideo = Boolean(project.videoBlobUrl || project.videoUrl);

  // Canvas animation for storyboard or visual simulation
  const scenes = project.storyboard?.scenes || [];
  const hasStoryboardScenes = scenes.length > 0;

  // Total duration of storyboard
  const totalStoryboardDuration = hasStoryboardScenes
    ? scenes.reduce((acc, sc) => acc + (sc.durationSec || 4), 0)
    : 10;

  useEffect(() => {
    if (hasRealVideo) {
      const vid = videoRef.current;
      if (!vid) return;

      const handleTimeUpdate = () => {
        if (vid.duration) {
          setProgress(vid.currentTime / vid.duration);
          setCurrentTime(vid.currentTime);
          setDuration(vid.duration);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
      };

      vid.addEventListener('timeupdate', handleTimeUpdate);
      vid.addEventListener('ended', handleEnded);
      return () => {
        vid.removeEventListener('timeupdate', handleTimeUpdate);
        vid.removeEventListener('ended', handleEnded);
      };
    }
  }, [hasRealVideo, project.videoBlobUrl, project.videoUrl]);

  // Canvas render loop for storyboard preview
  useEffect(() => {
    if (hasRealVideo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let startTime = performance.now();
    let isCancelled = false;

    // Preload scene images
    const loadedImages: HTMLImageElement[] = [];
    scenes.forEach((sc, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      if (sc.imageUrl) {
        img.src = sc.imageUrl;
      } else if (project.referenceImage) {
        img.src = project.referenceImage;
      }
      loadedImages[idx] = img;
    });

    const render = (time: number) => {
      if (isCancelled) return;
      const width = canvas.width;
      const height = canvas.height;

      // Background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      if (hasStoryboardScenes) {
        const curSec = (progress * totalStoryboardDuration);
        let accumulatedSec = 0;
        let activeIdx = 0;
        let sceneTime = 0;

        for (let i = 0; i < scenes.length; i++) {
          const scDur = scenes[i].durationSec || 4;
          if (curSec >= accumulatedSec && curSec < accumulatedSec + scDur) {
            activeIdx = i;
            sceneTime = (curSec - accumulatedSec) / scDur;
            break;
          }
          accumulatedSec += scDur;
        }

        if (activeIdx !== activeSceneIndex) {
          setActiveSceneIndex(activeIdx);
        }

        const currentScene = scenes[activeIdx];
        const img = loadedImages[activeIdx];

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          // Apply cinematic camera motions based on scene direction
          const motion = (currentScene?.cameraMovement || project.cameraMotion || 'zoom-in').toLowerCase();
          let scale = 1.0;
          let dx = 0;
          let dy = 0;

          if (motion.includes('zoom-in') || motion.includes('push')) {
            scale = 1.0 + sceneTime * 0.18;
          } else if (motion.includes('zoom-out') || motion.includes('pull')) {
            scale = 1.18 - sceneTime * 0.18;
          } else if (motion.includes('pan-left') || motion.includes('glide left')) {
            dx = -sceneTime * 40;
            scale = 1.1;
          } else if (motion.includes('pan-right') || motion.includes('glide right')) {
            dx = sceneTime * 40;
            scale = 1.1;
          } else if (motion.includes('tilt-up')) {
            dy = -sceneTime * 30;
            scale = 1.1;
          } else {
            // Subtle slow drift
            scale = 1.05 + Math.sin(sceneTime * Math.PI) * 0.05;
          }

          ctx.translate(width / 2 + dx, height / 2 + dy);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          // Placeholder gradient scene animation if images are loading
          const grad = ctx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, '#1e1b4b');
          grad.addColorStop(0.5, '#312e81');
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);

          // Moving light particles
          ctx.fillStyle = 'rgba(165, 180, 252, 0.4)';
          for (let p = 0; p < 25; p++) {
            const px = ((p * 73 + progress * 200) % width);
            const py = ((p * 51 + progress * 150) % height);
            ctx.beginPath();
            ctx.arc(px, py, (p % 3) + 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Cinematic Vignette overlay
        const vignette = ctx.createRadialGradient(
          width / 2,
          height / 2,
          height * 0.35,
          width / 2,
          height / 2,
          height * 0.85
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        // Subtitles / Voiceover text overlay
        if (currentScene?.voiceover) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          const text = currentScene.voiceover;
          ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
          const textWidth = ctx.measureText(text).width;
          const boxWidth = Math.min(width - 40, textWidth + 30);
          const boxX = (width - boxWidth) / 2;
          const boxY = height - 60;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, 34, 8);
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, width / 2, boxY + 17, width - 60);
        }
      } else if (project.referenceImage) {
        // Single reference image animation
        const img = loadedImages[0];
        if (img && img.complete) {
          ctx.save();
          const scale = 1.0 + progress * 0.12;
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          ctx.restore();
        }
      }

      if (isPlaying) {
        setProgress((prev) => {
          const next = prev + 0.003;
          if (next >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, progress, hasRealVideo, hasStoryboardScenes, scenes, activeSceneIndex]);

  const togglePlay = () => {
    if (hasRealVideo) {
      const vid = videoRef.current;
      if (!vid) return;
      if (isPlaying) {
        vid.pause();
        setIsPlaying(false);
      } else {
        vid.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
      // If voiceover audio exists, sync audio
      if (audioRef.current) {
        if (!isPlaying) {
          audioRef.current.currentTime = progress * totalStoryboardDuration;
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setProgress(pos);
    if (hasRealVideo && videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = pos * totalStoryboardDuration;
    }
  };

  const handleDownload = () => {
    if (project.videoBlobUrl) {
      const a = document.createElement('a');
      a.href = project.videoBlobUrl;
      a.download = `${project.title || 'ai-video'}-${Date.now()}.mp4`;
      a.click();
    } else if (canvasRef.current) {
      // Export canvas recording
      recordAndExportCanvas();
    }
  };

  // Direct canvas recording to WebM/MP4
  const recordAndExportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsExporting(true);
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title || 'cinematic-render'}-${Date.now()}.webm`;
        a.click();
        setIsExporting(false);
      };

      // Reset to start and record for total duration
      setProgress(0);
      setIsPlaying(true);
      mediaRecorder.start();

      const recordDuration = Math.min(15000, totalStoryboardDuration * 1000);
      setTimeout(() => {
        mediaRecorder.stop();
        setIsPlaying(false);
      }, recordDuration);
    } catch (err) {
      console.error('Canvas export error:', err);
      setIsExporting(false);
    }
  };

  const isGenerating = project.status === 'generating' || project.status === 'polling';

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col items-center">
      {/* Player Header Info */}
      <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div>
          <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <span className="truncate max-w-[280px] sm:max-w-md">
              {project.title || 'Untitled Cinematic Production'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{aspectRatio}</span>
            <span>•</span>
            <span className="capitalize">{project.style}</span>
            <span>•</span>
            <span className="capitalize">{project.cameraMotion}</span>
          </p>
        </div>

        {/* Download action button */}
        {(hasRealVideo || hasStoryboardScenes) && (
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            title="Download Video File"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce text-indigo-400' : ''}`} />
            <span>{isExporting ? 'Exporting...' : 'Download MP4'}</span>
          </button>
        )}
      </div>

      {/* Screen Frame Container */}
      <div className={`relative w-full ${aspectClass} mx-auto bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group`}>
        {/* State 1: Active Generation Screen */}
        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
            </div>

            <h4 className="text-base font-semibold text-white mb-2">
              Synthesizing Generative Video
            </h4>
            <p className="text-xs text-indigo-300 font-medium mb-1">
              {project.progressMessage || 'Simulating camera motion vectors and lighting...'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Deep diffusion video models synthesize 24 frames per second with consistent volumetric lighting and motion physics.
            </p>
          </div>
        )}

        {/* State 2: Error Screen */}
        {project.status === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h4 className="text-sm font-semibold text-rose-300 mb-1">Video Generation Notice</h4>
            <p className="text-xs text-slate-300 max-w-md mb-4">{project.error}</p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-400 text-left max-w-sm">
              <p className="font-semibold text-slate-300 mb-1">Interactive Storyboard Available:</p>
              You can still use the <strong>Multi-Scene Director</strong> to generate visuals, voiceover narration, and animate scenes seamlessly in the canvas preview!
            </div>
          </div>
        )}

        {/* State 3: Real Video Playback */}
        {hasRealVideo ? (
          <video
            ref={videoRef}
            src={project.videoBlobUrl || project.videoUrl}
            className="w-full h-full object-contain"
            playsInline
            loop
            muted={isMuted}
          />
        ) : (
          /* State 4: Canvas Storyboard / Animation Preview */
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />
        )}

        {/* Voiceover Audio Element (if generated) */}
        {project.voiceoverAudio && (
          <audio ref={audioRef} src={project.voiceoverAudio} />
        )}

        {/* Overlay Play/Pause Big Button on hover */}
        {!isGenerating && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 backdrop-blur-sm transform transition-transform group-hover:scale-105 active:scale-95">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </div>
          </button>
        )}

        {/* Aspect Ratio Badge */}
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
          {aspectRatio} • {project.resolution}
        </div>
      </div>

      {/* Scrubber Timeline & Playback Bar */}
      <div className="w-full mt-4 space-y-2">
        {/* Timeline Bar */}
        <div
          onClick={handleSeek}
          className="relative h-2.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden group/bar"
        >
          {/* Scene segmentation markers if storyboard */}
          {hasStoryboardScenes && (
            <div className="absolute inset-0 flex">
              {scenes.map((sc, i) => (
                <div
                  key={i}
                  style={{ width: `${((sc.durationSec || 4) / totalStoryboardDuration) * 100}%` }}
                  className="h-full border-r border-slate-700/60"
                  title={`Scene ${sc.sceneNumber}: ${sc.shotType}`}
                />
              ))}
            </div>
          )}

          {/* Progress fill */}
          <div
            style={{ width: `${progress * 100}%` }}
            className="relative h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-75"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Control buttons & time display */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setProgress(0);
                if (videoRef.current) videoRef.current.currentTime = 0;
                if (audioRef.current) audioRef.current.currentTime = 0;
              }}
              className="p-1.5 hover:text-white transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[11px] text-slate-300 ml-2">
              {(progress * (hasRealVideo ? duration : totalStoryboardDuration)).toFixed(1)}s /{' '}
              {(hasRealVideo ? duration : totalStoryboardDuration).toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasStoryboardScenes && (
              <span className="text-[11px] text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Scene {activeSceneIndex + 1} of {scenes.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
