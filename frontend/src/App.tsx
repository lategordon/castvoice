import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileEdit, 
  Mic, 
  PlayCircle, 
  Plus, 
  FolderOpen, 
  Layers, 
  CheckCircle2,
  Radio,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { ScriptDocument, ProjectMetadata } from './types/script';
import { UploadView } from './components/UploadView';
import { ScriptEditor } from './components/ScriptEditor';
import { VoiceCasting } from './components/VoiceCasting';
import { PlayerView } from './components/PlayerView';

export const App: React.FC = () => {
  const getInitialTab = (): 'upload' | 'editor' | 'casting' | 'player' => {
    const hash = window.location.hash.replace('#', '');
    if (['upload', 'editor', 'casting', 'player'].includes(hash)) {
      return hash as any;
    }
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['upload', 'editor', 'casting', 'player'].includes(tab)) {
      return tab as any;
    }
    return 'upload';
  };
  const [activeTab, setActiveTabState] = useState<'upload' | 'editor' | 'casting' | 'player'>(getInitialTab);
  const setActiveTab = (tab: 'upload' | 'editor' | 'casting' | 'player') => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };
  const [currentScript, setCurrentScript] = useState<ScriptDocument | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // Load project list on mount
  const refreshProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !currentScript) {
          loadProject(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const loadProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const doc = await res.json();
        setCurrentScript(doc);
        const hash = window.location.hash.replace('#', '');
        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (!hash && !urlTab) {
          if (doc.lines && doc.lines.length > 0) {
            setActiveTab('editor');
          } else {
            setActiveTab('upload');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProjectCreated = (script: ScriptDocument) => {
    setCurrentScript(script);
    setActiveTab('editor');
    refreshProjects();
  };

  return (
    <div className="flex flex-col h-full bg-surface text-ink-primary antialiased font-sans">
      {/* Top Header / Editorial Audio Studio Bar (DESIGN.md) */}
      <header className="h-16 border-b border-border-hairline bg-white/95 backdrop-blur-md px-6 flex items-center justify-between z-20 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-5">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('upload')}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-ink-primary font-sans">CastVoice</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                Studio Pro
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-border-hairline hidden sm:block" />

          {/* Project Switcher */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border-hairline shadow-xs hover:border-slate-300 transition-colors">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <select
                value={currentScript?.project_id || ''}
                onChange={(e) => loadProject(e.target.value)}
                className="bg-transparent text-ink-primary text-xs font-semibold focus:outline-none max-w-[200px] truncate cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-ink-primary">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Workflow Stepper Tabs (Linear Navigation) */}
        {currentScript && (
          <nav className="hidden xl:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-border-hairline shadow-inner">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'upload' 
                  ? 'bg-white text-primary font-semibold shadow-xs border border-primary/20' 
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-mono">1</span>
              Ingest Prose
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'editor' 
                  ? 'bg-white text-primary font-semibold shadow-xs border border-primary/20' 
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-mono">2</span>
              Script Editor ({currentScript.lines.length})
            </button>

            <button
              onClick={() => setActiveTab('casting')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'casting' 
                  ? 'bg-white text-primary font-semibold shadow-xs border border-primary/20' 
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-mono">3</span>
              Cast Voices ({currentScript.characters.length})
            </button>

            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'player' 
                  ? 'bg-primary text-white font-semibold shadow-xs' 
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-mono">4</span>
              Master Audio
            </button>
          </nav>
        )}

        {/* Right Status Cluster & Action Button */}
        <div className="flex items-center gap-4">
          {/* DSP Engine Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-white px-2.5 py-1 rounded-full border border-border-hairline font-mono text-[11px] text-ink-secondary shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>DSP 48kHz 24-bit</span>
          </div>

          <button
            onClick={() => {
              setCurrentScript(null);
              setActiveTab('upload');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container transition-all shadow-sm text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Story</span>
          </button>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Explorer Left Sidebar (DESIGN.md Level 1 Milled Panel) */}
        {currentScript && (
          <aside className="w-60 bg-white border-r border-border-hairline flex flex-col justify-between p-4 shrink-0 hidden md:flex shadow-[0_1px_3px_rgba(15,23,42,0.02)]">
            <div className="flex flex-col gap-2">
              <div className="px-2 py-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
                  Workspace Explorer
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'editor'
                      ? 'bg-surface-container-low text-primary border-l-2 border-primary shadow-xs'
                      : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                  }`}
                >
                  <FileEdit className="w-4 h-4 text-primary" />
                  <span>Script View</span>
                </button>
                <button
                  onClick={() => setActiveTab('casting')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'casting'
                      ? 'bg-surface-container-low text-primary border-l-2 border-primary shadow-xs'
                      : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                  }`}
                >
                  <Layers className="w-4 h-4 text-secondary" />
                  <span>Cast Roster</span>
                </button>
                <button
                  onClick={() => setActiveTab('casting')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-ink-secondary hover:bg-slate-50 hover:text-ink-primary transition-colors"
                >
                  <Radio className="w-4 h-4 text-tertiary" />
                  <span>SFX & Cues</span>
                </button>
                <button
                  onClick={() => setActiveTab('player')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'player'
                      ? 'bg-surface-container-low text-primary border-l-2 border-primary shadow-xs'
                      : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>DAW Mixer</span>
                </button>
              </nav>
            </div>

            {/* DSP Engine Status Box */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-ink-muted font-semibold">
                  DSP Engine
                </span>
                <span className="font-mono text-[10px] text-primary flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  48kHz 24-bit
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full w-3/4" />
              </div>
            </div>
          </aside>
        )}

        {/* Main Content View Container */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'upload' && (
            <UploadView
              onProjectCreated={handleProjectCreated}
              onSampleLoaded={() => {}}
            />
          )}

          {activeTab === 'editor' && currentScript && (
            <ScriptEditor
              script={currentScript}
              onScriptUpdated={(updated) => setCurrentScript(updated)}
              onProceedToRender={() => setActiveTab('casting')}
            />
          )}

          {activeTab === 'casting' && currentScript && (
            <VoiceCasting
              script={currentScript}
              onScriptUpdated={(updated) => setCurrentScript(updated)}
              onProceedToRender={() => setActiveTab('player')}
              onBackToScript={() => setActiveTab('editor')}
            />
          )}

          {activeTab === 'player' && currentScript && (
            <PlayerView script={currentScript} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
