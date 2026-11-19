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
  const [activeTab, setActiveTab] = useState<'upload' | 'editor' | 'casting' | 'player'>('upload');
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
        if (doc.lines && doc.lines.length > 0) {
          setActiveTab('editor');
        } else {
          setActiveTab('upload');
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
    <div className="flex flex-col h-full bg-surface text-on-surface antialiased font-sans">
      {/* Top Header / Stitch Studio Pro Bar */}
      <header className="h-16 border-b border-outline-variant/40 bg-surface-container-lowest/90 backdrop-blur-xl px-6 flex items-center justify-between z-20 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('upload')}>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center shadow-[0_0_12px_rgba(78,222,163,0.25)]">
              <Sparkles className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-on-surface font-sans">CastVoice</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-primary border border-primary/20 shadow-[0_0_8px_rgba(78,222,163,0.15)] font-semibold">
                Studio Pro
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-outline-variant/40 hidden sm:block" />

          {/* Project Switcher */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high transition-colors">
              <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_rgba(76,215,246,0.6)]" />
              <select
                value={currentScript?.project_id || ''}
                onChange={(e) => loadProject(e.target.value)}
                className="bg-transparent text-on-surface text-xs font-semibold focus:outline-none max-w-[200px] truncate cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-container-lowest text-on-surface">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Workflow Stepper Tabs (Stitch Linear Navigation) */}
        {currentScript && (
          <nav className="hidden xl:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/30 shadow-inner">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'upload' 
                  ? 'bg-surface-container text-on-surface font-semibold shadow-[0_0_12px_rgba(78,222,163,0.2)] text-primary border border-primary/20' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-container-high text-[10px] flex items-center justify-center font-mono">1</span>
              Ingest Prose
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'editor' 
                  ? 'bg-surface-container text-on-surface font-semibold shadow-[0_0_12px_rgba(78,222,163,0.2)] text-primary border border-primary/20' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-container-high text-[10px] flex items-center justify-center font-mono">2</span>
              Script Editor ({currentScript.lines.length})
            </button>

            <button
              onClick={() => setActiveTab('casting')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'casting' 
                  ? 'bg-surface-container text-on-surface font-semibold shadow-[0_0_12px_rgba(78,222,163,0.2)] text-primary border border-primary/20' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-container-high text-[10px] flex items-center justify-center font-mono">3</span>
              Cast Voices ({currentScript.characters.length})
            </button>

            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTab === 'player' 
                  ? 'bg-primary-container text-white font-semibold shadow-[0_0_16px_rgba(78,222,163,0.3)]' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-surface-container-high text-[10px] flex items-center justify-center font-mono">4</span>
              Master Audio
            </button>
          </nav>
        )}

        {/* Right Status Cluster & Action Button */}
        <div className="flex items-center gap-4">
          {/* DSP Engine Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-surface-container-low px-2.5 py-1 rounded-full border border-outline-variant/30 font-mono text-[11px] text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
            <span>DSP 48kHz 24-bit</span>
          </div>

          <button
            onClick={() => {
              setCurrentScript(null);
              setActiveTab('upload');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container text-primary border border-primary/40 hover:bg-primary-container hover:text-white transition-all shadow-[0_0_16px_rgba(78,222,163,0.18)] text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Story</span>
          </button>
        </div>
      </header>

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
          />
        )}

        {activeTab === 'casting' && currentScript && (
          <VoiceCasting
            script={currentScript}
            onScriptUpdated={(updated) => setCurrentScript(updated)}
            onProceedToRender={() => setActiveTab('player')}
          />
        )}

        {activeTab === 'player' && currentScript && (
          <PlayerView script={currentScript} />
        )}
      </main>
    </div>
  );
};

export default App;
