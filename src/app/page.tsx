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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [quality, setQuality] = useState("auto");
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [error, setError] = useState("");

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_API_URL || "/api"
      : "http://localhost:5000";

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
                � <strong>How to use:</strong>
                <br />
                1. <strong>Copy YouTube URL:</strong> Go to YouTube and copy the
                video link
                <br />
                2. <strong>Paste URL:</strong> Paste the link in the input box
                below
                <br />
                3. <strong>Choose Quality:</strong> Select your preferred video
                quality
                <br />
                4. <strong>Download:</strong> Click &quot;Download&quot; and the
                file will save to your Downloads folder
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Get Video Info"}
                </button>
                <button
                  onClick={startDirectDownload}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? "Preparing..." : "⬇️ Download"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

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
