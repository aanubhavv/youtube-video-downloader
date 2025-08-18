"use client";

import { useState } from "react";
import VideoInfoCard from "@/components/VideoInfoCard";
import DownloadProgress from "@/components/DownloadProgress";

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
  };
}

interface DownloadTask {
  task_id: string;
  status: string;
  message: string;
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
  const [quality, setQuality] = useState("auto");
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [error, setError] = useState("");
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [showDownloads, setShowDownloads] = useState(false);

  const API_BASE_URL = "http://localhost:5000";

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/video-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

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
      // First, get download info
      const response = await fetch(`${API_BASE_URL}/api/download-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare download");
      }

      // Create a temporary download task for status
      const directTask: DownloadTask = {
        task_id: data.download_id,
        status: "preparing",
        message: `Preparing download: ${data.title}`,
      };

      setDownloadTasks((prev) => [directTask, ...prev]);

      // Trigger direct download
      const link = document.createElement("a");
      link.href = `${API_BASE_URL}${data.download_url}`;
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

  const startDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start download");
      }

      const newTask: DownloadTask = {
        task_id: data.task_id,
        status: data.status,
        message: data.message,
      };

      setDownloadTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchDownloadedFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/downloads/files`);
      const data = await response.json();

      if (response.ok) {
        setDownloadedFiles(data.files || []);
        setShowDownloads(true);
      } else {
        setError(data.error || "Failed to fetch downloaded files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              YouTube Downloader
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

              <div>
                <label
                  htmlFor="quality"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Quality
                </label>
                <select
                  id="quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="auto">Best</option>
                  <option value="best[height<=1080]">1080p</option>
                  <option value="best[height<=720]">720p</option>
                  <option value="best[height<=480]">480p or lower</option>
                  <option value="bestaudio">Audio Only</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchVideoInfo}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  {loading ? "Loading..." : "Get Video Info"}
                </button>
                <button
                  onClick={startDirectDownload}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  {loading ? "Preparing..." : "⬇️ Download to Device"}
                </button>
              </div>
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
                            href={`${API_BASE_URL}/api/downloads/files/${encodeURIComponent(
                              file.name
                            )}`}
                            download={file.name}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors inline-block text-center"
                          >
                            ⬇️ Download
                          </a>
                          <button
                            onClick={() => {
                              // Alternative download method using fetch
                              const link = document.createElement("a");
                              link.href = `${API_BASE_URL}/api/downloads/files/${encodeURIComponent(
                                file.name
                              )}`;
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
          {videoInfo && <VideoInfoCard videoInfo={videoInfo} />}

          {/* Download Progress */}
          {downloadTasks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Download Progress
              </h3>
              <div className="space-y-4">
                {downloadTasks.map((task) => (
                  <DownloadProgress
                    key={task.task_id}
                    task={task}
                    apiBaseUrl={API_BASE_URL}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
