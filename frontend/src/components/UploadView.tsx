import React, { useState, useRef } from 'react';
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
  Zap,
  Search,
  PenTool,
  FileCode,
  Check,
  FileText,
  X
} from 'lucide-react';
import { ScriptDocument } from '../types/script';

interface UploadViewProps {
  onProjectCreated: (script: ScriptDocument) => void;
  onSampleLoaded?: () => void;
}

export type ProductionMode = 'podcast_deep_dive' | 'narrated_article' | 'audio_play';
export type PodcastFormat = 'single_episode' | 'multi_part';
export type ArticleType = 'longform' | 'news' | 'investigative' | 'editorial' | 'technical';

export interface ArticleTypeOption {
  id: ArticleType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  wpm: string;
  recommendedMode: ProductionMode;
}

const ARTICLE_TYPES: ArticleTypeOption[] = [
  {
    id: 'longform',
    title: 'Longform',
    icon: BookOpen,
    wpm: '~135 WPM',
    recommendedMode: 'podcast_deep_dive'
  },
  {
    id: 'news',
    title: 'News',
    icon: Zap,
    wpm: '~170 WPM',
    recommendedMode: 'narrated_article'
  },
  {
    id: 'investigative',
    title: 'Investigative',
    icon: Search,
    wpm: '~145 WPM',
    recommendedMode: 'podcast_deep_dive'
  },
  {
    id: 'editorial',
    title: 'Opinion',
    icon: PenTool,
    wpm: '~140 WPM',
    recommendedMode: 'podcast_deep_dive'
  },
  {
    id: 'technical',
    title: 'Whitepaper',
    icon: FileCode,
    wpm: '~130 WPM',
    recommendedMode: 'narrated_article'
  }
];

export const UploadView: React.FC<UploadViewProps> = ({ onProjectCreated }) => {
  const [inputTab, setInputTab] = useState<'url' | 'text' | 'file'>('url');
  
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
  
  // Article Type & Production Mode (Compact Stitch Specification)
  const [articleType, setArticleType] = useState<ArticleType>('longform');
  const [productionMode, setProductionMode] = useState<ProductionMode>('podcast_deep_dive');
  const [podcastFormat, setPodcastFormat] = useState<PodcastFormat>('single_episode');
  const [host1Name, setHost1Name] = useState('Alex');
  const [host2Name, setHost2Name] = useState('Jordan');

  // File Upload State
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Handle URL Extraction with robust error handling
  const handleFetchUrl = async (targetUrl?: string) => {
    const fetchTarget = targetUrl || url;
    if (!fetchTarget.trim()) {
      setError('Please enter a valid website or article URL.');
      return;
    }

    setIsFetchingUrl(true);
    setError(null);
    setUploadSuccessMessage(null);

    try {
      const res = await fetch('/api/projects/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchTarget })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Could not extract article content from this URL.');
      }

      setTitle(data.title || 'Extracted Article');
      setText(data.text || '');
      setUrlMetadata({
        author: data.author,
        site_name: data.site_name,
        reading_time_min: data.reading_time_min
      });
      setUploadSuccessMessage(`Successfully extracted article: "${data.title || 'Web Article'}" (${(data.word_count || 0).toLocaleString()} words)`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch article from webpage.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Robust File Parser supporting .txt, .md, .pdf, .docx
  const handleProcessFile = async (file: File) => {
    setIsUploadingFile(true);
    setError(null);
    setUploadSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/projects/parse-document', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const extractedTitle = data.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const extractedText = data.text || '';
        
        if (!extractedText.trim()) {
          throw new Error('The uploaded document appears to be empty.');
        }

        setTitle(extractedTitle);
        setText(extractedText);
        setUploadSuccessMessage(`Imported "${file.name}" (${(data.word_count || extractedText.split(/\s+/).length).toLocaleString()} words)`);
      } else {
        // Fallback for plain text files in browser
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['txt', 'md', 'markdown', 'json'].includes(ext || '')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
            setText(content || '');
            setUploadSuccessMessage(`Imported "${file.name}" (${(content.split(/\s+/).length || 0).toLocaleString()} words)`);
          };
          reader.readAsText(file);
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Could not parse file "${file.name}". Please ensure it is a valid .pdf, .docx, .txt, or .md file.`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleCreateAndAnalyze = async () => {
    if (!text.trim()) {
      setError('Please provide text, import a URL, or upload a document first.');
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

      // 2. Trigger analysis with chosen format, mode, and article type
      const analyzeRes = await fetch(`/api/projects/${projectMeta.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          force_mock: false,
          adaptation_mode: productionMode,
          podcast_format: podcastFormat,
          host1_name: host1Name,
          host2_name: host2Name,
          article_type: articleType
        })
      });

      if (!analyzeRes.ok) {
        const errJson = await analyzeRes.json().catch(() => ({}));
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

  // Sample Loaders
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
    setArticleType('longform');
    setError(null);
    setUploadSuccessMessage('Loaded sample fiction: "A Scandal in Bohemia"');
  };

  const loadSampleArticle = (type: ArticleType) => {
    setError(null);
    setArticleType(type);

    if (type === 'news') {
      setTitle('Global Maritime Trade Pact Finalized at Geneva Summit');
      setText(`GENEVA — Representatives from 42 maritime nations today signed the International Resilient Shipping Protocol, establishing zero-tariff maritime green corridors across the North Atlantic and Pacific shipping lanes.

The agreement, negotiated over 18 months of intensive diplomatic rounds, mandates automated customs clearance through verified digital freight ledgers and eliminates port docking demurrage surcharges for electrified transport carriers.

"This framework represents the most consequential reform of oceanic cargo coordination since the 1982 Law of the Sea Convention," announced Director General Elena Vane. "By standardizing sensor telemetry across automated container terminals, average clearance times will decline from 36 hours to under 45 minutes."

Implementation begins across primary European and North American ports on October 1st, with Asian hubs joining the synchronized protocol in early 2027.`);
      setProductionMode('narrated_article');
      setUploadSuccessMessage('Loaded sample news bulletin');
    } else if (type === 'investigative') {
      setTitle('The Silicon River: Inside Secret Land Deals Powering AI Data Centers');
      setText(`By David Sterling and Michelle Chen

Behind non-disclosure agreements and Delaware shell entities, utility consortiums have acquired over 14,000 acres of agricultural watershed across the American Midwest. Public records obtained across six county boards reveal that over 3.2 gigawatts of baseline hydroelectric generation have been quietly earmarked for hyper-scale cluster facilities.

Internal email records show local municipal water boards granted 20-year subterranean aquifer extraction rights without public hearings. When confronted with municipal pump records, regional executives acknowledged that cooling loop consumption would exceed previous municipal projections by a factor of four.`);
      setProductionMode('podcast_deep_dive');
      setUploadSuccessMessage('Loaded sample investigative report');
    } else if (type === 'technical') {
      setTitle('Formal Verification of Low-Latency Audio Streaming Buffers in Distributed DSP');
      setText(`Abstract: Modern cloud audio synthesis environments demand sub-15ms round-trip buffer synchronization across neural TTS inference pipelines. We present an inductive invariant verification framework for zero-lock ring buffers operating under POSIX real-time scheduling constraints.

1. Introduction and Memory Model
Consider a circular buffer queue Q with bounded capacity N. Concurrent producers stream float32 PCM frames sampled at 48kHz / 24-bit resolution, while the audio mixer worker reads atomic blocks with strict boundary guarantees.`);
      setProductionMode('narrated_article');
      setUploadSuccessMessage('Loaded sample technical whitepaper');
    } else {
      setTitle('The Architecture of Tomorrow: How Generative Audio Transforms Deep Reading');
      setText(`In an era of relentless notifications and fractured attention, longform essays and in-depth investigative reports often gather dust in browser bookmark tabs. Readers save fascinating 8,000-word articles with the best of intentions, yet rarely find forty unbroken minutes at a desk to read them through.

Recent cognitive studies from media labs suggest a striking phenomenon: when complex conceptual material is presented not as a monotone monologue, but as a conversational exchange between two informed voices, retention rates climb by over 34 percent.

Traditional screen-readers read words sequentially, but conversational generative audio identifies the core thesis, tension, natural musical pauses, and chapter signposts.`);
      setProductionMode('podcast_deep_dive');
      setUploadSuccessMessage('Loaded sample longform essay');
    }
  };

  return (
    <div className="h-full overflow-y-auto w-full bg-surface">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 pb-32">
        {/* Editorial Subheader Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            CastVoice Studio Pro • Ingest & Narrative Staging
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-ink-primary">
            Transform Web Articles & Manuscripts into Audio
          </h1>
          <p className="mt-1 text-ink-secondary max-w-xl mx-auto text-xs leading-relaxed">
            Import any URL, upload a file (.pdf, .docx, .txt, .md), or paste prose. CastVoice adapts narrative pacing and casts full-cast audio.
          </p>
        </div>

      <div className="bg-white border border-border-hairline rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Input Source Selector Tabs (URL / Upload File / Paste Text) */}
        <div>
          <div className="flex items-center justify-between border-b border-border-hairline gap-2 mb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInputTab('url')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  inputTab === 'url'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Import Webpage URL
              </button>
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  inputTab === 'file'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload File (.pdf, .docx, .txt)
              </button>
              <button
                type="button"
                onClick={() => setInputTab('text')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  inputTab === 'text'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Paste Text / Manuscript
              </button>
            </div>

            {/* Quick Sample Links */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Samples:</span>
              <button
                type="button"
                onClick={() => loadSampleArticle('longform')}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Longform
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => loadSampleArticle('news')}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                News
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={loadSampleStory}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Fiction
              </button>
            </div>
          </div>

          {/* 1. URL Ingest Tab */}
          {inputTab === 'url' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://substack.com/... or https://medium.com/... or any news article URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  className="flex-1 bg-white border border-border-hairline rounded-lg px-3.5 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-primary shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleFetchUrl()}
                  disabled={isFetchingUrl || !url.trim()}
                  className="px-4 py-2 bg-primary text-white hover:bg-primary-container disabled:opacity-50 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                >
                  {isFetchingUrl ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Fetch Article
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 2. File Upload Tab */}
          {inputTab === 'file' && (
            <div className="space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-hairline hover:border-primary/50 bg-slate-50/60 hover:bg-emerald-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.pdf,.docx,.doc"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-9 h-9 rounded-full bg-white border border-border-hairline text-primary mx-auto flex items-center justify-center mb-2 shadow-2xs">
                  {isUploadingFile ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </div>
                <p className="text-xs font-semibold text-ink-primary">
                  {isUploadingFile ? 'Parsing document text...' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Supports PDF (.pdf), Microsoft Word (.docx), Markdown (.md), and Plain Text (.txt)
                </p>
              </div>
            </div>
          )}

          {/* 3. Text Tab */}
          {inputTab === 'text' && (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                placeholder="Story or article title (e.g. A Scandal in Bohemia)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 bg-white border border-border-hairline rounded-lg px-3 py-1.5 text-xs text-ink-primary focus:outline-none focus:border-primary shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Success or Error Notice Banner */}
        {uploadSuccessMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                {error.includes('403') && (
                  <p className="text-[11px] text-red-600 mt-1">
                    Tip: Copy and paste the article text or upload a document using the tabs above.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Text Area (Compact, Editable) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Article & Manuscript Content
            </label>
            <span className={`text-[11px] font-mono ${wordCount > 5000 ? 'text-amber-600 font-semibold' : 'text-ink-muted'}`}>
              {wordCount.toLocaleString()} words
            </span>
          </div>
          <textarea
            rows={inputTab === 'url' && text ? 3 : 5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Article or story prose will appear here automatically, or you can paste your content directly..."
            className="w-full bg-white border border-border-hairline rounded-lg p-3 text-xs text-ink-primary leading-relaxed font-serif placeholder:font-sans placeholder:text-ink-muted/50 focus:outline-none focus:border-primary shadow-2xs resize-y"
          />
        </div>

        {/* REFINED COMPACT SECTION 1: ARTICLE TYPE & PACE (Stitch Screen 1 Specification) */}
        <div className="pt-2 border-t border-border-hairline space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Article Type & Pace
            </span>
            <span className="text-[11px] text-ink-muted font-mono">
              Speech cadence benchmark
            </span>
          </div>

          {/* Compact 5-Chip Grid (No long paragraphs, approx 36px height) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ARTICLE_TYPES.map((type) => {
              const IconComp = type.icon;
              const isSelected = articleType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setArticleType(type.id);
                    setProductionMode(type.recommendedMode);
                  }}
                  className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-emerald-50 border border-emerald-600 text-emerald-800 font-semibold'
                      : 'bg-white border border-border-hairline hover:border-slate-300 text-ink-secondary hover:text-ink-primary font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-ink-muted'}`} />
                    <span className="text-xs truncate">{type.title}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    isSelected 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-100 text-ink-muted'
                  }`}>
                    {type.wpm}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* REFINED COMPACT SECTION 2: AUDIO PRESENTATION FORMAT (Stitch Specification) */}
        <div className="pt-2 border-t border-border-hairline space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Audio Presentation Format
            </span>
            <span className="text-[11px] text-ink-muted">
              Acoustic staging
            </span>
          </div>

          {/* Compact 3-Option Row (Approx 42px height, single-line tags) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. 2-Host Podcast */}
            <button
              type="button"
              onClick={() => setProductionMode('podcast_deep_dive')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer shadow-2xs ${
                productionMode === 'podcast_deep_dive'
                  ? 'bg-emerald-50/50 border-2 border-emerald-600 text-ink-primary'
                  : 'bg-white border border-border-hairline hover:border-slate-300 text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${productionMode === 'podcast_deep_dive' ? 'text-primary' : 'text-ink-muted'}`} />
                <span className="text-xs font-semibold">2-Host Podcast</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                productionMode === 'podcast_deep_dive'
                  ? 'text-emerald-700 bg-emerald-100/80 font-semibold'
                  : 'text-ink-muted bg-slate-100'
              }`}>
                Banter flow
              </span>
            </button>

            {/* 2. Chaptered Narration */}
            <button
              type="button"
              onClick={() => setProductionMode('narrated_article')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer shadow-2xs ${
                productionMode === 'narrated_article'
                  ? 'bg-emerald-50/50 border-2 border-emerald-600 text-ink-primary'
                  : 'bg-white border border-border-hairline hover:border-slate-300 text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Headphones className={`w-4 h-4 ${productionMode === 'narrated_article' ? 'text-primary' : 'text-ink-muted'}`} />
                <span className="text-xs font-semibold">Chaptered Narration</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                productionMode === 'narrated_article'
                  ? 'text-emerald-700 bg-emerald-100/80 font-semibold'
                  : 'text-ink-muted bg-slate-100'
              }`}>
                Solo timbre
              </span>
            </button>

            {/* 3. Full-Cast Drama */}
            <button
              type="button"
              onClick={() => setProductionMode('audio_play')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer shadow-2xs ${
                productionMode === 'audio_play'
                  ? 'bg-emerald-50/50 border-2 border-emerald-600 text-ink-primary'
                  : 'bg-white border border-border-hairline hover:border-slate-300 text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${productionMode === 'audio_play' ? 'text-primary' : 'text-ink-muted'}`} />
                <span className="text-xs font-semibold">Full-Cast Drama</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                productionMode === 'audio_play'
                  ? 'text-emerald-700 bg-emerald-100/80 font-semibold'
                  : 'text-ink-muted bg-slate-100'
              }`}>
                Auto cues
              </span>
            </button>
          </div>
        </div>

        {/* Compact Settings for Podcast / Narration */}
        {(productionMode === 'podcast_deep_dive' || productionMode === 'narrated_article') && (
          <div className="p-3 bg-slate-50 border border-border-hairline rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Episode structure pills */}
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary font-medium">Length:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPodcastFormat('single_episode')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition cursor-pointer ${
                    podcastFormat === 'single_episode'
                      ? 'bg-primary text-white border-primary shadow-2xs'
                      : 'bg-white border-border-hairline text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  ⚡ Single Episode
                </button>
                <button
                  type="button"
                  onClick={() => setPodcastFormat('multi_part')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition cursor-pointer ${
                    podcastFormat === 'multi_part'
                      ? 'bg-primary text-white border-primary shadow-2xs'
                      : 'bg-white border-border-hairline text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  📚 Multi-Part
                </button>
              </div>
            </div>

            {/* Host customization if 2-host podcast */}
            {productionMode === 'podcast_deep_dive' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-ink-muted">Host 1:</span>
                  <input
                    type="text"
                    value={host1Name}
                    onChange={(e) => setHost1Name(e.target.value)}
                    className="w-16 bg-white border border-border-hairline rounded px-1.5 py-0.5 text-xs text-ink-primary focus:outline-none focus:border-primary"
                    placeholder="Alex"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-ink-muted">Host 2:</span>
                  <input
                    type="text"
                    value={host2Name}
                    onChange={(e) => setHost2Name(e.target.value)}
                    className="w-16 bg-white border border-border-hairline rounded px-1.5 py-0.5 text-xs text-ink-primary focus:outline-none focus:border-primary"
                    placeholder="Jordan"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>
              {productionMode === 'podcast_deep_dive' && 'Synthesizes dialogue chemistry, topic transitions & music stingers'}
              {productionMode === 'narrated_article' && 'Chaptered audio with melodic section stingers & character-voiced quotes'}
              {productionMode === 'audio_play' && '100% Verbatim dialogue and prose extraction verified with automated word diff'}
            </span>
          </div>

          <button
            onClick={handleCreateAndAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {productionMode === 'podcast_deep_dive' && 'Synthesizing Podcast...'}
                {productionMode === 'narrated_article' && 'Structuring Audio Article...'}
                {productionMode === 'audio_play' && 'Analyzing Script...'}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
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
