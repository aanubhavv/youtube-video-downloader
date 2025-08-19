// API service for YouTube Downloader
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface DownloadTask {
  task_id?: string;
  download_id?: string;
  status: string;
  message: string;
  video_info?: {
    title: string;
    duration: string;
    uploader: string;
  };
  selected_format?: string;
  format_description?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  downloaded_files?: string[];
  download_path?: string;
}

interface DownloadedFile {
  name: string;
  size: number;
  modified: string;
  path: string;
}

interface DownloadedFilesResponse {
  files: DownloadedFile[];
  download_path: string;
}

interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  thumbnail: string;
  description: string;
  view_count: number;
  upload_date: string;
  formats: {
    video_formats: Array<{
      format_id: string;
      width?: number;
      height?: number;
      fps?: number;
      vcodec?: string;
      filesize?: number;
      tbr?: number;
    }>;
    audio_formats: Array<{
      format_id: string;
      acodec?: string;
      abr?: number;
      filesize?: number;
      tbr?: number;
    }>;
    recommended_video: string;
    recommended_audio: string;
    quality_formats?: {
      [key: string]: {
        video: string;
        audio: string;
      };
    };
  };
}

interface DownloadTask {
  task_id?: string;
  download_id?: string;
  status: string;
  message: string;
  download_url?: string;
  title?: string;
  safe_title?: string;
}

export const api = {
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  async getVideoInfo(url: string): Promise<VideoInfo> {
    const response = await fetch(`${API_BASE_URL}/api/video-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error types with user-friendly messages
      if (error.type === 'extraction_failure') {
        throw new Error(`${error.message} Suggestions: ${error.suggestions?.join(', ')}`);
      }
      
      // Handle bot detection specifically
      if (response.status === 429 && error.type === 'bot_detection') {
        const guidance = error.guidance;
        let message = 'YouTube bot detection triggered. ';
        
        if (!error.cookie_status?.has_cookies) {
          message += 'Cookie authentication is required. Please check the deployment guide for cookie setup instructions.';
        } else {
          message += 'Your cookies may be expired. Please refresh them and redeploy.';
        }
        
        throw new Error(message);
      }
      
      // Handle video unavailable
      if (error.type === 'video_unavailable') {
        throw new Error(`${error.message} ${error.suggestions?.join(', ')}`);
      }
      
      // Handle age-restricted content
      if (error.type === 'age_restricted') {
        throw new Error(`${error.message} ${error.suggestions?.join(', ')}`);
      }
      
      // Handle general rate limiting
      if (response.status === 429) {
        throw new Error(`YouTube is temporarily blocking requests. Please wait ${Math.ceil((error.retry_after || 300) / 60)} minutes and try again.`);
      }
      
      throw new Error(error.error || error.message || 'Failed to fetch video info');
    }

    return await response.json();
  },

  async startDirectDownload(url: string, quality: string = 'auto'): Promise<DownloadTask> {
    const response = await fetch(`${API_BASE_URL}/api/download-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, quality }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error types
      if (error.type === 'extraction_failure') {
        throw new Error(`${error.message} Please try a different video.`);
      }
      
      // Handle bot detection specifically
      if (response.status === 429 && error.type === 'bot_detection') {
        throw new Error('YouTube bot detection triggered. Please check cookie configuration in your deployment settings.');
      }
      
      // Handle general rate limiting
      if (response.status === 429) {
        throw new Error(`YouTube is temporarily blocking requests. Please wait ${Math.ceil((error.retry_after || 300) / 60)} minutes and try again.`);
      }
      
      throw new Error(error.error || error.message || 'Failed to start download');
    }

    return await response.json();
  },

  async startServerDownload(url: string, quality: string = 'auto'): Promise<DownloadTask> {
    const response = await fetch(`${API_BASE_URL}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, quality }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error types
      if (error.type === 'extraction_failure') {
        throw new Error(`${error.message} Please try a different video.`);
      }
      
      // Handle bot detection specifically
      if (response.status === 429 && error.type === 'bot_detection') {
        throw new Error('YouTube bot detection triggered. Please check cookie configuration in your deployment settings.');
      }
      
      // Handle general rate limiting
      if (response.status === 429) {
        throw new Error(`YouTube is temporarily blocking requests. Please wait ${Math.ceil((error.retry_after || 300) / 60)} minutes and try again.`);
      }
      
      throw new Error(error.error || error.message || 'Failed to start download');
    }

    return await response.json();
  },

  async getDownloadStatus(taskId: string): Promise<DownloadTask> {
    const response = await fetch(`${API_BASE_URL}/api/download-status/${taskId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get download status');
    }

    return await response.json();
  },

  async getDownloadedFiles(): Promise<DownloadedFilesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/downloads/files`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get downloaded files');
    }

    return await response.json();
  },

  getDownloadFileUrl(filename: string): string {
    return `${API_BASE_URL}/api/downloads/files/${encodeURIComponent(filename)}`;
  },

  getDirectDownloadUrl(downloadId: string): string {
    return `${API_BASE_URL}/api/download-stream/${downloadId}`;
  }
};

export default api;