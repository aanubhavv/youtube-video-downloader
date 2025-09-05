"use client";

import { useState, useEffect } from "react";
import VideoInfoCard from "@/components/VideoInfoCard";
import DownloadProgress from "@/components/DownloadProgress";
import { FuturisticIcons } from "@/components/FuturisticIcons";
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

// Toast notification component
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "border-green-400 bg-green-900/30 text-green-300";
      case "error":
        return "border-red-400 bg-red-900/30 text-red-300";
      default:
        return "border-blue-400 bg-blue-900/30 text-blue-300";
    }
  };

  return (
    <div className={`toast show ${getToastStyles()}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {type === "success" && <FuturisticIcons.Success />}
          {type === "error" && <FuturisticIcons.Error />}
          {type === "info" && <FuturisticIcons.Loading />}
        </span>
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity"
        >
          <FuturisticIcons.Close />
        </button>
      </div>
    </div>
  );
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="inline-flex items-center">
    <FuturisticIcons.Loading />
    <span className="ml-2">Processing...</span>
  </div>
);

// Floating particles component
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-cyan-400/30 rounded-full float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
        }}
      ></div>
    ))}
  </div>
);

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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      showToast("Please enter a valid YouTube URL", "error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.getVideoInfo(url);
      setVideoInfo(data);
      showToast("Video information loaded successfully!", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const startDirectDownload = async () => {
    if (!url.trim()) {
      const errorMsg = "Please enter a YouTube URL";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let quality = "auto";
      if (selectedVideoFormat && selectedVideoFormat.height) {
        quality = `best[height<=${selectedVideoFormat.height}]`;
      }

      const data = await api.startDirectDownload(url, quality);

      const directTask: DownloadTask = {
        task_id: data.download_id,
        status: "preparing",
        message: `Preparing download: ${data.title}`,
      };

      setDownloadTasks((prev) => [directTask, ...prev]);
      showToast("Download started successfully!", "success");

      const link = document.createElement("a");
      link.href = api.getDirectDownloadUrl(data.download_id!);
      link.download = `${data.safe_title}.mp4`;
      link.style.display = "none";
      document.body.appendChild(link);

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

      setTimeout(() => {
        setDownloadTasks((prev) =>
          prev.map((task) =>
            task.task_id === data.download_id
              ? {
                  ...task,
                  status: "completed",
                  message: `Download completed: ${data.title}`,
                }
              : task
          )
        );
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const startCustomFormatDownload = async () => {
    if (!url.trim()) {
      const errorMsg = "Please enter a YouTube URL";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    if (!selectedVideoFormat && !selectedAudioFormat) {
      const errorMsg = "Please select at least one format (video or audio)";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await api.startCustomFormatDownload(
        url,
        selectedVideoFormat?.format_id,
        selectedAudioFormat?.format_id
      );

      const directTask: DownloadTask = {
        task_id: data.download_id,
        status: "preparing",
        message: `Preparing custom download: ${data.title}`,
      };

      setDownloadTasks((prev) => [directTask, ...prev]);
      showToast("Custom download started!", "success");

      const link = document.createElement("a");
      link.href = api.getDirectDownloadUrl(data.download_id!);
      const extension =
        data.file_extension ||
        (selectedAudioFormat && !selectedVideoFormat ? ".mp3" : ".mp4");
      link.download = `${data.safe_title}${extension}`;
      link.style.display = "none";
      document.body.appendChild(link);

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

      setTimeout(() => {
        setDownloadTasks((prev) =>
          prev.map((task) =>
            task.task_id === data.download_id
              ? {
                  ...task,
                  status: "completed",
                  message: `Custom download completed: ${data.title}`,
                }
              : task
          )
        );
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast(errorMessage, "error");
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
      className={`min-h-screen relative overflow-hidden ${
        loading ? "cursor-wait" : ""
      }`}
    >
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-cyan-600/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>
        <FloatingParticles />
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-6 mb-12">
            <div className="relative inline-block">
              <h1 className="text-6xl md:text-8xl font-bold mb-4 relative z-10">
                <span className="gradient-text">YT</span>
                <span className="text-white">Flow</span>
              </h1>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full scale-150"></div>
            </div>

            <p className="text-xl md:text-2xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
              Download youtube videos in the highest quality
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                High Quality Downloads
              </span>
              <span className="flex items-center gap-2">
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                Format Selection
              </span>
            </div>
          </div>

          {/* URL Input Section */}
          <div className="card-base card-hover p-8 space-y-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-200">
                  YouTube URL
                </label>

                <div className="relative group">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="input-base w-full text-lg pl-14 pr-6 py-5 focus-glow"
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && fetchVideoInfo()
                    }
                  />
                  <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={fetchVideoInfo}
                  disabled={loading}
                  className="btn-base btn-secondary py-4 text-lg font-semibold hover-lift focus-glow flex items-center justify-center gap-3 shimmer"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Analyze Video
                    </>
                  )}
                </button>

                <button
                  onClick={startDirectDownload}
                  disabled={loading}
                  className="btn-base btn-primary py-4 text-lg font-bold hover-lift focus-glow flex items-center justify-center gap-3 glow-electric pulse-glow"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                      Quick Download (Best Quality)
                    </>
                  )}
                </button>
              </div>

              {/* Custom Download Button */}
              {videoInfo && (selectedVideoFormat || selectedAudioFormat) && (
                <div className="pt-6 border-t border-gray-700/50 space-y-4">
                  <button
                    onClick={startCustomFormatDownload}
                    disabled={loading}
                    className="btn-base w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 text-lg font-bold hover-lift focus-glow flex items-center justify-center gap-3 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    {loading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Download Custom Format
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {selectedVideoFormat && (
                      <span className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-blue-300 font-medium">
                          Video: {selectedVideoFormat.height}p
                        </span>
                      </span>
                    )}
                    {selectedAudioFormat && (
                      <span className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-full backdrop-blur-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-300 font-medium">
                          Audio:{" "}
                          {selectedAudioFormat.language?.toUpperCase() ||
                            "Default"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent"></div>
                <div className="relative flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-red-400"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-red-300 font-semibold mb-1">
                      Error Occurred
                    </h4>
                    <p className="text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Info Card */}
          {videoInfo && (
            <div className="transform transition-all duration-500 ease-out animate-in slide-in-from-bottom-4">
              <VideoInfoCard
                videoInfo={videoInfo}
                onFormatSelect={handleFormatSelection}
                onDownload={startCustomFormatDownload}
                disabled={loading}
              />
            </div>
          )}

          {/* Download Progress */}
          {downloadTasks.length > 0 && (
            <div className="card-base p-6 space-y-6 transform transition-all duration-500 ease-out">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Download Progress
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {downloadTasks.length} active downloads
                  </p>
                </div>
              </div>

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

          {/* Downloaded Files Section */}
          {showDownloads && (
            <div className="card-base p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-white"
                    >
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Downloaded Files
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {downloadedFiles.length} files ready
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDownloads(false)}
                  className="w-8 h-8 rounded-full bg-gray-600/30 hover:bg-gray-500/30 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {downloadedFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-gray-500"
                    >
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-300 font-medium mb-2">
                    No files downloaded yet
                  </h4>
                  <p className="text-gray-500 text-sm">
                    Start downloading videos to see them here!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
                    <p className="text-green-300 font-medium">
                      🎉 {downloadedFiles.length} file
                      {downloadedFiles.length !== 1 ? "s" : ""} ready for
                      download!
                    </p>
                  </div>

                  <div className="space-y-3">
                    {downloadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate flex items-center gap-2">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="text-blue-400 flex-shrink-0"
                            >
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {formatFileSize(file.size)} •{" "}
                            {new Date(file.modified).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <a
                            href={api.getDownloadFileUrl(file.name)}
                            download={file.name}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors font-medium"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Developer Credit */}
          <div className="text-center pt-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 glass-dark rounded-full hover:bg-gray-800/60 transition-colors">
              <span className="text-gray-400">Crafted with</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-red-400"
              >
                <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.04L12,21.35Z" />
              </svg>
              <span className="text-gray-400">by</span>
              <a
                href="https://github.com/aanubhavv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                Anubhav Garg
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
