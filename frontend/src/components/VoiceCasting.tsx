import React, { useState, useEffect } from 'react';
import { Mic, Play, Loader2, Check, Sparkles, User, Radio } from 'lucide-react';
import { ScriptDocument, Character, Voice } from '../types/script';

interface VoiceCastingProps {
  script: ScriptDocument;
  onScriptUpdated: (newScript: ScriptDocument) => void;
  onProceedToRender: () => void;
}

export const VoiceCasting: React.FC<VoiceCastingProps> = ({
  script,
  onScriptUpdated,
  onProceedToRender
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

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
  }, []);

  const handlePlayVoicePreview = async (voiceId: string) => {
    try {
      setPlayingVoiceId(voiceId);
      const res = await fetch('/api/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId })
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      await audio.play();
    } catch (e) {
      console.error(e);
      setPlayingVoiceId(null);
    }
  };

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
      console.error(e);
    }
  };

  if (loadingVoices) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto py-8 px-6 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mic className="w-6 h-6 text-emerald-400" />
            Voice Casting & Auditions
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Assign unique neural voices to your narrator and characters. Test voices with the preview button.
          </p>
        </div>

        <button
          onClick={onProceedToRender}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          Proceed to Render & Mix
        </button>
      </div>

      <div className="mt-8 space-y-6">
        {script.characters.map((char) => {
          const isNarrator = char.id === 'narrator';
          const lineCount = script.lines.filter(l => l.speaker_id === char.id).length;
          const assignedVoiceId = char.voice_id || (isNarrator ? 'en-US-GuyNeural' : 'en-GB-RyanNeural');

          return (
            <div
              key={char.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: char.color_accent || '#3B82F6' }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {char.name}
                      {isNarrator && (
                        <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded-full border border-slate-700">
                          Story Narrator
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lineCount} spoken line{lineCount !== 1 ? 's' : ''} in script
                    </p>
                  </div>
                </div>
              </div>

              {/* Voice Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {voices.map((voice) => {
                  const isSelected = assignedVoiceId === voice.id;
                  const isPlaying = playingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => handleAssignVoice(char.id, voice.id)}
                      className={`relative p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/20 border-emerald-500/80 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">{voice.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-400 capitalize">
                              {voice.gender} • {voice.accent}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoicePreview(voice.id);
                          }}
                          disabled={isPlaying}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        >
                          {isPlaying ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              Playing Sample...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              Audition
                            </>
                          )}
                        </button>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {voice.id.split('-')[0]}-{voice.id.split('-')[1]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};
