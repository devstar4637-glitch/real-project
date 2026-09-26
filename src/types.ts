export interface AgentStep {
  id: string;
  run_id: string;
  agent: 'orchestrator' | 'planner' | 'tagline_worker' | 'copy_worker' | 'image_worker' | 'evaluator' | 'retry_arbiter';
  type: 'thought' | 'code_execution' | 'code_result' | 'model_output' | 'evaluation' | 'retry';
  title: string;
  content: string;
  timestamp: string;
  details?: Record<string, any>;
  attempt?: number;
}

export interface AssetScore {
  score: number;
  passed: boolean;
  reasoning: string;
  criteria_breakdown?: {
    clarity?: number;
    creativity?: number;
    appeal?: number;
    brand_fit?: number;
  };
}

export interface RetryEvent {
  asset: 'tagline' | 'marketing_copy' | 'image';
  attempt: number;
  previous_score: number;
  feedback: string;
  decision: string;
  timestamp: string;
}

export interface MarketingCopy {
  headline: string;
  body: string;
  call_to_action: string;
  key_benefits: string[];
}

export interface PipelineAssets {
  tagline: string;
  marketing_copy: MarketingCopy;
  image_url: string;
  image_prompt: string;
}

export interface PipelineScores {
  tagline: AssetScore;
  marketing_copy: AssetScore;
  image: AssetScore;
  overall: number;
}

export interface AgentStageStatus {
  planner: {
    status: 'pending' | 'active' | 'completed' | 'failed';
    output?: {
      target_audience: string;
      value_proposition: string;
      tone_and_style: string;
      visual_direction: string;
    };
  };
  tagline_worker: {
    status: 'pending' | 'active' | 'completed' | 'retrying' | 'failed';
    attempts: number;
    current_draft?: string;
    score?: number;
  };
  copy_worker: {
    status: 'pending' | 'active' | 'completed' | 'retrying' | 'failed';
    attempts: number;
    current_draft?: MarketingCopy;
    score?: number;
  };
  image_worker: {
    status: 'pending' | 'active' | 'completed' | 'retrying' | 'failed';
    attempts: number;
    current_url?: string;
    score?: number;
  };
  evaluator: {
    status: 'pending' | 'active' | 'completed' | 'evaluating' | 'failed';
    current_round: number;
    feedback?: string;
  };
}

export type PipelineStage = 
  | 'queued'
  | 'orchestrator_bootstrap'
  | 'planner_decomposition'
  | 'parallel_workers_dispatched'
  | 'evaluator_scoring'
  | 'retry_refinement'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface AgentRunState {
  run_id: string;
  idea: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: PipelineStage;
  agents: AgentStageStatus;
  step_log: AgentStep[];
  attempt_counts: {
    tagline: number;
    copy: number;
    image: number;
  };
  created_at: string;
  updated_at: string;
  error?: string;
  assets?: PipelineAssets;
  scores?: PipelineScores;
  retry_history?: RetryEvent[];
  traceability?: {
    interaction_id?: string;
    sandbox_environment_id?: string;
    orchestrator_model: string;
    text_model: string;
    image_model: string;
    total_duration_ms: number;
    native_code_execution_used: boolean;
    storage_bucket?: string;
  };
}

export interface VideoGenRequest {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
}

export interface VideoGenResponse {
  operationName: string;
  mockUrl?: string;
}

export interface ImageCreateEditRequest {
  prompt: string;
  editImageBase64?: string;
  editImageMimeType?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}

export interface ImageCreateEditResponse {
  imageUrl: string;
  prompt: string;
  mode: 'created' | 'edited';
  model: string;
}

export interface TranscriptionResponse {
  text: string;
  model: string;
  durationSeconds?: number;
}

export interface LiveVoiceMessage {
  id: string;
  sender: 'user' | 'model';
  text?: string;
  timestamp: string;
}
