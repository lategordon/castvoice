import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Loader2, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  ChevronDown, 
  ArrowLeft, 
  ArrowRight,
  Wand2
} from 'lucide-react';
import { ScriptDocument, Character, Voice } from '../types/script';

interface VoiceCastingProps {
  script: ScriptDocument;
  onScriptUpdated: (newScript: ScriptDocument) => void;
  onProceedToRender: () => void;
  onBackToScript?: () => void;
}

// Stitch Portrait Avatars
const PORTRAIT_MAP: Record<string, string> = {
  'watson': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3gbd81LxtPr8Lg0qkXPmeOmRYOQxgrJ7_7gs43miZXe6yJnzL1V9okkQISIY1wlo4CvB1lbQIguIlC2UNW0YxuaMrcOb82F_EsX1iP5wmVk9NUP7E_2Kx9lA5CllBMHLW-Imb050NgXak401aKPG-2iLKt_Zf4TfyEXputZfGst7vAGckZp-IQE7AORJCfunJepQLD07plQGFDx8U-WepBukY3I_ROkPOBvdZPzw',
  'dr. john watson': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3gbd81LxtPr8Lg0qkXPmeOmRYOQxgrJ7_7gs43miZXe6yJnzL1V9okkQISIY1wlo4CvB1lbQIguIlC2UNW0YxuaMrcOb82F_EsX1iP5wmVk9NUP7E_2Kx9lA5CllBMHLW-Imb050NgXak401aKPG-2iLKt_Zf4TfyEXputZfGst7vAGckZp-IQE7AORJCfunJepQLD07plQGFDx8U-WepBukY3I_ROkPOBvdZPzw',
  'narrator': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3gbd81LxtPr8Lg0qkXPmeOmRYOQxgrJ7_7gs43miZXe6yJnzL1V9okkQISIY1wlo4CvB1lbQIguIlC2UNW0YxuaMrcOb82F_EsX1iP5wmVk9NUP7E_2Kx9lA5CllBMHLW-Imb050NgXak401aKPG-2iLKt_Zf4TfyEXputZfGst7vAGckZp-IQE7AORJCfunJepQLD07plQGFDx8U-WepBukY3I_ROkPOBvdZPzw',
  'holmes': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqHD-LVk0jXAWMjfd91MY0Gek54lZ-28KN_LOCJQ08TagnDWUsh9bwNYZ2dAp46Hgdgu8faI4TOlJu7zLBNC5AjA7u_qTKP4i6ZcZS0PpLzIdQpazHdVR1kCRzbJB2BsG0vBxNsi3rehzJTk-w0g5zxpL-raCcyEqz8yR5I-prNQzm-UmvxHx4Nv_kZ5D685jze8YkRzx8neiibdjY5maTUhWpFrz8EIG6qEST0Sk',
  'sherlock': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqHD-LVk0jXAWMjfd91MY0Gek54lZ-28KN_LOCJQ08TagnDWUsh9bwNYZ2dAp46Hgdgu8faI4TOlJu7zLBNC5AjA7u_qTKP4i6ZcZS0PpLzIdQpazHdVR1kCRzbJB2BsG0vBxNsi3rehzJTk-w0g5zxpL-raCcyEqz8yR5I-prNQzm-UmvxHx4Nv_kZ5D685jze8YkRzx8neiibdjY5maTUhWpFrz8EIG6qEST0Sk',
  'sherlock holmes': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqHD-LVk0jXAWMjfd91MY0Gek54lZ-28KN_LOCJQ08TagnDWUsh9bwNYZ2dAp46Hgdgu8faI4TOlJu7zLBNC5AjA7u_qTKP4i6ZcZS0PpLzIdQpazHdVR1kCRzbJB2BsG0vBxNsi3rehzJTk-w0g5zxpL-raCcyEqz8yR5I-prNQzm-UmvxHx4Nv_kZ5D685jze8YkRzx8neiibdjY5maTUhWpFrz8EIG6qEST0Sk',
  'count von kramm': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3nTede8ybbcA5IwnqaX1iwXXRdvTdldvdb9QkmTRnARGQaqFCN3Tyiihzm_FAZn_rwVJGA8QldpmjKDcVjtdgeIQUeZZ-r3WS94eTRertorHjV_V35x0LVcGkbsPJvXdAmQzpWTxgG-aDQVWOZoJzuzhtQSIOqvvDcJiXbrL4EkozRp_BBkolApBfbdjpH1Evtn7z3ZuKXZxqFY6Z3_m7itxh8bencAY4pNqn19A',
  'kramm': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3nTede8ybbcA5IwnqaX1iwXXRdvTdldvdb9QkmTRnARGQaqFCN3Tyiihzm_FAZn_rwVJGA8QldpmjKDcVjtdgeIQUeZZ-r3WS94eTRertorHjV_V35x0LVcGkbsPJvXdAmQzpWTxgG-aDQVWOZoJzuzhtQSIOqvvDcJiXbrL4EkozRp_BBkolApBfbdjpH1Evtn7z3ZuKXZxqFY6Z3_m7itxh8bencAY4pNqn19A',
  'irene adler': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuKEz8eTOIVCu38S0tCozx1J3sAKXKIOo6g6G15v8G5Ug-fxZ6LfwSb4vdfznr_0oBxNz3sobmMvDgjgffGsOWh6o0ykMq2b6orTN08it_EtEisNHPjfcdMs3o9T4jhbhgMBPrajqhP5_DfTRXiRN8HRx4Akuyiq3W_qbnDnn68Dh5L7D41B2hYCsRfDuKAPDrEh_MEboYIdUrGoP5_sO9oKfFvcYrAl2cnOq39bg',
  'adler': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuKEz8eTOIVCu38S0tCozx1J3sAKXKIOo6g6G15v8G5Ug-fxZ6LfwSb4vdfznr_0oBxNz3sobmMvDgjgffGsOWh6o0ykMq2b6orTN08it_EtEisNHPjfcdMs3o9T4jhbhgMBPrajqhP5_DfTRXiRN8HRx4Akuyiq3W_qbnDnn68Dh5L7D41B2hYCsRfDuKAPDrEh_MEboYIdUrGoP5_sO9oKfFvcYrAl2cnOq39bg'
};

interface VoiceMetadata {
  displayName: string;
  tag: string;
  description: string;
  accentGroup: 'british' | 'american' | 'international';
  alternates: { name: string; voiceId: string }[];
}

const VOICE_METADATA_MAP: Record<string, VoiceMetadata> = {
  'en-US-GuyNeural': {
    displayName: 'Guy (UK Baritone)',
    tag: 'Warm & Introspective',
    description: 'Classic Victorian literary cadence, high clarity',
    accentGroup: 'british',
    alternates: [
      { name: 'Arthur (Classical BBC)', voiceId: 'en-GB-RyanNeural' },
      { name: 'Miles (Transatlantic)', voiceId: 'en-US-ChristopherNeural' }
    ]
  },
  'en-GB-RyanNeural': {
    displayName: 'Alistair (UK Aristocratic)',
    tag: 'Crisp Tenor',
    description: 'Fast deductions, razor articulation, cold intellectualism',
    accentGroup: 'british',
    alternates: [
      { name: 'Rowan (Dark UK Suspense)', voiceId: 'en-US-ChristopherNeural' },
      { name: 'Guy (Classic Cadence)', voiceId: 'en-US-GuyNeural' }
    ]
  },
  'en-US-ChristopherNeural': {
    displayName: 'Klaus (Austrian Accent)',
    tag: 'Gravity Baritone',
    description: 'Regal timbre, subtle anxiety, aristocratic German cadence',
    accentGroup: 'international',
    alternates: [
      { name: 'Viktor (Slavic Baritone)', voiceId: 'en-US-EricNeural' },
      { name: 'Ryan (Dramatic)', voiceId: 'en-GB-RyanNeural' }
    ]
  },
  'en-GB-SoniaNeural': {
    displayName: 'Sonia (UK Dramatic)',
    tag: 'Velvet Contralto',
    description: 'Sultry poise, sharp wit, operatic control and depth',
    accentGroup: 'british',
    alternates: [
      { name: 'Helena (French/English)', voiceId: 'en-US-JennyNeural' },
      { name: 'Aria (Expressive)', voiceId: 'en-US-AriaNeural' }
    ]
  },
  'en-US-JennyNeural': {
    displayName: 'Jenny (Clear, Engaging)',
    tag: 'Warm Soprano',
    description: 'Lively, natural narrative tone with bright emotional range',
    accentGroup: 'american',
    alternates: [
      { name: 'Sonia (Velvet Contralto)', voiceId: 'en-GB-SoniaNeural' },
      { name: 'Aria (Dynamic)', voiceId: 'en-US-AriaNeural' }
    ]
  },
  'en-US-AriaNeural': {
    displayName: 'Aria (Versatile, Dynamic)',
    tag: 'Expressive Mezzo',
    description: 'Nuanced vocal inflection, great narrative flexibility',
    accentGroup: 'american',
    alternates: [
      { name: 'Jenny (Clear)', voiceId: 'en-US-JennyNeural' },
      { name: 'Sonia (Dramatic)', voiceId: 'en-GB-SoniaNeural' }
    ]
  },
  'en-US-EricNeural': {
    displayName: 'Eric (Thoughtful, Analytical)',
    tag: 'Measured Baritone',
    description: 'Intelligent, deliberate phrasing for academic dialogue',
    accentGroup: 'american',
    alternates: [
      { name: 'Guy (Warm Baritone)', voiceId: 'en-US-GuyNeural' },
      { name: 'Christopher (Deep)', voiceId: 'en-US-ChristopherNeural' }
    ]
  }
};

interface TuningValues {
  pitch: number;
  cadence: number;
  breathiness: number;
}

export const VoiceCasting: React.FC<VoiceCastingProps> = ({
  script,
  onScriptUpdated,
  onProceedToRender,
  onBackToScript
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'unassigned' | 'british'>('all');
  
  // Micro-tuning slider state keyed by character id
  const [tuningState, setTuningState] = useState<Record<string, TuningValues>>({
    'narrator': { pitch: -2, cadence: 0.96, breathiness: 18 }
  });

  // Master ensemble audition playback state
  const [isEnsemblePlaying, setIsEnsemblePlaying] = useState(false);
  const ensembleAudioRef = useRef<HTMLAudioElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleAutoCast = async () => {
    setToastMessage('Auto-casting ensemble with neural voice recommendations...');
    try {
      // Intelligently map characters
      for (const char of script.characters) {
        let recommendedVoice = 'en-US-GuyNeural';
        const lower = char.name.toLowerCase();
        if (char.id === 'narrator' || lower.includes('watson')) {
          recommendedVoice = 'en-US-GuyNeural';
        } else if (lower.includes('holmes') || lower.includes('sherlock')) {
          recommendedVoice = 'en-GB-RyanNeural';
        } else if (lower.includes('adler') || lower.includes('irene') || char.gender_presentation === 'female') {
          recommendedVoice = 'en-GB-SoniaNeural';
        } else if (lower.includes('kramm') || lower.includes('count') || lower.includes('king')) {
          recommendedVoice = 'en-US-ChristopherNeural';
        } else {
          recommendedVoice = 'en-US-EricNeural';
        }

        await fetch(`/api/projects/${script.project_id}/characters/${char.id}/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice_id: recommendedVoice })
        });
      }

      // Fetch fresh script
      const refreshRes = await fetch(`/api/projects/${script.project_id}`);
      if (refreshRes.ok) {
        const freshScript = await refreshRes.json();
        onScriptUpdated(freshScript);
      }
      setToastMessage('Auto-Cast complete: 100% of characters locked with voice profiles.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setToastMessage(null);
    }
  };

  const toggleEnsemblePreview = async () => {
    if (isEnsemblePlaying) {
      if (ensembleAudioRef.current) {
        ensembleAudioRef.current.pause();
      }
      setIsEnsemblePlaying(false);
      return;
    }

    try {
      setIsEnsemblePlaying(true);
      // Audition Guy or Ryan preview
      const res = await fetch('/api/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: 'en-US-GuyNeural' })
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ensembleAudioRef.current = audio;
      audio.onended = () => setIsEnsemblePlaying(false);
      audio.onerror = () => setIsEnsemblePlaying(false);
      await audio.play();
    } catch (e) {
      console.error(e);
      setIsEnsemblePlaying(false);
    }
  };

  // Metrics computation
  const totalCharacters = script.characters.length || 1;
  const assignedCount = script.characters.filter(c => Boolean(c.voice_id)).length;
  const totalWords = script.total_words || script.lines.reduce((acc, l) => acc + l.text.split(/\s+/).length, 0);
  const runtimeMinutesTotal = Math.max(1, totalWords / 145);
  const runtimeMins = Math.floor(runtimeMinutesTotal);
  const runtimeSecs = Math.floor((runtimeMinutesTotal - runtimeMins) * 60);
  const formattedRuntime = `${runtimeMins.toString().padStart(2, '0')}:${runtimeSecs.toString().padStart(2, '0')}`;

  // Character role helper
  const getRoleDetails = (char: Character, index: number) => {
    const lower = char.name.toLowerCase();
    if (char.id === 'narrator' || lower.includes('watson') || lower.includes('narrat')) {
      return {
        roleLabel: 'Narrator',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        archetype: 'Primary Narrator & Observer'
      };
    }
    if (lower.includes('holmes') || lower.includes('sherlock') || index === 0) {
      return {
        roleLabel: 'Protagonist',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        archetype: 'Consulting Detective'
      };
    }
    if (lower.includes('kramm') || lower.includes('count') || lower.includes('king') || lower.includes('client')) {
      return {
        roleLabel: 'Client / King',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        archetype: 'The Bohemian Monarch'
      };
    }
    if (lower.includes('adler') || lower.includes('irene') || char.gender_presentation === 'female') {
      return {
        roleLabel: 'The Woman',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        archetype: 'Contralto Prima Donna'
      };
    }
    return {
      roleLabel: 'Ensemble',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      archetype: 'Character Ensemble'
    };
  };

  // Filtered characters list
  const filteredCharacters = useMemo(() => {
    return script.characters.filter(c => {
      if (filterTab === 'unassigned') {
        return !c.voice_id;
      }
      if (filterTab === 'british') {
        const vId = c.voice_id || (c.id === 'narrator' ? 'en-US-GuyNeural' : 'en-GB-RyanNeural');
        const meta = VOICE_METADATA_MAP[vId];
        return meta?.accentGroup === 'british' || vId.startsWith('en-GB');
      }
      return true;
    });
  }, [script.characters, filterTab]);

  if (loadingVoices) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto w-full bg-surface pb-36">
      <main className="w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Toast Alert Banner if active */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {toastMessage}
            </span>
          </div>
        )}

        {/* Clean Header & Status Overview Card (Stitch: eb88db7162ac4f278e5e0e344db92356) */}
        <div className="bg-white border border-border-hairline rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span>STEP 3 OF 4</span>
              <span className="text-slate-300">•</span>
              <span className="text-ink-secondary">AUDIOBOOK ENSEMBLE</span>
            </div>
            <h1 className="font-serif text-3xl font-medium text-ink-primary tracking-tight">Voice Casting Room</h1>
            <p className="text-sm text-ink-secondary">
              Assign and audition character voices for <span className="font-semibold text-ink-primary">“{script.title}”</span>
            </p>
          </div>

          {/* Clean Metric Status Pill */}
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-lg border border-border-hairline shrink-0">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-xs font-bold text-ink-primary">
                  {assignedCount} / {totalCharacters} Voices Assigned
                </div>
                <div className="text-[11px] text-ink-secondary">
                  {assignedCount >= totalCharacters ? 'Ensemble fully locked' : 'Casting in progress'}
                </div>
              </div>
            </div>
            <div className="h-6 w-px bg-border-hairline"></div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Estimated Runtime</div>
              <div className="font-mono font-semibold text-xs text-ink-primary">~{formattedRuntime} master</div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-border-hairline w-fit">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white text-ink-primary font-semibold shadow-xs border border-border-hairline'
                  : 'text-ink-secondary hover:text-ink-primary font-medium'
              }`}
            >
              All Roles ({totalCharacters})
            </button>
            <button
              onClick={() => setFilterTab('unassigned')}
              className={`px-3.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                filterTab === 'unassigned'
                  ? 'bg-white text-ink-primary font-semibold shadow-xs border border-border-hairline'
                  : 'text-ink-secondary hover:text-ink-primary font-medium'
              }`}
            >
              Unassigned ({Math.max(0, totalCharacters - assignedCount)})
            </button>
            <button
              onClick={() => setFilterTab('british')}
              className={`px-3.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer hidden sm:block ${
                filterTab === 'british'
                  ? 'bg-white text-ink-primary font-semibold shadow-xs border border-border-hairline'
                  : 'text-ink-secondary hover:text-ink-primary font-medium'
              }`}
            >
              British Accents
            </button>
          </div>

          {/* Secondary Action and Primary Advance CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAutoCast}
              className="px-3.5 py-2 rounded-lg bg-white border border-border-hairline text-ink-primary hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-primary" />
              <span>Auto-Cast Recommended</span>
            </button>
            <button
              onClick={onProceedToRender}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Proceed to Render</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Character Casting Grid (Exact Stitch Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCharacters.map((char, index) => {
            const isNarrator = char.id === 'narrator';
            const lineCount = script.lines.filter(l => l.speaker_id === char.id).length;
            const linePercent = Math.round((lineCount / Math.max(1, script.lines.length)) * 100);
            
            // Assigned or default voice
            const assignedVoiceId = char.voice_id || (isNarrator ? 'en-US-GuyNeural' : 'en-GB-RyanNeural');
            const voiceMeta = VOICE_METADATA_MAP[assignedVoiceId] || {
              displayName: assignedVoiceId,
              tag: 'Neural Voice',
              description: 'Clear speech synthesis',
              accentGroup: 'international',
              alternates: [
                { name: 'Guy (UK Baritone)', voiceId: 'en-US-GuyNeural' },
                { name: 'Ryan (UK Aristocratic)', voiceId: 'en-GB-RyanNeural' }
              ]
            };

            const role = getRoleDetails(char, index);
            const lowerName = char.name.toLowerCase();
            const portraitUrl = PORTRAIT_MAP[lowerName] || (isNarrator ? PORTRAIT_MAP['watson'] : null);
            const isLocked = Boolean(char.voice_id);
            const isPlayingThisVoice = playingVoiceId === assignedVoiceId;
            const tuning = tuningState[char.id] || { pitch: isNarrator ? -2 : 0, cadence: isNarrator ? 0.96 : 1.0, breathiness: 15 };

            return (
              <div
                key={char.id}
                className="bg-white border border-border-hairline rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Top Row: Identity & Lines */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border-hairline shrink-0 bg-slate-100 flex items-center justify-center shadow-xs">
                      <div
                        className="w-full h-full flex items-center justify-center font-serif font-bold text-base text-white select-none"
                        style={{ backgroundColor: char.color_accent || '#006948' }}
                      >
                        {char.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').slice(0, 2).toUpperCase()}
                      </div>
                      {portraitUrl && (
                        <img
                          src={portraitUrl}
                          alt={`Portrait of ${char.name}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-semibold text-lg text-ink-primary">
                          {char.name}
                        </h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${role.badgeClass}`}>
                          {role.roleLabel}
                        </span>
                      </div>
                      <div className="text-xs text-ink-secondary mt-0.5">
                        {role.archetype} <span className="text-slate-300">•</span>{' '}
                        <span className="font-medium text-emerald-700">
                          {lineCount} lines ({linePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 shrink-0">
                    <Check className="w-3.5 h-3.5" /> {isLocked ? 'Locked' : 'Active'}
                  </span>
                </div>

                {/* Selected Voice & Audition Strip */}
                <div className="p-3 rounded-lg bg-slate-50 border border-border-hairline flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handlePlayVoicePreview(assignedVoiceId)}
                      disabled={isPlayingThisVoice}
                      className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-colors shadow-xs shrink-0 cursor-pointer"
                      title={`Audition ${voiceMeta.displayName}`}
                    >
                      {isPlayingThisVoice ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-primary">
                          {voiceMeta.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {voiceMeta.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-secondary truncate">
                        {voiceMeta.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                </div>

                {/* Clean Voice Selector Chips (Alternates) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    Alternate:
                  </span>
                  {voiceMeta.alternates.map((alt) => (
                    <button
                      key={alt.voiceId}
                      type="button"
                      onClick={() => handleAssignVoice(char.id, alt.voiceId)}
                      className="px-2.5 py-1 rounded border border-border-hairline hover:border-slate-400 bg-white text-[11px] font-medium text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>{alt.name}</span>
                    </button>
                  ))}
                  {/* Quick Dropdown for all voices */}
                  <select
                    value={assignedVoiceId}
                    onChange={(e) => handleAssignVoice(char.id, e.target.value)}
                    className="text-[11px] bg-white border border-border-hairline text-ink-secondary rounded px-2 py-0.5 ml-auto focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Micro-tuning Accordion */}
                <details className="group border-t border-border-hairline/60 pt-3">
                  <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-ink-secondary hover:text-ink-primary">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-ink-muted" />
                      Micro-Tuning (Pitch, Cadence, Emotion)
                    </span>
                    <ChevronDown className="w-4 h-4 text-ink-muted group-open:rotate-180 transition-transform" />
                  </summary>

                  <div className="grid grid-cols-3 gap-3 pt-3">
                    {/* Pitch */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-ink-secondary font-medium">
                        <span>Pitch</span>
                        <span className="font-mono text-primary">
                          {tuning.pitch > 0 ? `+${tuning.pitch}` : tuning.pitch} st
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-6"
                        max="6"
                        step="1"
                        value={tuning.pitch}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setTuningState(prev => ({
                            ...prev,
                            [char.id]: { ...tuning, pitch: val }
                          }));
                        }}
                        className="w-full accent-primary h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>

                    {/* Cadence */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-ink-secondary font-medium">
                        <span>Cadence</span>
                        <span className="font-mono text-primary">
                          {tuning.cadence.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.70"
                        max="1.30"
                        step="0.02"
                        value={tuning.cadence}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTuningState(prev => ({
                            ...prev,
                            [char.id]: { ...tuning, cadence: val }
                          }));
                        }}
                        className="w-full accent-primary h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>

                    {/* Breathiness / Dynamics */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-ink-secondary font-medium">
                        <span>Dynamics</span>
                        <span className="font-mono text-primary">
                          +{tuning.breathiness}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={tuning.breathiness}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setTuningState(prev => ({
                            ...prev,
                            [char.id]: { ...tuning, breathiness: val }
                          }));
                        }}
                        className="w-full accent-primary h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </main>

      {/* Clean Focused Bottom Action Dock (Stitch Footer) */}
      <footer className="fixed bottom-0 left-0 md:left-60 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-hairline px-6 sm:px-8 py-3.5 shadow-lg flex items-center justify-between gap-4">
        {/* Master Audio Preview Left */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleEnsemblePreview}
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
            title="Play Ensemble Sample"
          >
            {isEnsemblePlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <div>
            <div className="text-xs font-bold text-ink-primary flex items-center gap-1.5">
              <span>Ensemble Preview</span>
              <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                Ready
              </span>
            </div>
            <div className="text-[11px] text-ink-secondary truncate max-w-xs sm:max-w-sm">
              {script.characters.slice(0, 2).map(c => c.name).join(' & ')} • Dialogue Audition
            </div>
          </div>
        </div>

        {/* Waveform Progress Scrubbed */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4">
          <span className="text-xs font-mono font-medium text-primary shrink-0">01:14</span>
          <div className="relative w-full h-7 bg-slate-100 rounded border border-border-hairline overflow-hidden cursor-pointer flex items-center px-1">
            <svg className="w-full h-5" preserveAspectRatio="none" viewBox="0 0 300 20">
              <path
                d="M0,10 L5,6 L10,14 L15,3 L20,17 L25,5 L30,15 L35,9 L40,11 L45,2 L50,18 L55,7 L60,13 L65,7 L70,14 L75,2 L80,19 L85,8 L90,12 L95,5 L100,16 L105,10 L110,10 L115,4 L120,16 L125,6 L130,14 L135,9 L140,11 L145,2 L150,18 L155,7 L160,13 L165,7 L170,14 L175,3 L180,17 L185,8 L190,12 L195,5 L200,15 L205,9 L210,11 L215,6 L220,14 L225,4 L230,16 L235,7 L240,13 L245,7 L250,14 L255,2 L260,18 L265,8 L270,12 L275,5 L280,15 L285,9 L290,11 L295,7 L300,10"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              <path
                d="M0,10 L5,6 L10,14 L15,3 L20,17 L25,5 L30,15 L35,9 L40,11 L45,2 L50,18 L55,7 L60,13 L65,7 L70,14 L75,2 L80,19 L85,8 L90,12 L95,5 L100,16 L105,10 L110,10 L115,4 L120,16 L125,6 L130,14"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute left-[43%] top-0 bottom-0 w-0.5 bg-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary -ml-[2px] -mt-0.5"></div>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-ink-secondary shrink-0">~{formattedRuntime}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {onBackToScript && (
            <button
              type="button"
              onClick={onBackToScript}
              className="px-3.5 py-2 rounded-lg border border-border-hairline bg-white hover:bg-slate-50 text-ink-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Script</span>
            </button>
          )}
          <button
            type="button"
            onClick={onProceedToRender}
            className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Render Full Cast Audio Master ({formattedRuntime})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
