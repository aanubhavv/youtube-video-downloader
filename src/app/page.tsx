"use client";

import { useState } from "react";
import VideoInfoCard from "@/components/VideoInfoCard";
import DownloadProgress from "@/components/DownloadProgress";
import api from "@/services/api";

interface VideoFormat {
  format_id: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  filesize?: number;
  tbr?: number;
}

interface AudioFormat {
  format_id: string;
  acodec?: string;
  abr?: number;
  filesize?: number;
  tbr?: number;
  language?: string;
  language_preference?: number;
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
    video_formats: VideoFormat[];
    audio_formats: AudioFormat[];
    recommended_video: string;
    recommended_audio: string;
  };
}

interface DownloadTask {
  task_id?: string;
  download_id?: string;
  status: string;
  message: string;
  file_extension?: string;
}

interface DownloadedFile {
  name: string;
  size: number;
  modified: string;
  path: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedVideoFormat, setSelectedVideoFormat] =
    useState<VideoFormat | null>(null);
  const [selectedAudioFormat, setSelectedAudioFormat] =
    useState<AudioFormat | null>(null);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [error, setError] = useState("");
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [showDownloads, setShowDownloads] = useState(false);

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.getVideoInfo(url);
      setVideoInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const startDirectDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Determine quality parameter based on selected formats
      let quality = "auto";
      if (selectedVideoFormat && selectedVideoFormat.height) {
        quality = `best[height<=${selectedVideoFormat.height}]`;
      }

      // Start direct download using API service
      const data = await api.startDirectDownload(url, quality);

      // Create a temporary download task for status
      const directTask: DownloadTask = {
        task_id: data.download_id,
        status: "preparing",
        message: `Preparing download: ${data.title}`,
      };

      setDownloadTasks((prev) => [directTask, ...prev]);

      // Trigger direct download
      const link = document.createElement("a");
      link.href = api.getDirectDownloadUrl(data.download_id!);
      link.download = `${data.safe_title}.mp4`;
      link.style.display = "none";
      document.body.appendChild(link);

      // Update task status
      setDownloadTasks((prev) =>
        prev.map((task) =>
          task.task_id === data.download_id
            ? {
                ...task,
                status: "downloading",
                message: "Downloading to your device...",
              }
            : task
        )
      );

      link.click();
      document.body.removeChild(link);

      // Update to completed after a delay (since we can't track actual progress)
      setTimeout(() => {
        setDownloadTasks((prev) =>
          prev.map((task) =>
            task.task_id === data.download_id
              ? {
                  ...task,
                  status: "completed",
                  message: `Download started: ${data.title}`,
                }
              : task
          )
        );
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const startCustomFormatDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    if (!selectedVideoFormat && !selectedAudioFormat) {
      setError("Please select at least one format (video or audio)");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Start custom format download using API service
      const data = await api.startCustomFormatDownload(
        url,
        selectedVideoFormat?.format_id,
        selectedAudioFormat?.format_id
      );

      // Create a temporary download task for status
      const directTask: DownloadTask = {
        task_id: data.download_id,
        status: "preparing",
        message: `Preparing custom download: ${data.title}`,
      };

      setDownloadTasks((prev) => [directTask, ...prev]);

      // Trigger direct download
      const link = document.createElement("a");
      link.href = api.getDirectDownloadUrl(data.download_id!);
      const extension =
        data.file_extension ||
        (selectedAudioFormat && !selectedVideoFormat ? ".mp3" : ".mp4");
      link.download = `${data.safe_title}${extension}`;
      link.style.display = "none";
      document.body.appendChild(link);

      // Update task status
      setDownloadTasks((prev) =>
        prev.map((task) =>
          task.task_id === data.download_id
            ? {
                ...task,
                status: "downloading",
                message: "Downloading to your device...",
              }
            : task
        )
      );

      link.click();
      document.body.removeChild(link);

      // Update to completed after a delay (since we can't track actual progress)
      setTimeout(() => {
        setDownloadTasks((prev) =>
          prev.map((task) =>
            task.task_id === data.download_id
              ? {
                  ...task,
                  status: "completed",
                  message: `Custom download started: ${data.title}`,
                }
              : task
          )
        );
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFormatSelection = (
    videoFormat: VideoFormat | null,
    audioFormat: AudioFormat | null
  ) => {
    setSelectedVideoFormat(videoFormat);
    setSelectedAudioFormat(audioFormat);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${
        loading ? "cursor-wait" : ""
      }`}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
              <img src="/favicon.ico" alt="YTFlow" className="w-10 h-10" />
              <span>
                <span className="text-red-500">YT</span>Flow
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download YouTube videos in high quality
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-2xl mx-auto">
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                💡 <strong>Download to Device:</strong> Downloads immediately to
                your device&apos;s Downloads folder.
              </p>
            </div>
          </div>

          {/* URL Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  YouTube URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchVideoInfo}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  {loading
                    ? "Loading..."
                    : "📋 Get Video Info & Select Formats"}
                </button>
                <button
                  onClick={startDirectDownload}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  {loading
                    ? "Preparing..."
                    : "⚡ Quick Download (Best Quality)"}
                </button>
              </div>

              {/* Custom Download Button - Only show if formats are selected */}
              {videoInfo && (selectedVideoFormat || selectedAudioFormat) && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={startCustomFormatDownload}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200 cursor-pointer flex items-center justify-center space-x-2"
                    style={{ cursor: "pointer" }}
                  >
                    <span>🎯 Download with Selected Formats</span>
                  </button>
                  <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {selectedVideoFormat &&
                      selectedAudioFormat &&
                      "Video + Audio"}
                    {selectedVideoFormat &&
                      !selectedAudioFormat &&
                      "Video Only"}
                    {!selectedVideoFormat &&
                      selectedAudioFormat &&
                      "Audio Only"}
                    {selectedVideoFormat && ` (${selectedVideoFormat.height}p)`}
                    {selectedAudioFormat &&
                      ` • ${
                        selectedAudioFormat.language?.toUpperCase() ||
                        "Unknown language"
                      }`}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Downloaded Files Section */}
          {showDownloads && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Downloaded Files ({downloadedFiles.length})
                </h3>
                <button
                  onClick={() => setShowDownloads(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {downloadedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    No files downloaded yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    Download some videos to see them here!
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                    <p className="text-green-800 dark:text-green-300 text-sm">
                      🎉{" "}
                      <strong>
                        {downloadedFiles.length} file
                        {downloadedFiles.length !== 1 ? "s" : ""} ready for
                        download!
                      </strong>
                      Click the download buttons to save them to your device.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {downloadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            🎬 {file.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatFileSize(file.size)} • Modified:{" "}
                            {new Date(file.modified).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <a
                            href={api.getDownloadFileUrl(file.name)}
                            download={file.name}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors inline-block text-center"
                          >
                            ⬇️ Download
                          </a>
                          <button
                            onClick={() => {
                              // Alternative download method using fetch
                              const link = document.createElement("a");
                              link.href = api.getDownloadFileUrl(file.name);
                              link.download = file.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            💾 Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Video Info Card */}
          {videoInfo && (
            <VideoInfoCard
              videoInfo={videoInfo}
              onFormatSelect={handleFormatSelection}
              onDownload={startCustomFormatDownload}
              disabled={loading}
            />
          )}

          {/* Download Progress */}
          {downloadTasks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Download Progress
              </h3>
              <div className="space-y-4">
                {downloadTasks.map((task, index) => (
                  <DownloadProgress
                    key={task.task_id || task.download_id || index}
                    task={task}
                    api={api}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Developer Credit */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <span>Developed by</span>
              <a
                href="https://github.com/aanubhavv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="flex-shrink-0"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Anubhav Garg</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
