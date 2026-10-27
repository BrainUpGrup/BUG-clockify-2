export type SubtitulosJobStatus = 'queued' | 'processing' | 'awaiting_review' | 'completed' | 'failed';

export type SubtitulosJobPhase = 'transcription' | 'review' | 'translation' | 'rendering' | 'done' | null;

export interface SubtitulosReviewSummaryItem {
  index: number;
  time: number;
  text: string;
  reason: string;
}

export interface SubtitulosReviewSummary {
  total: number;
  revisar: SubtitulosReviewSummaryItem[];
}

export interface SubtitulosJob {
  id: string;
  status: SubtitulosJobStatus;
  phase: SubtitulosJobPhase;
  progress: number;
  created_at: string;
  updated_at?: string;
  approved: boolean;
  error?: string | null;
  files: string[];
  review_summary?: SubtitulosReviewSummary | null;
  original_filename?: string;
  source_lang?: 'es' | 'en' | null;
  target_lang?: 'es' | 'en' | null;
  topic?: string;
  glossary?: string;
  review_required?: boolean;
  burn?: boolean;
  callback_url?: string | null;
}

export interface SubtitulosSegment {
  i: number;
  start: number;
  end: number;
  text: string;
}

export interface SubtitulosCorrection {
  index: number;
  text: string;
  level: 'SEGURO' | 'REVISAR';
  reason: string;
}

export interface SubtitulosReviewResponse {
  transcript: SubtitulosSegment[];
  corrections: SubtitulosCorrection[];
}

export interface SubtitulosHealth {
  status: string;
  model: string;
  whisper: string;
}
