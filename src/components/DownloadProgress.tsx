import { useEffect, useState } from "react";
import { FuturisticIcons } from "./FuturisticIcons";

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
  getDownloadStatus: (taskId: string) => Promise<DownloadTask>;
  getDownloadFileUrl: (filename: string) => string;
}

interface Props {
  task: DownloadTask;
  api: API;
}

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          icon: <FuturisticIcons.Success />,
          color: "text-green-400",
          bg: "bg-green-500/20",
        };
      case "error":
        return {
          icon: <FuturisticIcons.Error />,
          color: "text-red-400",
          bg: "bg-red-500/20",
        };
      case "downloading":
        return {
          icon: <FuturisticIcons.Download />,
          color: "text-blue-400",
          bg: "bg-blue-500/20",
        };
      case "preparing":
        return {
          icon: <FuturisticIcons.Loading />,
          color: "text-yellow-400",
          bg: "bg-yellow-500/20",
        };
      default:
        return {
          icon: <FuturisticIcons.Loading />,
          color: "text-gray-400",
          bg: "bg-gray-500/20",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center`}
    >
      <div className={config.color}>{config.icon}</div>
    </div>
  );
};

// Animated progress bar
const ProgressBar = ({ status }: { status: string }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "preparing") {
      setProgress(10);
    } else if (status === "downloading") {
      setProgress(30);
      interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 500);
    } else if (status === "completed") {
      setProgress(100);
    } else if (status === "error") {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="progress-bar h-3">
        <div
          className="progress-fill h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default function DownloadProgress({ task, api }: Props) {
  const [currentTask, setCurrentTask] = useState(task);
  const [isPolling, setIsPolling] = useState(true);
  const [downloadFiles, setDownloadFiles] = useState<string[]>([]);

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

        if (data.downloaded_files) {
          setDownloadFiles(data.downloaded_files);
        }

        if (data.status === "completed" || data.status === "error") {
          setIsPolling(false);
        }
      } catch (error) {
        console.error("Error polling download status:", error);
        setIsPolling(false);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [isPolling, currentTask.status, task.task_id, task.download_id, api]);

  const getStatusDisplay = () => {
    switch (currentTask.status) {
      case "completed":
        return { text: "Download Complete", subtext: "Downloaded to device" };
      case "error":
        return {
          text: "Download Failed",
          subtext: currentTask.error || "Unknown error",
        };
      case "downloading":
        return { text: "Downloading...", subtext: "Please wait" };
      case "preparing":
        return { text: "Preparing Download", subtext: "Analyzing video" };
      default:
        return { text: "Processing", subtext: "Initializing" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <StatusIcon status={currentTask.status} />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-lg">
                {statusDisplay.text}
              </h4>
              <p className="text-gray-400 text-sm">{statusDisplay.subtext}</p>
            </div>

            {/* Status Badge */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${
                currentTask.status === "completed"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : currentTask.status === "error"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : currentTask.status === "downloading"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}
            >
              {currentTask.status}
            </div>
          </div>

          {/* Video Info */}
          {currentTask.video_info && (
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
              <h5 className="font-semibold text-white truncate mb-1">
                {currentTask.video_info.title}
              </h5>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>By {currentTask.video_info.uploader}</span>
                <span>•</span>
                <span>{currentTask.video_info.duration}</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {(currentTask.status === "preparing" ||
            currentTask.status === "downloading") && (
            <ProgressBar status={currentTask.status} />
          )}

          {/* Message */}
          <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-600/30">
            <p className="text-gray-300 text-sm">{currentTask.message}</p>
          </div>

          {/* Download Files */}
          {downloadFiles.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-semibold text-white text-sm">
                Available Files:
              </h5>
              <div className="space-y-2">
                {downloadFiles.map((filename, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <span className="text-green-300 font-medium text-sm truncate flex items-center gap-2">
                      <FuturisticIcons.File />
                      {filename}
                    </span>
                    <a
                      href={api.getDownloadFileUrl(filename)}
                      download={filename}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors font-medium flex items-center gap-1"
                    >
                      <FuturisticIcons.Download />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {(currentTask.started_at || currentTask.completed_at) && (
            <div className="text-xs text-gray-500 space-y-1">
              {currentTask.started_at && (
                <div>
                  Started: {new Date(currentTask.started_at).toLocaleString()}
                </div>
              )}
              {currentTask.completed_at && (
                <div>
                  Completed:{" "}
                  {new Date(currentTask.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
