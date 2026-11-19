import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Sparkles, 
  AlertTriangle, 
  Tag, 
  Users, 
  Edit2, 
  Merge, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  Play, 
  Square,
  Loader2,
  Mic,
  ArrowRight,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { ScriptDocument, ScriptLine, Character, Voice, SoundCuePlacement } from '../types/script';

interface ScriptEditorProps {
  script: ScriptDocument;
  onScriptUpdated: (newScript: ScriptDocument) => void;
  onProceedToRender?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ 
  script, 
  onScriptUpdated,
  onProceedToRender 
}) => {
  // Audio state
  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice Catalog state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);

  // Character Management modals
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const characterMap = new Map<string, Character>(script.characters.map(c => [c.id, c]));

  // Load voices catalog on mount
  useEffect(() => {
    fetch('/api/voices')
      .then(res => res.json())
      .then(data => {
        setVoices(data);
        setLoadingVoices(false);
      })
      .catch(err => {
        console.error('Failed to load voices', err);
        setLoadingVoices(false);
      });

    return () => {
      // Cleanup any playing audio on unmount
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Stop any currently playing audio
  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setPlayingLineId(null);
    setPlayingVoiceId(null);
  };

  // Play / Stop single line preview audio
  const handleToggleLinePreview = async (lineId: string) => {
    // If currently playing this exact line, STOP IT
    if (playingLineId === lineId) {
      stopCurrentAudio();
      return;
    }

    // Stop any other playing audio first
    stopCurrentAudio();

    try {
      setPlayingLineId(lineId);
      const res = await fetch(`/api/voices/preview-line/${script.project_id}/${lineId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingLineId(null);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingLineId(null);
        currentAudioRef.current = null;
      };
      await audio.play();
    } catch (e) {
      console.error('Line preview error:', e);
      setPlayingLineId(null);
      currentAudioRef.current = null;
    }
  };

  // Play / Stop voice catalog audition sample
  const handleToggleVoicePreview = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();

    try {
      setPlayingVoiceId(voiceId);
      const res = await fetch('/api/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId })
      });
      if (!res.ok) throw new Error('Voice preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        currentAudioRef.current = null;
      };
      await audio.play();
    } catch (e) {
      console.error('Voice preview error:', e);
      setPlayingVoiceId(null);
      currentAudioRef.current = null;
    }
  };

  // Assign voice to character
  const handleAssignVoice = async (characterId: string, voiceId: string) => {
    try {
      const res = await fetch(`/api/projects/${script.project_id}/characters/${characterId}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId })
      });
      if (res.ok) {
        const updatedDoc = await res.json();
        onScriptUpdated(updatedDoc);
      }
    } catch (e) {
      console.error('Failed to assign voice:', e);
    }
  };

  // Update line speaker
  const handleSpeakerChange = async (lineId: string, newSpeakerId: string) => {
    try {
      const res = await fetch(`/api/projects/${script.project_id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker_id: newSpeakerId, confidence: 'high' })
      });
      if (res.ok) {
        const updatedLines = script.lines.map(l => 
          l.id === lineId ? { ...l, speaker_id: newSpeakerId, confidence: 'high' as const } : l
        );
        onScriptUpdated({ ...script, lines: updatedLines });
      }
    } catch (err) {
      console.error('Failed to update line speaker', err);
    }
  };

  // Update line delivery notes
  const handleDeliveryChange = async (lineId: string, emotion: string, pace?: string, volume?: string) => {
    try {
      const res = await fetch(`/api/projects/${script.project_id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion, pace, volume })
      });
      if (res.ok) {
        const updatedLines = script.lines.map(l => {
          if (l.id === lineId) {
            return {
              ...l,
              delivery: {
                ...l.delivery,
                emotion: emotion || null,
                pace: pace || l.delivery?.pace || null,
                volume: volume || l.delivery?.volume || null,
              }
            };
          }
          return l;
        });
        onScriptUpdated({ ...script, lines: updatedLines });
      }
    } catch (err) {
      console.error('Failed to update line delivery', err);
    }
  };

  // Rename character
  const handleRenameCharacter = async () => {
    if (!editingCharacter || !renameInput.trim()) return;
    try {
      const res = await fetch(`/api/projects/${script.project_id}/characters/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: editingCharacter.id,
          new_name: renameInput.trim()
        })
      });
      if (res.ok) {
        const updatedDoc = await res.json();
        onScriptUpdated(updatedDoc);
        setEditingCharacter(null);
      }
    } catch (err) {
      console.error('Failed to rename character', err);
    }
  };

  // Merge characters
  const handleMergeCharacters = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    try {
      const res = await fetch(`/api/projects/${script.project_id}/characters/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_character_id: mergeSourceId,
          target_character_id: mergeTargetId
        })
      });
      if (res.ok) {
        const updatedDoc = await res.json();
        onScriptUpdated(updatedDoc);
        setShowMergeModal(false);
      }
    } catch (err) {
      console.error('Failed to merge characters', err);
    }
  };

  const [filterMode, setFilterMode] = useState<'all' | 'dialogue' | 'sfx' | 'flagged'>('all');
  const lowConfidenceCount = script.lines.filter(l => l.confidence === 'low').length;
  const sfxCount = script.lines.filter(l => Boolean(l.sound_cues && l.sound_cues.length > 0)).length;

  const filteredLines = script.lines.filter(line => {
    if (filterMode === 'flagged') return line.confidence === 'low';
    if (filterMode === 'sfx') return Boolean(line.sound_cues && line.sound_cues.length > 0);
    if (filterMode === 'dialogue') return line.type === 'dialogue';
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface text-ink-primary font-sans">
      {/* Sticky Workflow Stage & Quick Action Sub-Header (DESIGN.md Level 1 / Floating Controls) */}
      <section className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md px-6 py-3 border-b border-border-hairline shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumb Context & Extraction Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-semibold text-sm text-ink-primary tracking-tight font-serif text-base">
                {script.title}
              </span>
            </div>
            <div className="h-4 w-px bg-border-hairline" />
            <div className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
              <span className="px-2 py-0.5 rounded bg-surface-container-low border border-border-hairline text-secondary font-semibold">
                {script.lines.length} Lines Extracted
              </span>
              <span>•</span>
              <span className="font-medium text-ink-muted">Stage 2 of 4: Script Editorial</span>
            </div>
          </div>

          {/* Script Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-surface-container-low border border-border-hairline">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-primary shadow-xs border border-primary/20'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
              }`}
            >
              All Speakers ({script.lines.length})
            </button>
            <button
              onClick={() => setFilterMode('dialogue')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterMode === 'dialogue'
                  ? 'bg-white text-tertiary shadow-xs border border-tertiary/20'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
              }`}
            >
              Dialogue
            </button>
            <button
              onClick={() => setFilterMode('sfx')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterMode === 'sfx'
                  ? 'bg-white text-secondary shadow-xs border border-secondary/20'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
              }`}
            >
              SFX Only ({sfxCount})
            </button>
            <button
              onClick={() => setFilterMode('flagged')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterMode === 'flagged'
                  ? 'bg-error text-white shadow-xs'
                  : lowConfidenceCount > 0
                  ? 'bg-error-container text-error hover:bg-error-container/80'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${lowConfidenceCount > 0 ? 'bg-error animate-pulse' : 'bg-slate-300'}`} />
              Flagged ({lowConfidenceCount})
            </button>
          </div>

          {/* Subheader Action Cluster */}
          <div className="flex items-center gap-2.5">
            {playingLineId && (
              <button
                onClick={stopCurrentAudio}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-white shadow-xs hover:bg-error/90 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Preview
              </button>
            )}

            {onProceedToRender && (
              <button
                onClick={onProceedToRender}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container transition-all shadow-sm text-xs font-semibold"
              >
                <span>Proceed to Casting</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Studio Stage Split Layout: 12-Column Responsive Workspace */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1720px] mx-auto px-6 py-6 pb-28">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT / MAIN COLUMN: Script Timeline Stream (8 of 12 Cols) */}
            <div className="xl:col-span-8 flex flex-col gap-4">
              {lowConfidenceCount > 0 && filterMode !== 'flagged' && (
                <div className="bg-error-container/30 border border-error/30 rounded-xl p-3 flex items-center justify-between text-error text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Ambiguous Attribution Detected:</strong> {lowConfidenceCount} line{lowConfidenceCount > 1 ? 's' : ''} have uncertain speaker identification.
                    </span>
                  </div>
                  <button
                    onClick={() => setFilterMode('flagged')}
                    className="font-semibold underline ml-2 hover:text-ink-primary"
                  >
                    View Flagged
                  </button>
                </div>
              )}

              {filteredLines.map((line) => {
                const char: Character = characterMap.get(line.speaker_id) || {
                  id: line.speaker_id,
                  name: line.speaker_id,
                  aliases: [],
                  color_accent: '#006948',
                  voice_id: undefined
                };
                const isNarrator = line.speaker_id === 'narrator';
                const isLowConf = line.confidence === 'low';
                const isPlaying = playingLineId === line.id;
                const wordCount = line.text.trim().split(/\s+/).length;
                const estSeconds = Math.max(1.2, (wordCount / 2.7)).toFixed(1);

                return (
                  <article
                    key={line.id}
                    style={{ borderLeftColor: char.color_accent || '#006948' }}
                    className={`script-card relative rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all border border-border-hairline border-l-4 ${
                      isPlaying
                        ? 'bg-surface-container-low border-primary/50 shadow-md ring-1 ring-primary/30'
                        : isLowConf
                        ? 'bg-error-container/10 border-error/40 hover:bg-error-container/20'
                        : isNarrator
                        ? 'bg-white hover:border-slate-300'
                        : 'bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Top Metadata Row */}
                    <div className="flex items-center justify-between gap-4 pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs text-ink-muted font-semibold">
                          #{String(line.line_index + 1).padStart(3, '0')}
                        </span>

                        {/* Speaker Pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low border border-border-hairline text-ink-primary">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: char.color_accent || '#006948' }}
                          />
                          <select
                            value={line.speaker_id}
                            onChange={(e) => handleSpeakerChange(line.id, e.target.value)}
                            className="bg-transparent text-xs font-semibold text-ink-primary focus:outline-none cursor-pointer"
                          >
                            {script.characters.map((c) => (
                              <option key={c.id} value={c.id} className="bg-white text-ink-primary">
                                {c.name} {c.id === 'narrator' ? '(Narrator)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Line Type Badge */}
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                          isNarrator
                            ? 'bg-slate-100 text-ink-secondary'
                            : line.type === 'dialogue'
                            ? 'bg-tertiary-fixed text-tertiary border border-tertiary/20'
                            : 'bg-primary-fixed text-primary border border-primary/20'
                        }`}>
                          {line.type.toUpperCase()}
                        </span>

                        {/* Direction & Tone Indicator */}
                        <span className="font-serif italic text-xs text-ink-muted">
                          [{line.delivery?.emotion || (isNarrator ? 'measured narration cadence' : 'conversational')}]
                        </span>
                      </div>

                      {/* Mini Audition & Quick Action */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleLinePreview(line.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            isPlaying
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-ink-primary border-border-hairline hover:border-slate-300'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                              <span>Audition</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dialogue / Literary Prose Text - Newsreader 19px Typography (DESIGN.md) */}
                    <div className="py-2 pl-1">
                      <p className={`font-serif text-[19px] leading-[32px] select-text ${
                        isNarrator ? 'text-ink-secondary font-normal' : 'text-ink-primary font-medium'
                      }`}>
                        {line.type === 'dialogue' ? `“${line.text.replace(/^[“"]|[”"]$/g, '')}”` : line.text}
                      </p>
                    </div>

                    {/* Trailing Audio Timeline & Duration Bar with Simulated Waveform */}
                    <div className="mt-2.5 pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border-hairline font-mono text-[11px] text-ink-secondary">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Radio className="w-3 h-3 text-primary" />
                          00:0{estSeconds}s
                        </span>
                        <span>{wordCount} words</span>
                        <span className="text-border-hairline">•</span>
                        <span>Voice: {char.voice_id ? char.voice_id.split('-')[2] || char.voice_id : 'Neural Default'}</span>
                      </div>

                      {/* Mini Waveform Canvas Simulation */}
                      <div className="flex items-center gap-1 h-3.5 w-36 opacity-80">
                        <span className={`w-1 h-2 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`w-1 h-3 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-400'}`} />
                        <span className={`w-1 h-1.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`w-1 h-3.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-primary'}`} />
                        <span className={`w-1 h-2.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-primary'}`} />
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className={`w-1 h-3 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-primary'}`} />
                        <span className={`w-1 h-3.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-400'}`} />
                        <span className="w-1 h-1.5 rounded-full bg-slate-200" />
                        <span className={`w-1 h-2 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* RIGHT SIDEBAR: Character Ledger & Entity Resolution (4 of 12 Cols) */}
            <aside className="xl:col-span-4 flex flex-col gap-4 sticky top-20">
              
              {/* Character Ledger Header Card (DESIGN.md Milled Panel) */}
              <div className="rounded-xl bg-white border border-border-hairline p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-secondary" />
                    <h3 className="font-semibold text-sm text-ink-primary font-sans">Character Ledger</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="px-2 py-1 rounded bg-surface-container-low hover:bg-slate-100 text-xs text-primary transition-colors flex items-center gap-1 font-semibold"
                      title="Merge Characters"
                    >
                      <Merge className="w-3 h-3 text-secondary" />
                      <span>Merge</span>
                    </button>
                  </div>
                </div>

                {/* Character List */}
                <div className="space-y-2.5">
                  {script.characters.map((char) => {
                    const isNarrator = char.id === 'narrator';
                    const lineCount = script.lines.filter(l => l.speaker_id === char.id).length;
                    const totalLines = script.lines.length || 1;
                    const percent = Math.round((lineCount / totalLines) * 100);
                    const assignedVoiceId = char.voice_id || (isNarrator ? 'en-US-GuyNeural' : 'en-US-JennyNeural');
                    const isAuditioning = playingVoiceId === assignedVoiceId;

                    return (
                      <div
                        key={char.id}
                        className="rounded-lg bg-surface-container-low border border-border-hairline p-3 flex flex-col gap-2 hover:border-slate-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: char.color_accent || '#006948' }}
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-ink-primary leading-tight font-sans">
                                {char.name}
                              </span>
                              <span className="font-mono text-[10px] text-ink-secondary">
                                {lineCount} lines ({percent}% of chapter)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                              Assigned
                            </span>
                            <button
                              onClick={() => {
                                setEditingCharacter(char);
                                setRenameInput(char.name);
                              }}
                              className="p-1 text-ink-muted hover:text-ink-primary rounded"
                              title="Rename Character"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Voice Engine Spec Pill */}
                        <div className="flex items-center justify-between px-2.5 py-1 rounded bg-white border border-border-hairline font-mono text-[11px] text-ink-secondary">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mic className="w-3 h-3 text-secondary shrink-0" />
                            <select
                              value={assignedVoiceId}
                              onChange={(e) => handleAssignVoice(char.id, e.target.value)}
                              className="bg-transparent text-ink-primary text-[11px] focus:outline-none cursor-pointer truncate max-w-[180px]"
                            >
                              {voices.map((v) => (
                                <option key={v.id} value={v.id} className="bg-white text-ink-primary">
                                  {v.name} ({v.accent})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleVoicePreview(assignedVoiceId)}
                            className="text-primary hover:text-primary-container transition ml-2"
                            title="Audition voice"
                          >
                            {isAuditioning ? (
                              <Square className="w-3 h-3 fill-error text-error" />
                            ) : (
                              <Play className="w-3 h-3 fill-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Character Entity Resolution Alert (DESIGN.md Level 1 Card) */}
              <div className="rounded-xl bg-white border border-border-hairline p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col gap-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Merge className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-bold text-ink-primary font-sans">Entity Merge Suggestion</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary-container text-secondary font-bold">
                    98% Match
                  </span>
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed">
                  Multiple speaking roles exhibit matching semantic cadence and conversational context.
                </p>
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="w-full py-1.5 rounded-lg bg-surface-container-low border border-border-hairline text-ink-primary hover:bg-slate-100 transition-all text-xs font-semibold text-center mt-1"
                >
                  Review & Merge Characters
                </button>
              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* Character Rename Modal */}
      {editingCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border-hairline rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h4 className="text-sm font-bold text-ink-primary mb-2 font-sans">Rename Character</h4>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full bg-surface-container-low border border-border-hairline rounded-lg px-3 py-2 text-xs text-ink-primary mb-4 focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameCharacter}
                className="px-4 py-1.5 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Characters Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border-hairline rounded-2xl p-6 max-w-md w-full shadow-xl space-y-3">
            <h4 className="text-sm font-bold text-ink-primary font-sans">Merge Duplicate Characters</h4>
            <p className="text-xs text-ink-secondary">
              Reassign all spoken lines from a duplicate alias to the target canon character.
            </p>
            <div>
              <label className="text-xs font-mono text-ink-muted block mb-1">Source (Will be merged & removed):</label>
              <select
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="w-full bg-surface-container-low border border-border-hairline rounded-lg p-2 text-xs text-ink-primary"
              >
                <option value="">Select source character...</option>
                {script.characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-ink-muted block mb-1">Target (Keeps all lines):</label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full bg-surface-container-low border border-border-hairline rounded-lg p-2 text-xs text-ink-primary"
              >
                <option value="">Select target character...</option>
                {script.characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeCharacters}
                disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
                className="px-4 py-1.5 bg-primary hover:bg-primary-container disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
