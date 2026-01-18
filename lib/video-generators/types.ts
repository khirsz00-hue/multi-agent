/**
 * Type definitions for video generation services (Runway API)
 */

export type VideoResolution = '720p' | '1080p';
export type VideoCodec = 'h264' | 'h265';
export type VideoTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Configuration for video generation request
 */
export interface VideoGenerationConfig {
  resolution: VideoResolution;
  duration: number; // seconds
  style?: string;
  promptingStrategy?: 'default' | 'creative' | 'precise';
  bitrate?: number; // kbps
  codec?: VideoCodec;
}

/**
 * Request to generate video with Runway API
 */
export interface RunwayVideoRequest {
  prompt: string; // script/scenario for the video
  config: VideoGenerationConfig;
  webhookUrl?: string; // optional callback URL for completion
}

/**
 * Response from Runway API when creating a video generation task
 */
export interface RunwayVideoResponse {
  task_id: string;
  status: VideoTaskStatus;
  estimated_time?: number; // seconds
  message?: string;
}

/**
 * Polling response for video task status
 */
export interface RunwayTaskStatusResponse {
  task_id: string;
  status: VideoTaskStatus;
  progress?: number; // 0-100
  eta?: number; // estimated seconds remaining
  error_message?: string;
  video_url?: string; // available when status is 'completed'
  created_at: string;
  completed_at?: string;
}

/**
 * Database record for tracking video generation tasks
 */
export interface VideoTask {
  id: string;
  content_draft_id?: string;
  task_id: string; // Runway task ID
  status: VideoTaskStatus;
  prompt: string;
  config: VideoGenerationConfig;
  error_message?: string;
  video_url?: string; // Runway video URL
  storage_path?: string; // Supabase storage path
  supabase_url?: string; // Public URL from Supabase
  estimated_time?: number;
  actual_time?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/**
 * Options for video polling with exponential backoff
 */
export interface PollingOptions {
  initialDelay?: number; // milliseconds (default: 5000)
  maxDelay?: number; // milliseconds (default: 60000)
  maxAttempts?: number; // default: 60 (5 minutes with exponential backoff)
  backoffMultiplier?: number; // default: 1.5
}

/**
 * Result of video processing and upload
 */
export interface VideoProcessingResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Error types specific to Runway API
 */
export enum RunwayErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_PROMPT = 'invalid_prompt',
  PROCESSING_FAILED = 'processing_failed',
  DOWNLOAD_FAILED = 'download_failed',
  UPLOAD_FAILED = 'upload_failed',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Custom error class for Runway API errors
 */
export class RunwayError extends Error {
  constructor(
    public type: RunwayErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RunwayError';
  }
}
