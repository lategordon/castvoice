import React, { useState } from 'react';
import { 
  Upload, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Radio, 
  Headphones, 
  Layers, 
  ArrowRight,
  User,
  Users,
  Compass
} from 'lucide-react';
import { ScriptDocument } from '../types/script';

interface UploadViewProps {
  onProjectCreated: (script: ScriptDocument) => void;
  onSampleLoaded: () => void;
}

export type ProductionMode = 'podcast_deep_dive' | 'narrated_article' | 'audio_play';
export type PodcastFormat = 'single_episode' | 'multi_part';

export const UploadView: React.FC<UploadViewProps> = ({ onProjectCreated }) => {
  const [inputTab, setInputTab] = useState<'text' | 'url'>('url');
  
  // URL Ingest state
  const [url, setUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlMetadata, setUrlMetadata] = useState<{
    author?: string | null;
    site_name?: string | null;
    reading_time_min?: number;
  } | null>(null);

  // Content state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  
  // Production Mode & Configuration
  const [productionMode, setProductionMode] = useState<ProductionMode>('podcast_deep_dive');
  const [podcastFormat, setPodcastFormat] = useState<PodcastFormat>('single_episode');
  const [host1Name, setHost1Name] = useState('Alex');
  const [host2Name, setHost2Name] = useState('Jordan');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Handle URL Extraction
  const handleFetchUrl = async (targetUrl?: string) => {
    const fetchTarget = targetUrl || url;
    if (!fetchTarget.trim()) {
      setError('Please enter a valid website or article URL.');
      return;
    }

    setIsFetchingUrl(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchTarget })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Could not extract article content from this URL.');
      }

      const data = await res.json();
      setTitle(data.title || 'Extracted Article');
      setText(data.text || '');
      setUrlMetadata({
        author: data.author,
        site_name: data.site_name,
        reading_time_min: data.reading_time_min
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch article from webpage.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleCreateAndAnalyze = async () => {
    if (!text.trim()) {
      setError('Please provide text or fetch a webpage article first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Create project
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title || 'Untitled Audio Project', 
          text: text 
        })
      });

      if (!createRes.ok) throw new Error('Failed to create project');
      const projectMeta = await createRes.json();

      // 2. Trigger analysis with chosen format & mode
      const analyzeRes = await fetch(`/api/projects/${projectMeta.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          force_mock: false,
          adaptation_mode: productionMode,
          podcast_format: podcastFormat,
          host1_name: host1Name,
          host2_name: host2Name
        })
      });

      if (!analyzeRes.ok) {
        const errJson = await analyzeRes.json();
        throw new Error(errJson.detail || 'Audio analysis and adaptation failed.');
      }

      const analyzeData = await analyzeRes.json();
      onProjectCreated(analyzeData.script);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during audio generation.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleStory = () => {
    setTitle('A Scandal in Bohemia');
    setText(`To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.

A slow and heavy step, which had been heard upon the stairs and in the passage, paused immediately outside the door. Then there was a loud and authoritative tap.

"Come in!" said Holmes.

A man entered who could not have been less than six feet six inches in height, with the chest and limbs of a Hercules.

"Pray take a seat," said Holmes. "This is my friend and colleague, Dr. Watson. Whom have I the honour to address?"

"You may address me as the Count Von Kramm, a Bohemian nobleman," the visitor replied in a guttural German accent. "I understand that this gentleman, your friend, is a man of honour and discretion."

I rose to go, but Holmes caught me by the wrist and pushed me back into my chair. "It is both, or none," said he firmly.

The Count shrugged his broad shoulders. "Then, as you will," he said, drawing a heavy sigh. "I must begin by binding you both to absolute secrecy for two years."

"I promise," said Holmes.

"And I," said I.`);
    setProductionMode('audio_play');
    setInputTab('text');
  };

  const loadSampleArticle = () => {
    setTitle('The Architecture of Tomorrow: How Generative Audio Transforms Deep Reading');
    setUrl('https://example.com/future-of-audio-reading');
    setText(`# The Architecture of Tomorrow: How Generative Audio Transforms Deep Reading

By Sarah Jenkins · Technology & Culture Review

In an era of relentless notifications and fractured attention, longform essays and in-depth investigative reports often gather dust in browser bookmark tabs. Readers save fascinating 8,000-word articles with the best of intentions, yet rarely find forty unbroken minutes at a desk to read them through.

## The Cognitive Advantage of Two-Host Dialogue

Recent cognitive studies from media labs suggest a striking phenomenon: when complex conceptual material is presented not as a monotone monologue, but as a conversational exchange between two informed voices, retention rates climb by over 34 percent. 

"The human brain is fundamentally evolved for social eavesdropping and camp-fire debate," notes Dr. Marcus Alvarez, cognitive linguist at Cambridge. "When Host A raises a skeptical query and Host B unpacks the underlying mechanism using a relatable analogy, the listener's brain actively participates in the resolution."

## Beyond Simple Text-to-Speech

Traditional screen-readers read words sequentially, but they treat every sentence with identical emotional weight. In contrast, conversational generative audio identifies:
- The core thesis versus supporting background.
- Tension, counter-arguments, and surprising statistics.
- Natural musical pauses, topic transition stingers, and chapter signposts.

Whether during an evening run, a morning commute, or while preparing dinner, longform reading is liberated from the glowing screen. Knowledge ceases to be a chore on a reading list, and becomes an intimate, engaging conversation.`);
    setUrlMetadata({
      author: 'Sarah Jenkins',
      site_name: 'Tech & Culture Review',
      reading_time_min: 3
    });
    setProductionMode('podcast_deep_dive');
    setInputTab('url');
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
    setInputTab('text');
  };

  return (
    <div className="h-full overflow-y-auto w-full bg-surface">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 pb-36">
        {/* Stitch Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-primary border border-primary/20 shadow-[0_0_12px_rgba(78,222,163,0.15)] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            CastVoice Studio Pro • AI Audio Adaptation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface font-sans">
            Transform Web Articles & Prose into Full-Cast Audio
          </h1>
          <p className="mt-2 text-on-surface-variant max-w-2xl mx-auto text-sm leading-relaxed">
            Import any article URL or paste longform fiction. CastVoice automatically dissects dialogue, attributes characters, attaches delivery cues, and mixes Foley sound effects.
          </p>
        </div>

      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Step 1: Input Source Selector Tabs */}
        <div>
          <div className="flex border-b border-outline-variant/30 gap-2 mb-4">
            <button
              onClick={() => setInputTab('url')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                inputTab === 'url'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Globe className="w-4 h-4" />
              Import Webpage URL
            </button>
            <button
              onClick={() => setInputTab('text')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                inputTab === 'text'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Paste Story Prose / Upload File
            </button>
          </div>

          {/* URL Tab Content */}
          {inputTab === 'url' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://substack.com/... or https://medium.com/... or any article URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchUrl()}
                  disabled={isFetchingUrl || !url.trim()}
                  className="px-5 py-3 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-[0_0_16px_rgba(78,222,163,0.25)]"
                >
                  {isFetchingUrl ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                      Fetching Article...
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      Fetch Article
                    </>
                  )}
                </button>
              </div>

              {/* Sample link helper */}
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Supports Substacks, blogs, Medium, news articles, and long essays.</span>
                <button
                  onClick={loadSampleArticle}
                  className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Load Sample Longform Article
                </button>
              </div>

              {/* Extracted Metadata Card */}
              {urlMetadata && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{title}</span>
                    {urlMetadata.author && <span>by {urlMetadata.author}</span>}
                    {urlMetadata.site_name && <span className="text-slate-500">({urlMetadata.site_name})</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium">
                      {wordCount.toLocaleString()} words • ~{urlMetadata.reading_time_min} min read
                    </span>
                    <button
                      onClick={handleCreateAndAnalyze}
                      disabled={isAnalyzing || !text.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-950/40"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Create Audio Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Tab Content */}
          {inputTab === 'text' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A Scandal in Bohemia"
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
                    Load Sample Fiction
                  </button>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Upload File
                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Text Area (Editable in both modes) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Article & Prose Content
            </label>
            <span className={`text-xs ${wordCount > 5000 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
              {wordCount.toLocaleString()} words
            </span>
          </div>
          <textarea
            rows={inputTab === 'url' && text ? 4 : 8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Article or story prose will appear here automatically, or you can paste your content directly..."
            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 text-sm text-on-surface leading-relaxed font-serif placeholder:font-sans placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary shadow-inner resize-y"
          />
        </div>

        {/* Step 2: Choose Audio Production Style */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Choose Audio Format & Style
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option 1: 2-Host Conversational Podcast */}
            <button
              type="button"
              onClick={() => setProductionMode('podcast_deep_dive')}
              className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                productionMode === 'podcast_deep_dive'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  {productionMode === 'podcast_deep_dive' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">2-Host Podcast</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  NotebookLM style: two AI hosts debate, unpack, and banter through the topic with music cues.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-medium text-emerald-400">
                Best for articles & essays
              </div>
            </button>

            {/* Option 2: Chaptered Audio Article */}
            <button
              type="button"
              onClick={() => setProductionMode('narrated_article')}
              className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                productionMode === 'narrated_article'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Headphones className="w-5 h-5" />
                  </div>
                  {productionMode === 'narrated_article' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">Chaptered Audio Article</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Audiobook narration split into chapters with section stingers and voiced quotes for experts.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-medium text-blue-400">
                Best for comprehensive reading
              </div>
            </button>

            {/* Option 3: Full-Cast Audio Play */}
            <button
              type="button"
              onClick={() => setProductionMode('audio_play')}
              className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                productionMode === 'audio_play'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  {productionMode === 'audio_play' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">Full-Cast Audio Drama</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  100% verbatim dialogue and narrative extraction with full Foley sound effects library.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-medium text-purple-400">
                Best for fiction & stories
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Format Specific Options */}
        {(productionMode === 'podcast_deep_dive' || productionMode === 'narrated_article') && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Episode Structure & Length
                </span>
                <p className="text-[11px] text-slate-500">
                  Choose how longform content is divided into audio tracks
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPodcastFormat('single_episode')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    podcastFormat === 'single_episode'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚡ Single Focused Episode
                </button>
                <button
                  type="button"
                  onClick={() => setPodcastFormat('multi_part')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    podcastFormat === 'multi_part'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📚 Multi-Part Series
                </button>
              </div>
            </div>

            {/* Host customization for 2-host podcast */}
            {productionMode === 'podcast_deep_dive' && (
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-slate-400 font-medium">Host Personas:</span>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-500">Host 1:</span>
                  <input
                    type="text"
                    value={host1Name}
                    onChange={(e) => setHost1Name(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                    placeholder="Alex"
                  />
                  <span className="text-[10px] text-slate-500">(Curious)</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-slate-500">Host 2:</span>
                  <input
                    type="text"
                    value={host2Name}
                    onChange={(e) => setHost2Name(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                    placeholder="Jordan"
                  />
                  <span className="text-[10px] text-slate-500">(Analytical)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button & Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {productionMode === 'podcast_deep_dive' && 'Includes intro theme, section transitions, host chemistry & outro music'}
              {productionMode === 'narrated_article' && 'Chaptered audio with melodic section stingers & character-voiced quotes'}
              {productionMode === 'audio_play' && '100% Verbatim preservation verified with automated word diff'}
            </span>
          </div>

          <button
            onClick={handleCreateAndAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm rounded-xl shadow-[0_0_24px_rgba(78,222,163,0.35)] transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {productionMode === 'podcast_deep_dive' && 'Synthesizing Podcast Deep Dive...'}
                {productionMode === 'narrated_article' && 'Structuring Chaptered Narration...'}
                {productionMode === 'audio_play' && 'Analyzing Script & Attributing Speakers...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {productionMode === 'podcast_deep_dive' && 'Create 2-Host Podcast'}
                {productionMode === 'narrated_article' && 'Create Chaptered Audio'}
                {productionMode === 'audio_play' && 'Create Full-Cast Script'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
