import { useEffect, useState } from "react";

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

interface API {
  getDownloadStatus: (taskId: string) => Promise<any>;
  getDownloadFileUrl: (filename: string) => string;
}

interface Props {
  task: DownloadTask;
  api: API;
}

export default function DownloadProgress({ task, api }: Props) {
  const [currentTask, setCurrentTask] = useState(task);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const pollStatus = async () => {
      if (
        !isPolling ||
        currentTask.status === "completed" ||
        currentTask.status === "error"
      ) {
        return;
      }

      try {
        const taskId = task.task_id || task.download_id;
        if (!taskId) return;

        const data = await api.getDownloadStatus(taskId);
        setCurrentTask(data);

        if (data.status === "completed" || data.status === "error") {
          setIsPolling(false);
        }
      } catch (error) {
        console.error("Failed to fetch download status:", error);
      }
    };

    const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [task.task_id, api, isPolling, currentTask.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "downloading":
        return "text-blue-600 dark:text-blue-400";
      case "analyzing_formats":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "error":
        return "❌";
      case "downloading":
        return "⬇️";
      case "analyzing_formats":
        return "🔍";
      case "extracting_info":
        return "📋";
      default:
        return "⏳";
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString();
    } catch {
      return timeString;
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {getStatusIcon(currentTask.status || "unknown")}
          </span>
          <span
            className={`font-semibold capitalize ${getStatusColor(
              currentTask.status || "unknown"
            )}`}
          >
            {currentTask.status?.replace("_", " ") || "Unknown"}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentTask.started_at &&
            `Started: ${formatTime(currentTask.started_at)}`}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {currentTask.message || "Processing..."}
        </p>

        {currentTask.video_info && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <p className="font-semibold text-gray-900 dark:text-white">
              {currentTask.video_info.title}
            </p>
            <div className="flex gap-4 text-gray-600 dark:text-gray-300 mt-1">
              <span>Duration: {currentTask.video_info.duration}</span>
              <span>Channel: {currentTask.video_info.uploader}</span>
            </div>
          </div>
        )}

        {(currentTask.format_description || currentTask.selected_format) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Format:{" "}
            {currentTask.format_description || currentTask.selected_format}
          </p>
        )}

        {currentTask.status === "downloading" && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: "45%" }}
            />
          </div>
        )}

        {currentTask.error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error: {currentTask.error}
            </p>
          </div>
        )}

        {currentTask.completed_at && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Completed at: {formatTime(currentTask.completed_at)}
          </p>
        )}

        {currentTask.status === "completed" && currentTask.download_path && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-3 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-800 dark:text-green-300 text-sm font-semibold">
                ✅ Download Complete!
              </p>
              {currentTask.downloaded_files &&
                currentTask.downloaded_files.length === 1 && (
                  <a
                    href={api.getDownloadFileUrl(
                      currentTask.downloaded_files[0]
                    )}
                    download={currentTask.downloaded_files[0]}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    ⬇️ Download File
                  </a>
                )}
            </div>
            {currentTask.downloaded_files &&
              currentTask.downloaded_files.length > 0 && (
                <div className="text-green-700 dark:text-green-400 text-xs">
                  <strong>Downloaded Files:</strong>
                  <ul className="ml-4 mt-2 space-y-2">
                    {currentTask.downloaded_files.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded"
                      >
                        <span className="flex items-center gap-1 flex-1 min-w-0">
                          🎬 <span className="truncate">{file}</span>
                        </span>
                        <a
                          href={api.getDownloadFileUrl(file)}
                          download={file}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          ⬇️ Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            <p className="text-green-600 dark:text-green-400 text-xs mt-2 italic">
              💡 Click the download buttons above to save files to your device
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>
          Task ID: {currentTask.task_id?.substring(0, 8) || "Unknown"}...
        </span>
        {isPolling &&
          currentTask.status !== "completed" &&
          currentTask.status !== "error" && (
            <span className="animate-pulse">Updating...</span>
          )}
      </div>
    </div>
  );
}
