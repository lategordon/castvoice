export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type LineType = 'narration' | 'dialogue';
export type SoundCuePlacement = 'before' | 'during' | 'after';

export interface SoundCue {
  id: string;
  tag: string;
  sound_file?: string | null;
  placement: SoundCuePlacement;
  volume_duck_db: number;
}

export interface DeliveryDirection {
  emotion?: string | null;
  pace?: string | null;
  volume?: string | null;
  note?: string | null;
}

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  gender_presentation?: string | null;
  voice_id?: string | null;
  color_accent?: string | null;
}

export interface ScriptLine {
  id: string;
  line_index: number;
  type: LineType;
  speaker_id: string;
  text: string;
  delivery?: DeliveryDirection | null;
  sound_cues: SoundCue[];
  confidence: ConfidenceLevel;
  audio_hash?: string | null;
  audio_duration_ms?: number | null;
  start_time_ms?: number | null;
  end_time_ms?: number | null;
}

export interface ScriptDocument {
  project_id: string;
  title: string;
  raw_text: string;
  characters: Character[];
  lines: ScriptLine[];
  total_words: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  line_count: number;
  character_count: number;
  has_audio: boolean;
  render_progress: number;
}

export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  preview_text: string;
}

export interface TimingManifestLine {
  line_id: string;
  line_index: number;
  speaker_id: string;
  start_time_ms: number;
  end_time_ms: number;
  duration_ms: number;
  text: string;
}

export interface TimingManifest {
  project_id: string;
  total_duration_ms: number;
  lines: TimingManifestLine[];
}
