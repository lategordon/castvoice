import React, { useState } from 'react';
import { Upload, Sparkles, BookOpen, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { ScriptDocument } from '../types/script';

interface UploadViewProps {
  onProjectCreated: (script: ScriptDocument) => void;
  onSampleLoaded: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onProjectCreated, onSampleLoaded }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleCreateAndAnalyze = async (sampleText?: string, sampleTitle?: string) => {
    const storyText = sampleText || text;
    const storyTitle = sampleTitle || title || 'Untitled Story';

    if (!storyText.trim()) {
      setError('Please paste your story prose or load the sample story.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Create project
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: storyTitle, text: storyText })
      });

      if (!createRes.ok) throw new Error('Failed to create project');
      const projectMeta = await createRes.json();

      // 2. Trigger analysis
      const analyzeRes = await fetch(`/api/projects/${projectMeta.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_mock: false })
      });

      if (!analyzeRes.ok) {
        const errJson = await analyzeRes.json();
        throw new Error(errJson.detail || 'Script analysis failed');
      }

      const analyzeData = await analyzeRes.json();
      onProjectCreated(analyzeData.script);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleStory = async () => {
    try {
      const res = await fetch('/data/samples/scandal_in_bohemia_excerpt.txt').catch(() => null);
      let sample = '';
      if (res && res.ok) {
        sample = await res.text();
      } else {
        // Fallback embedded sample if path not directly reachable via static
        sample = `To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.

A slow and heavy step, which had been heard upon the stairs and in the passage, paused immediately outside the door. Then there was a loud and authoritative tap.

"Come in!" said Holmes.

A man entered who could not have been less than six feet six inches in height, with the chest and limbs of a Hercules.

"Pray take a seat," said Holmes. "This is my friend and colleague, Dr. Watson. Whom have I the honour to address?"

"You may address me as the Count Von Kramm, a Bohemian nobleman," the visitor replied in a guttural German accent. "I understand that this gentleman, your friend, is a man of honour and discretion."

I rose to go, but Holmes caught me by the wrist and pushed me back into my chair. "It is both, or none," said he firmly.

The Count shrugged his broad shoulders. "Then, as you will," he said, drawing a heavy sigh. "I must begin by binding you both to absolute secrecy for two years."

"I promise," said Holmes.

"And I," said I.`;
      }
      setTitle('A Scandal in Bohemia');
      setText(sample);
    } catch {
      setError('Could not load sample file.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Full-Cast Audio Play Generator for Authors
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Turn Your Prose into a Full-Cast Audio Play
        </h1>
        <p className="mt-2 text-slate-400 max-w-xl mx-auto text-sm">
          Paste your chapter or short story. CastVoice extracts characters, separates dialogue from narration 
          with 100% verbatim fidelity, attaches delivery cues, and mixes Foley sound effects.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-800">
          <div className="w-full sm:w-1/2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Story / Chapter Title
            </label>
            <input
              type="text"
              placeholder="e.g. A Scandal in Bohemia, Chapter 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadSampleStory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Load Sample Story
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Upload .txt/.md
              <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Prose Text (Up to ~5,000 words)
            </label>
            <span className={`text-xs ${wordCount > 5000 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
              {wordCount.toLocaleString()} words
            </span>
          </div>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your story prose here. Include dialogue tags, narration, and action. CastVoice will convert it into a full multi-speaker script without changing a single word."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-y"
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Verbatim preservation verified with automated word diff</span>
          </div>

          <button
            onClick={() => handleCreateAndAnalyze()}
            disabled={isAnalyzing || !text.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20 transition"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Script & Attributing Speakers...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Prose & Create Script
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
