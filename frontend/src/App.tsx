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
  CheckCircle2 
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
        // If projects exist and no current script is loaded, load the most recent project
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top Header / Nav */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('upload')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">CastVoice</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">MVP</span>
            </div>
          </div>

          {/* Project Switcher */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <select
                value={currentScript?.project_id || ''}
                onChange={(e) => loadProject(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Workflow Steps Tabs */}
        {currentScript && (
          <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'upload' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. Story Text
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'editor' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              2. Review Script ({currentScript.lines.length})
            </button>

            <button
              onClick={() => setActiveTab('casting')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'casting' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              3. Cast Voices ({currentScript.characters.length})
            </button>

            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'player' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              4. Render & Play
            </button>
          </div>
        )}

        {/* New Story Action */}
        <button
          onClick={() => {
            setCurrentScript(null);
            setActiveTab('upload');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          New Story
        </button>
      </header>

      {/* Main Content Area */}
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
