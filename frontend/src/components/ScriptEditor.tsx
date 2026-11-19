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

  const lowConfidenceCount = script.lines.filter(l => l.confidence === 'low').length;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950">
      {/* LEFT PANEL: Script Lines Review (~65% width) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 border-r border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Script Lines & Dialogue Directing
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review dialogue attribution, delivery notes, and audio effects. Click preview on any line to audition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {playingLineId && (
              <button
                onClick={stopCurrentAudio}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                Stop Preview
              </button>
            )}
            <span className="text-xs text-slate-400 font-medium px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              {script.lines.length} lines total
            </span>
          </div>
        </div>

        {/* Banner for low-confidence warnings */}
        {lowConfidenceCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{lowConfidenceCount} line{lowConfidenceCount > 1 ? 's' : ''}</strong> with ambiguous speaker attribution highlighted below. Review and adjust speakers if needed.
              </span>
            </div>
          </div>
        )}

        {/* Lines List */}
        <div className="space-y-3 pb-24">
          {script.lines.map((line) => {
            const char = characterMap.get(line.speaker_id) || {
              id: line.speaker_id,
              name: line.speaker_id,
              color_accent: '#94A3B8'
            };
            const isNarrator = line.speaker_id === 'narrator';
            const isLowConf = line.confidence === 'low';
            const isPlaying = playingLineId === line.id;

            return (
              <div
                key={line.id}
                className={`p-4 rounded-xl border transition ${
                  isPlaying
                    ? 'bg-surface-container-high border-primary shadow-[0_0_20px_rgba(78,222,163,0.25)]'
                    : isLowConf
                    ? 'bg-error-container/10 border-error/30'
                    : isNarrator
                    ? 'bg-surface-container-low/70 border-outline-variant/30 hover:bg-surface-container-low'
                    : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-outline font-semibold w-7">
                      #{line.line_index + 1}
                    </span>

                    {/* Speaker selector dropdown */}
                    <div className="relative inline-flex items-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full mr-2 shadow-[0_0_8px_rgba(78,222,163,0.4)]"
                        style={{ backgroundColor: char.color_accent || '#4edea3' }}
                      />
                      <select
                        value={line.speaker_id}
                        onChange={(e) => handleSpeakerChange(line.id, e.target.value)}
                        className="bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {script.characters.map((c) => (
                          <option key={c.id} value={c.id} className="bg-surface-container-lowest text-on-surface">
                            {c.name} {c.id === 'narrator' ? '(Narration)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isLowConf && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-error-container/20 text-error border border-error/30">
                        <AlertTriangle className="w-3 h-3" />
                        Ambiguous
                      </span>
                    )}

                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                      {line.type}
                    </span>
                  </div>

                  {/* Single-Line Audio Preview & STOP Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLinePreview(line.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
                        isPlaying
                          ? 'bg-error text-on-error border-error shadow-[0_0_12px_rgba(255,180,171,0.4)]'
                          : 'bg-surface-container-high text-on-surface hover:bg-primary hover:text-on-primary border-outline-variant/30'
                      }`}
                      title={isPlaying ? "Stop audio preview" : "Audition line performance"}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current text-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-primary fill-primary" />
                          <span>Audition</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Line Spoken Text - Newsreader Serif */}
                <p className={`text-[17px] leading-[28px] font-serif ${isNarrator ? 'text-on-surface-variant italic font-normal' : 'text-on-surface font-medium'}`}>
                  {line.text}
                </p>

                {/* Delivery Notes & Sound Cues Bar */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                  {/* Directorial Emotion Tag */}
                  <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-md border border-outline-variant/30">
                    <Volume2 className="w-3 h-3 text-tertiary" />
                    <input
                      type="text"
                      defaultValue={line.delivery?.emotion || ''}
                      placeholder="Add tone/emotion (e.g. whispering, curious)..."
                      onBlur={(e) => handleDeliveryChange(line.id, e.target.value)}
                      className="bg-transparent text-on-surface text-xs focus:outline-none placeholder:text-on-surface-variant/40 w-44"
                    />
                  </div>

                  {/* Sound Cues */}
                  {line.sound_cues && line.sound_cues.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {line.sound_cues.map((cue) => (
                        <span
                          key={cue.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container/20 text-secondary border border-secondary/30 text-[11px] font-mono"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {cue.tag} ({cue.placement})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Voice Casting & Character Ledger (~35% width) */}
      <div className="w-full lg:w-[420px] bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-full overflow-hidden shrink-0">
        {/* Right Header & Proceed CTA */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Voice Casting & Cast
              </h3>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {script.characters.length} cast
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Assign unique neural voices to your hosts, narrator, and characters. Audition voice samples directly.
          </p>

          {/* Proceed to Render CTA */}
          {onProceedToRender && (
            <button
              onClick={onProceedToRender}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition"
            >
              <Sparkles className="w-4 h-4" />
              Proceed to Render & Mix Full Play
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowMergeModal(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              <Merge className="w-3 h-3 text-blue-400" />
              Merge Duplicates
            </button>
          </div>
        </div>

        {/* Character Voice Assignment Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {script.characters.map((char) => {
            const isNarrator = char.id === 'narrator';
            const lineCount = script.lines.filter(l => l.speaker_id === char.id).length;
            const assignedVoiceId = char.voice_id || (isNarrator ? 'en-US-GuyNeural' : 'en-US-JennyNeural');
            const assignedVoice = voices.find(v => v.id === assignedVoiceId);
            const isAuditioning = playingVoiceId === assignedVoiceId;

            return (
              <div
                key={char.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition"
              >
                {/* Character Name & Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: char.color_accent || '#3B82F6' }}
                    />
                    <span className="text-xs font-bold text-white truncate">
                      {char.name}
                    </span>
                    {isNarrator && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Narrator
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {lineCount} lines
                    </span>
                    <button
                      onClick={() => {
                        setEditingCharacter(char);
                        setRenameInput(char.name);
                      }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Rename character"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Voice Selection Dropdown & Audition Preview */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Assigned Voice
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignedVoiceId}
                      onChange={(e) => handleAssignVoice(char.id, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 truncate"
                    >
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.gender}, {v.accent})
                        </option>
                      ))}
                    </select>

                    {/* Audition Play / STOP Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleVoicePreview(assignedVoiceId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition ${
                        isAuditioning
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={isAuditioning ? "Stop audition sample" : "Audition voice sample"}
                    >
                      {isAuditioning ? (
                        <>
                          <Square className="w-3 h-3 fill-red-400 text-red-400" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                          <span>Sample</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Voice description snippet */}
                {assignedVoice && (
                  <p className="text-[10px] text-slate-500 italic truncate">
                    Preview: "{assignedVoice.preview_text}"
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Character Rename Modal */}
        {editingCharacter && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-white mb-2">Rename Character</h4>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mb-3 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameCharacter}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Merge Characters Modal */}
        {showMergeModal && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
            <h4 className="text-xs font-semibold text-white">Merge Duplicate Characters</h4>
            <p className="text-[10px] text-slate-400">
              Reassign all lines from source to target character.
            </p>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Source (Will be deleted):</label>
              <select
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
              >
                <option value="">Select source character...</option>
                {script.characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Target (Keeps lines):</label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
              >
                <option value="">Select target character...</option>
                {script.characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-2.5 py-1 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeCharacters}
                disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
