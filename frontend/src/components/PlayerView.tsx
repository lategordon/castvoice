import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  Download, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  FileJson, 
  Music, 
  VolumeX, 
  SlidersHorizontal 
} from 'lucide-react';
import { ScriptDocument, TimingManifest, TimingManifestLine, Character } from '../types/script';

interface PlayerViewProps {
  script: ScriptDocument;
}

export const PlayerView: React.FC<PlayerViewProps> = ({ script }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number; status: string }>({
    current: 0,
    total: script.lines.length,
    status: 'Ready to render'
  });
  const [hasRendered, setHasRendered] = useState(false);
  const [manifest, setManifest] = useState<TimingManifest | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const characterMap = new Map<string, Character>(script.characters.map(c => [c.id, c]));
  const lineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Check if project already has rendered audio
  useEffect(() => {
    fetch(`/api/projects/${script.project_id}/manifest`)
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data) {
          setManifest(data);
          setHasRendered(true);
          setDurationMs(data.total_duration_ms);
        }
      })
      .catch(() => {});
  }, [script.project_id]);

  // Trigger audio render pipeline
  const handleRender = async () => {
    setIsRendering(true);
    setRenderProgress({
      current: 0,
      total: script.lines.length,
      status: 'Initializing TTS & Mixing...'
    });

    // Start progress polling
    const pollInterval = setInterval(async () => {
      try {
        const pRes = await fetch(`/api/projects/${script.project_id}/render-progress`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setRenderProgress(pData);
        }
      } catch {}
    }, 500);

    try {
      const res = await fetch(`/api/projects/${script.project_id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inter_line_pause_ms: 350 })
      });

      clearInterval(pollInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Rendering failed');
      }

      const data = await res.json();
      setHasRendered(true);

      // Fetch manifest
      const mRes = await fetch(`/api/projects/${script.project_id}/manifest`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setManifest(mData);
        setDurationMs(mData.total_duration_ms);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Render failed');
    } finally {
      clearInterval(pollInterval);
      setIsRendering(false);
    }
  };

  // Sync active line with audio currentTime
  const handleTimeUpdate = () => {
    if (!audioRef.current || !manifest) return;
    const currentMs = Math.floor(audioRef.current.currentTime * 1000);
    setCurrentTimeMs(currentMs);

    // Find line covering current timestamp
    const active = manifest.lines.find(
      l => currentMs >= l.start_time_ms && currentMs <= l.end_time_ms
    );

    if (active && active.line_id !== activeLineId) {
      setActiveLineId(active.line_id);
      // Auto-scroll active line into view smoothly
      const el = lineRefs.current[active.line_id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Jump to specific line on click
  const handleLineClick = (line: TimingManifestLine) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = line.start_time_ms / 1000;
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetMs = parseFloat(e.target.value);
    setCurrentTimeMs(targetMs);
    if (audioRef.current) {
      audioRef.current.currentTime = targetMs / 1000;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadScriptJson = () => {
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title.toLowerCase().replace(/\s+/g, '_')}_script.json`;
    a.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-surface">
      {/* Audio Element */}
      {hasRendered && (
        <audio
          ref={audioRef}
          src={`/api/projects/${script.project_id}/audio`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDurationMs(Math.floor(audioRef.current.duration * 1000));
            }
          }}
        />
      )}

      {/* Render Prompt Bar if not yet rendered */}
      {!hasRendered && (
        <div className="p-10 max-w-2xl mx-auto text-center my-auto bg-white border border-border-hairline rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-primary mx-auto flex items-center justify-center mb-5">
            <Music className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif text-ink-primary mb-2 font-normal">Ready to Render Full Audio Play</h2>
          <p className="text-ink-muted text-sm mb-6 leading-relaxed">
            Synthesizes all {script.lines.length} lines with neural voices, adds dramatic pauses, and mixes in Foley sound effects 
            with automatic -6dB background ducking.
          </p>

          {isRendering ? (
            <div className="bg-surface border border-border-hairline rounded-xl p-6 text-left">
              <div className="flex justify-between items-center text-xs text-ink-secondary mb-2">
                <span className="font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  {renderProgress.status}
                </span>
                <span className="font-mono text-ink-muted">
                  {renderProgress.current} / {renderProgress.total} lines
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-border-hairline">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${renderProgress.total ? (renderProgress.current / renderProgress.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleRender}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-container text-white font-medium rounded-xl shadow-md shadow-emerald-900/10 transition text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Render Full-Cast Audio Play
            </button>
          )}
        </div>
      )}

      {/* Synchronized Transcript View */}
      {hasRendered && (
        <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-36">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline text-xs text-ink-muted">
              <span className="font-medium">Synchronized Transcript (Click any line to jump audio)</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRender}
                  disabled={isRendering}
                  className="hover:text-primary transition flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Re-render
                </button>
                <button
                  onClick={downloadScriptJson}
                  className="hover:text-ink-primary transition flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Export Script JSON
                </button>
                <a
                  href={`/api/projects/${script.project_id}/audio`}
                  download={`${script.title.toLowerCase().replace(/\s+/g, '_')}.mp3`}
                  className="hover:text-primary transition flex items-center gap-1.5 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Master MP3
                </a>
              </div>
            </div>

            {script.lines.map((line) => {
              const char = characterMap.get(line.speaker_id) || {
                id: line.speaker_id,
                name: line.speaker_id,
                color_accent: '#94A3B8'
              };
              const isNarrator = line.speaker_id === 'narrator';
              const isActive = activeLineId === line.id;
              const manifestLine = manifest?.lines.find(l => l.line_id === line.id);

              return (
                <div
                  key={line.id}
                  ref={el => { lineRefs.current[line.id] = el; }}
                  onClick={() => manifestLine && handleLineClick(manifestLine)}
                  style={{ borderLeftColor: char.color_accent || '#006948' }}
                  className={`p-5 rounded-xl border border-border-hairline border-l-4 cursor-pointer transition duration-150 ${
                    isActive
                      ? 'bg-emerald-50/60 border-primary/50 shadow-[0_2px_12px_rgba(0,105,72,0.08)] scale-[1.005]'
                      : isNarrator
                      ? 'bg-white/70 hover:bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]'
                      : 'bg-white hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: char.color_accent || '#006948' }}
                      />
                      <span className="text-xs font-semibold text-ink-primary">
                        {char.name}
                      </span>
                      {line.delivery?.emotion && (
                        <span className="text-[11px] text-tertiary italic">
                          ({line.delivery.emotion})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {manifestLine && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {formatTime(manifestLine.start_time_ms)}
                        </span>
                      )}
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,105,72,0.6)] animate-pulse" />
                      )}
                    </div>
                  </div>

                  <p className={`text-[19px] leading-[32px] font-serif ${isNarrator ? 'text-ink-secondary italic font-normal' : 'text-ink-primary font-normal'}`}>
                    {line.text}
                  </p>

                  {line.sound_cues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {line.sound_cues.map(c => (
                        <span key={c.id} className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          🎵 [{c.placement}: {c.tag}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Audio Playback Controller Bar */}
      {hasRendered && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-white/95 backdrop-blur-xl border border-border-hairline px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] z-50">
          <div className="flex flex-col gap-2.5">
            {/* Scrubber Bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-ink-muted w-12 text-right">
                {formatTime(currentTimeMs)}
              </span>
              <input
                type="range"
                min={0}
                max={durationMs || 100}
                value={currentTimeMs}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs font-mono text-ink-muted w-12">
                {formatTime(durationMs)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              {/* Active Speaker Info */}
              <div className="flex items-center gap-3 w-1/4 truncate">
                {activeLineId && (
                  <div className="text-xs truncate">
                    <span className="font-semibold text-primary">Now Speaking: </span>
                    <span className="text-ink-primary font-medium">
                      {characterMap.get(script.lines.find(l => l.id === activeLineId)?.speaker_id || '')?.name || 'Narrator'}
                    </span>
                  </div>
                )}
              </div>

              {/* Main Playback Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSkip(-5)}
                  className="p-2 text-ink-secondary hover:text-ink-primary rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Rewind 5s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-primary hover:bg-primary-container text-white rounded-full shadow-md shadow-emerald-900/20 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => handleSkip(5)}
                  className="p-2 text-ink-secondary hover:text-ink-primary rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Forward 5s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed & Volume Controls */}
              <div className="flex items-center gap-4 w-1/4 justify-end">
                {/* Speed buttons */}
                <div className="flex items-center bg-slate-100 border border-border-hairline rounded-lg p-0.5 text-xs">
                  {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleRateChange(rate)}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${playbackRate === rate ? 'bg-white text-ink-primary font-semibold shadow-sm' : 'text-ink-muted hover:text-ink-primary'}`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Volume icon */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-ink-muted" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (audioRef.current) audioRef.current.volume = v;
                    }}
                    className="w-16 h-1 bg-slate-200 rounded cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
