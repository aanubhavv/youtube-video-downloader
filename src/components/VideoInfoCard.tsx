import Image from "next/image";

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

interface Props {
  videoInfo: VideoInfo;
}

export default function VideoInfoCard({ videoInfo }: Props) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail */}
        <div className="md:w-80 flex-shrink-0">
          {videoInfo.thumbnail && (
            <Image
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              width={320}
              height={180}
              className="w-full h-48 md:h-auto object-cover rounded-lg"
              unoptimized
            />
          )}
        </div>

        {/* Video Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {videoInfo.title}
          </h2>

          <div className="space-y-2 text-gray-600 dark:text-gray-300">
            <p>
              <strong>Channel:</strong> {videoInfo.uploader}
            </p>
            <p>
              <strong>Duration:</strong> {formatDuration(videoInfo.duration)}
            </p>
            <p>
              <strong>Views:</strong> {formatViewCount(videoInfo.view_count)}
            </p>
            <p>
              <strong>Upload Date:</strong> {formatDate(videoInfo.upload_date)}
            </p>
          </div>

          {videoInfo.description && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                {videoInfo.description.substring(0, 300)}
                {videoInfo.description.length > 300 && "..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Available Formats */}
      <div className="mt-6">
        {/* Video Formats */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Available Video Formats ({videoInfo.formats.video_formats.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {videoInfo.formats.video_formats
              .slice(0, 5)
              .map((format, index) => (
                <div
                  key={index}
                  className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {format.width}x{format.height}
                      {format.fps && ` @${format.fps}fps`}
                    </span>
                    <span className="text-gray-500">
                      {format.vcodec && format.vcodec !== "none"
                        ? format.vcodec.split(".")[0]
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    ID: {format.format_id} |
                    {format.filesize
                      ? ` ${(format.filesize / (1024 * 1024)).toFixed(1)}MB`
                      : " Size: N/A"}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recommended Formats */}
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
        <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
          Recommended Video Format
        </h3>
        <div className="text-sm text-green-700 dark:text-green-400">
          <p>Video: {videoInfo.formats.recommended_video || "N/A"}</p>
          <p className="text-xs mt-1 text-green-600 dark:text-green-500">
            * Best available audio format will be automatically selected
          </p>
        </div>
      </div>
    </div>
  );
}
