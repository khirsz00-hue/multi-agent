/**
 * Runway API Integration for Creative Dynamic Video Generation
 * 
 * This module provides functionality to:
 * 1. Authenticate with Runway API
 * 2. Create video generation tasks
 * 3. Poll for task completion with exponential backoff
 * 4. Download and process generated videos
 * 5. Upload videos to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import {
  VideoGenerationConfig,
  RunwayVideoRequest,
  RunwayVideoResponse,
  RunwayTaskStatusResponse,
  VideoTaskStatus,
  PollingOptions,
  VideoProcessingResult,
  RunwayError,
  RunwayErrorType
} from './types';

// Default configuration for Instagram Reels
const DEFAULT_VIDEO_CONFIG: VideoGenerationConfig = {
  resolution: '1080p',
  duration: 30,
  codec: 'h264',
  bitrate: 5000, // 5 Mbps for good quality
  promptingStrategy: 'creative'
};

// Default polling configuration
const DEFAULT_POLLING_OPTIONS: Required<PollingOptions> = {
  initialDelay: 5000, // 5 seconds
  maxDelay: 60000, // 60 seconds
  maxAttempts: 60, // ~5 minutes with exponential backoff
  backoffMultiplier: 1.5
};

/**
 * Runway API Client
 */
export class RunwayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.runwayml.com/v1') {
    if (!apiKey) {
      throw new RunwayError(
        RunwayErrorType.AUTHENTICATION_FAILED,
        'Runway API key is required'
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Create a video generation task
   */
  async createVideoTask(
    prompt: string,
    config: Partial<VideoGenerationConfig> = {}
  ): Promise<RunwayVideoResponse> {
    const finalConfig: VideoGenerationConfig = {
      ...DEFAULT_VIDEO_CONFIG,
      ...config
    };

    const request: RunwayVideoRequest = {
      prompt,
      config: finalConfig
    };

    try {
      const response = await fetch(`${this.baseUrl}/video/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-01'
        },
        body: JSON.stringify({
          prompt: request.prompt,
          resolution: request.config.resolution,
          duration: request.config.duration,
          style: request.config.style,
          prompting_strategy: request.config.promptingStrategy,
          output_format: 'mp4',
          codec: request.config.codec,
          bitrate: request.config.bitrate
        })
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      
      return {
        task_id: data.id || data.task_id,
        status: this.normalizeStatus(data.status),
        estimated_time: data.estimated_time || 180, // default 3 minutes
        message: data.message
      };
    } catch (error) {
      if (error instanceof RunwayError) {
        throw error;
      }
      throw new RunwayError(
        RunwayErrorType.UNKNOWN,
        `Failed to create video task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Poll for task status until completion or failure
   */
  async pollTaskStatus(
    taskId: string,
    options: Partial<PollingOptions> = {}
  ): Promise<RunwayTaskStatusResponse> {
    const opts: Required<PollingOptions> = {
      ...DEFAULT_POLLING_OPTIONS,
      ...options
    };

    let attempt = 0;
    let delay = opts.initialDelay;

    while (attempt < opts.maxAttempts) {
      attempt++;

      try {
        const status = await this.getTaskStatus(taskId);

        // Check if task is complete
        if (status.status === 'completed') {
          return status;
        }

        // Check if task failed
        if (status.status === 'failed') {
          throw new RunwayError(
            RunwayErrorType.PROCESSING_FAILED,
            status.error_message || 'Video generation failed',
            status
          );
        }

        // Task is still processing, wait before next poll
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);

      } catch (error) {
        if (error instanceof RunwayError) {
          throw error;
        }
        // On network errors, retry with backoff
        console.warn(`Polling attempt ${attempt} failed:`, error);
        await this.sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      }
    }

    throw new RunwayError(
      RunwayErrorType.TIMEOUT,
      `Task ${taskId} did not complete within the timeout period`,
      { attempts: opts.maxAttempts }
    );
  }

  /**
   * Get current status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<RunwayTaskStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-01'
        }
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();

      return {
        task_id: taskId,
        status: this.normalizeStatus(data.status),
        progress: data.progress,
        eta: data.eta,
        error_message: data.error || data.error_message,
        video_url: data.output?.video_url || data.video_url,
        created_at: data.created_at || new Date().toISOString(),
        completed_at: data.completed_at
      };
    } catch (error) {
      if (error instanceof RunwayError) {
        throw error;
      }
      throw new RunwayError(
        RunwayErrorType.UNKNOWN,
        `Failed to get task status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Download video from Runway and upload to Supabase Storage
   */
  async downloadAndUploadVideo(
    videoUrl: string,
    userId: string,
    taskId: string
  ): Promise<VideoProcessingResult> {
    try {
      // Download video from Runway
      console.log('Downloading video from Runway:', videoUrl);
      const videoBuffer = await this.downloadVideo(videoUrl);
      console.log('Video downloaded successfully, size:', videoBuffer.length);

      // Upload to Supabase Storage
      const storagePath = `${userId}/videos/reels/${taskId}.mp4`;
      const publicUrl = await this.uploadToSupabase(videoBuffer, storagePath);

      return {
        success: true,
        storagePath,
        publicUrl
      };
    } catch (error) {
      console.error('Video processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download video from URL
   */
  private async downloadVideo(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new RunwayError(
          RunwayErrorType.DOWNLOAD_FAILED,
          `Failed to download video: HTTP ${response.status}`,
          { status: response.status, url }
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof RunwayError) {
        throw error;
      }
      throw new RunwayError(
        RunwayErrorType.DOWNLOAD_FAILED,
        `Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Upload video to Supabase Storage
   */
  private async uploadToSupabase(
    videoBuffer: Buffer,
    storagePath: string
  ): Promise<string> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new RunwayError(
        RunwayErrorType.UPLOAD_FAILED,
        'Supabase configuration is missing'
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(storagePath, videoBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new RunwayError(
          RunwayErrorType.UPLOAD_FAILED,
          `Failed to upload to Supabase: ${error.message}`,
          error
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(storagePath);

      return publicUrl;
    } catch (error) {
      if (error instanceof RunwayError) {
        throw error;
      }
      throw new RunwayError(
        RunwayErrorType.UPLOAD_FAILED,
        `Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Handle error responses from Runway API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    let errorType = RunwayErrorType.UNKNOWN;
    let message = errorData.message || errorData.error || 'Unknown error';

    switch (response.status) {
      case 401:
      case 403:
        errorType = RunwayErrorType.AUTHENTICATION_FAILED;
        message = 'Invalid or expired Runway API key';
        break;
      case 429:
        errorType = RunwayErrorType.RATE_LIMIT_EXCEEDED;
        message = 'Rate limit exceeded. Please try again later.';
        break;
      case 400:
        errorType = RunwayErrorType.INVALID_PROMPT;
        break;
      case 500:
      case 502:
      case 503:
        errorType = RunwayErrorType.PROCESSING_FAILED;
        message = 'Runway service error. Please try again later.';
        break;
    }

    throw new RunwayError(errorType, message, {
      status: response.status,
      data: errorData
    });
  }

  /**
   * Normalize status from Runway API to our internal status
   */
  private normalizeStatus(status: string): VideoTaskStatus {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('complete') || normalizedStatus === 'succeeded') {
      return 'completed';
    }
    if (normalizedStatus.includes('fail') || normalizedStatus === 'error') {
      return 'failed';
    }
    if (normalizedStatus.includes('process') || normalizedStatus === 'running') {
      return 'processing';
    }
    return 'pending';
  }

  /**
   * Sleep utility for polling delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a Runway client instance
 */
export function createRunwayClient(apiKey?: string): RunwayClient {
  const key = apiKey || process.env.RUNWAY_API_KEY;
  if (!key) {
    throw new RunwayError(
      RunwayErrorType.AUTHENTICATION_FAILED,
      'RUNWAY_API_KEY environment variable is not set'
    );
  }
  return new RunwayClient(key);
}

/**
 * Generate a video using Runway API (end-to-end)
 * 
 * @param prompt - Script/scenario for the video
 * @param userId - User ID for storage path
 * @param config - Optional video configuration
 * @param pollingOptions - Optional polling configuration
 * @returns Complete video task information with public URL
 */
export async function generateVideo(
  prompt: string,
  userId: string,
  config?: Partial<VideoGenerationConfig>,
  pollingOptions?: Partial<PollingOptions>
): Promise<RunwayTaskStatusResponse & { publicUrl?: string; storagePath?: string }> {
  const client = createRunwayClient();

  // Step 1: Create video generation task
  console.log('Creating video generation task...');
  const taskResponse = await client.createVideoTask(prompt, config);
  console.log('Task created:', taskResponse.task_id);

  // Step 2: Poll for completion
  console.log('Polling for task completion...');
  const statusResponse = await client.pollTaskStatus(taskResponse.task_id, pollingOptions);
  console.log('Task completed:', statusResponse.task_id);

  // Step 3: Download and upload video
  if (statusResponse.video_url) {
    console.log('Downloading and uploading video...');
    const uploadResult = await client.downloadAndUploadVideo(
      statusResponse.video_url,
      userId,
      taskResponse.task_id
    );

    if (uploadResult.success) {
      return {
        ...statusResponse,
        publicUrl: uploadResult.publicUrl,
        storagePath: uploadResult.storagePath
      };
    } else {
      throw new RunwayError(
        RunwayErrorType.UPLOAD_FAILED,
        uploadResult.error || 'Failed to upload video'
      );
    }
  }

  return statusResponse;
}
