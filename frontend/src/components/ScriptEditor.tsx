import React, { useState } from 'react';
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
  Loader2 
} from 'lucide-react';
import { ScriptDocument, ScriptLine, Character, SoundCuePlacement } from '../types/script';

interface ScriptEditorProps {
  script: ScriptDocument;
  onScriptUpdated: (newScript: ScriptDocument) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onScriptUpdated }) => {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const characterMap = new Map<string, Character>(script.characters.map(c => [c.id, c]));

  // Play line preview audio
  const handlePlayLinePreview = async (lineId: string) => {
    try {
      setPlayingLineId(lineId);
      const res = await fetch(`/api/voices/preview-line/${script.project_id}/${lineId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingLineId(null);
      audio.onerror = () => setPlayingLineId(null);
      await audio.play();
    } catch (e) {
      console.error(e);
      setPlayingLineId(null);
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

  // Count low confidence lines
  const lowConfidenceCount = script.lines.filter(l => l.confidence === 'low').length;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Main Script Lines View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

        <div className="space-y-3 pb-20">
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
                  isLowConf
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : isNarrator
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 w-8">
                      #{line.line_index + 1}
                    </span>

                    {/* Speaker selector dropdown */}
                    <div className="relative inline-flex items-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={{ backgroundColor: char.color_accent || '#3B82F6' }}
                      />
                      <select
                        value={line.speaker_id}
                        onChange={(e) => handleSpeakerChange(line.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                      >
                        {script.characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.id === 'narrator' ? '(Narration)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isLowConf && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Ambiguous Attribution
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      {line.type}
                    </span>
                  </div>

                  {/* Actions & Single-Line Audio Preview */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayLinePreview(line.id)}
                      disabled={isPlaying}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="Preview this line's audio performance"
                    >
                      {isPlaying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Playing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Line text - 100% Verbatim */}
                <p className={`text-sm leading-relaxed ${isNarrator ? 'text-slate-300 italic font-serif' : 'text-white font-sans'}`}>
                  {line.text}
                </p>

                {/* Directorial & Foley tags */}
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                  {/* Delivery direction editor */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                    <Sliders className="w-3 h-3 text-purple-400" />
                    <input
                      type="text"
                      placeholder="Delivery (e.g. whisper, angry)"
                      value={line.delivery?.emotion || ''}
                      onChange={(e) => handleDeliveryChange(line.id, e.target.value)}
                      className="bg-transparent text-slate-200 placeholder:text-slate-600 focus:outline-none w-48 text-xs"
                    />
                  </div>

                  {/* Sound cues badges */}
                  {line.sound_cues.map((cue) => (
                    <span
                      key={cue.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono"
                    >
                      <Volume2 className="w-3 h-3 text-blue-400" />
                      [{cue.placement}: {cue.tag}]
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar: Character Ledger & Tools */}
      <div className="w-80 border-l border-slate-800 bg-slate-900/40 p-5 overflow-y-auto flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Character Ledger
            </h3>
            <button
              onClick={() => setShowMergeModal(true)}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700"
            >
              <Merge className="w-3 h-3" />
              Merge
            </button>
          </div>

          <div className="space-y-2.5">
            {script.characters.map((char) => {
              const lineCount = script.lines.filter(l => l.speaker_id === char.id).length;
              return (
                <div
                  key={char.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: char.color_accent || '#3B82F6' }}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{char.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {lineCount} line{lineCount !== 1 ? 's' : ''} {char.aliases.length > 0 ? `• alias: ${char.aliases.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingCharacter(char);
                      setRenameInput(char.name);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                    title="Rename character"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Character Rename Modal */}
        {editingCharacter && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-700 rounded-xl">
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
          <div className="mt-4 p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-white">Merge Duplicate Characters</h4>
            <p className="text-[11px] text-slate-400">
              Reassign all lines from the source character to the target character and consolidate aliases.
            </p>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Source (Will be deleted):</label>
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
              <label className="text-[11px] text-slate-500 block mb-1">Target (Keeps lines):</label>
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
