import Image from "next/image";
import { useState } from "react";

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

interface Props {
  videoInfo: VideoInfo;
  onFormatSelect?: (
    videoFormat: VideoFormat | null,
    audioFormat: AudioFormat | null
  ) => void;
  onDownload?: () => void;
  disabled?: boolean;
}

export default function VideoInfoCard({
  videoInfo,
  onFormatSelect,
  onDownload,
  disabled = false,
}: Props) {
  const [selectedVideoFormat, setSelectedVideoFormat] =
    useState<VideoFormat | null>(null);
  const [selectedAudioFormat, setSelectedAudioFormat] =
    useState<AudioFormat | null>(null);
  const [showAllVideoFormats, setShowAllVideoFormats] = useState(false);
  const [showAllAudioFormats, setShowAllAudioFormats] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [selectedQualityVariants, setSelectedQualityVariants] = useState<
    VideoFormat[]
  >([]);
  const [showAudioVariantsModal, setShowAudioVariantsModal] = useState(false);
  const [selectedLanguageVariants, setSelectedLanguageVariants] = useState<
    AudioFormat[]
  >([]);

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getQualityLabel = (format: VideoFormat) => {
    if (format.height) {
      return `${format.height}p${format.fps ? `@${format.fps}fps` : ""}`;
    }
    return `${format.width}x${format.height || "auto"}`;
  };

  const getLanguageDisplay = (format: AudioFormat) => {
    if (format.language) {
      // Convert language code to display name with flag emojis
      const languageInfo: { [key: string]: { name: string; flag: string } } = {
        en: { name: "English", flag: "🇺🇸" },
        "en-US": { name: "English (US)", flag: "🇺🇸" },
        "en-GB": { name: "English (UK)", flag: "🇬🇧" },
        "en-AU": { name: "English (AU)", flag: "🇦🇺" },
        es: { name: "Spanish", flag: "🇪🇸" },
        "es-ES": { name: "Spanish (Spain)", flag: "🇪🇸" },
        "es-MX": { name: "Spanish (Mexico)", flag: "🇲🇽" },
        "es-AR": { name: "Spanish (Argentina)", flag: "🇦🇷" },
        fr: { name: "French", flag: "🇫🇷" },
        "fr-FR": { name: "French (France)", flag: "🇫🇷" },
        "fr-CA": { name: "French (Canada)", flag: "🇨🇦" },
        de: { name: "German", flag: "🇩🇪" },
        "de-DE": { name: "German", flag: "🇩🇪" },
        it: { name: "Italian", flag: "🇮🇹" },
        "it-IT": { name: "Italian", flag: "🇮🇹" },
        pt: { name: "Portuguese", flag: "🇵🇹" },
        "pt-PT": { name: "Portuguese (Portugal)", flag: "🇵🇹" },
        "pt-BR": { name: "Portuguese (Brazil)", flag: "🇧🇷" },
        ru: { name: "Russian", flag: "🇷🇺" },
        "ru-RU": { name: "Russian", flag: "🇷🇺" },
        ja: { name: "Japanese", flag: "🇯🇵" },
        "ja-JP": { name: "Japanese", flag: "🇯🇵" },
        ko: { name: "Korean", flag: "🇰🇷" },
        "ko-KR": { name: "Korean", flag: "🇰🇷" },
        zh: { name: "Chinese", flag: "🇨🇳" },
        "zh-CN": { name: "Chinese (Simplified)", flag: "🇨🇳" },
        "zh-TW": { name: "Chinese (Traditional)", flag: "🇹🇼" },
        hi: { name: "Hindi", flag: "🇮🇳" },
        "hi-IN": { name: "Hindi", flag: "🇮🇳" },
        ar: { name: "Arabic", flag: "🇸🇦" },
        "ar-SA": { name: "Arabic", flag: "🇸🇦" },
        nl: { name: "Dutch", flag: "🇳🇱" },
        "nl-NL": { name: "Dutch", flag: "🇳🇱" },
        sv: { name: "Swedish", flag: "🇸🇪" },
        "sv-SE": { name: "Swedish", flag: "🇸🇪" },
        no: { name: "Norwegian", flag: "🇳🇴" },
        "no-NO": { name: "Norwegian", flag: "🇳🇴" },
        da: { name: "Danish", flag: "🇩🇰" },
        "da-DK": { name: "Danish", flag: "🇩🇰" },
        fi: { name: "Finnish", flag: "🇫🇮" },
        "fi-FI": { name: "Finnish", flag: "🇫🇮" },
        pl: { name: "Polish", flag: "🇵🇱" },
        "pl-PL": { name: "Polish", flag: "🇵🇱" },
        tr: { name: "Turkish", flag: "🇹🇷" },
        "tr-TR": { name: "Turkish", flag: "🇹🇷" },
        th: { name: "Thai", flag: "🇹🇭" },
        "th-TH": { name: "Thai", flag: "🇹🇭" },
        vi: { name: "Vietnamese", flag: "🇻🇳" },
        "vi-VN": { name: "Vietnamese", flag: "🇻🇳" },
        uk: { name: "Ukrainian", flag: "🇺🇦" },
        "uk-UA": { name: "Ukrainian", flag: "🇺🇦" },
        cs: { name: "Czech", flag: "🇨🇿" },
        "cs-CZ": { name: "Czech", flag: "🇨🇿" },
        hu: { name: "Hungarian", flag: "🇭🇺" },
        "hu-HU": { name: "Hungarian", flag: "🇭🇺" },
        ro: { name: "Romanian", flag: "🇷🇴" },
        "ro-RO": { name: "Romanian", flag: "🇷🇴" },
        bg: { name: "Bulgarian", flag: "🇧🇬" },
        "bg-BG": { name: "Bulgarian", flag: "🇧🇬" },
        hr: { name: "Croatian", flag: "🇭🇷" },
        "hr-HR": { name: "Croatian", flag: "🇭🇷" },
        sk: { name: "Slovak", flag: "🇸🇰" },
        "sk-SK": { name: "Slovak", flag: "🇸🇰" },
        sl: { name: "Slovenian", flag: "🇸🇮" },
        "sl-SI": { name: "Slovenian", flag: "🇸🇮" },
        et: { name: "Estonian", flag: "🇪🇪" },
        "et-EE": { name: "Estonian", flag: "🇪🇪" },
        lv: { name: "Latvian", flag: "🇱🇻" },
        "lv-LV": { name: "Latvian", flag: "🇱🇻" },
        lt: { name: "Lithuanian", flag: "🇱🇹" },
        "lt-LT": { name: "Lithuanian", flag: "🇱🇹" },
      };

      const langInfo =
        languageInfo[format.language.toLowerCase()] ||
        languageInfo[format.language.split("-")[0]?.toLowerCase()];

      if (langInfo) {
        return { name: langInfo.name, flag: langInfo.flag };
      } else {
        // Fallback for unknown languages - make them more readable
        const cleanLang = format.language
          .replace(/[-_]/g, " ")
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
        return { name: cleanLang, flag: "🌐" };
      }
    }
    return { name: "Unknown Language", flag: "❓" };
  };

  const handleVideoFormatSelect = (format: VideoFormat) => {
    setSelectedVideoFormat(format);
    onFormatSelect?.(format, selectedAudioFormat);
  };

  const handleAudioFormatSelect = (format: AudioFormat) => {
    setSelectedAudioFormat(format);
    onFormatSelect?.(selectedVideoFormat, format);
  };

  const showVideoVariants = (formats: VideoFormat[]) => {
    setSelectedQualityVariants(formats);
    setShowVariantsModal(true);
  };

  const showAudioVariants = (formats: AudioFormat[]) => {
    setSelectedLanguageVariants(formats);
    setShowAudioVariantsModal(true);
  };

  // Group and sort video formats
  const groupedVideoFormats = videoInfo.formats.video_formats.reduce(
    (acc, format) => {
      const quality = format.height || 0;
      if (!acc[quality]) acc[quality] = [];
      acc[quality].push(format);
      return acc;
    },
    {} as { [key: number]: VideoFormat[] }
  );

  const sortedQualities = Object.keys(groupedVideoFormats)
    .map(Number)
    .sort((a, b) => b - a);

  // Group audio formats by language
  const groupedAudioFormats = videoInfo.formats.audio_formats.reduce(
    (acc, format) => {
      const language = format.language || "unknown";
      if (!acc[language]) acc[language] = [];
      acc[language].push(format);
      return acc;
    },
    {} as { [key: string]: AudioFormat[] }
  );

  // Sort audio formats within each language group by quality
  Object.keys(groupedAudioFormats).forEach((language) => {
    groupedAudioFormats[language].sort((a, b) => (b.abr || 0) - (a.abr || 0));
  });

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

      {/* Enhanced Format Selection */}
      <div className="mt-8 space-y-8">
        {/* Video Format Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              📹 Select Video Quality
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {videoInfo.formats.video_formats.length} formats available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedQualities
              .slice(0, showAllVideoFormats ? undefined : 6)
              .map((quality) => {
                const formats = groupedVideoFormats[quality];
                const bestFormat = formats[0]; // First one should be the best for that resolution

                // Check if any format in this quality group is selected
                const selectedFormat = formats.find(
                  (f) => selectedVideoFormat?.format_id === f.format_id
                );
                const isSelected = !!selectedFormat;

                // Use selected format info if available, otherwise use best format
                const displayFormat = selectedFormat || bestFormat;
                const isVariantSelected =
                  selectedFormat &&
                  selectedFormat.format_id !== bestFormat.format_id;

                return (
                  <div
                    key={quality}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      disabled
                        ? "cursor-wait opacity-50"
                        : "cursor-pointer hover:shadow-md"
                    } ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div
                      onClick={
                        disabled
                          ? undefined
                          : () => handleVideoFormatSelect(displayFormat)
                      }
                      className={disabled ? "cursor-wait" : "cursor-pointer"}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="video-format"
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() =>
                              handleVideoFormatSelect(displayFormat)
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-bold text-lg text-gray-900 dark:text-white">
                            {getQualityLabel(displayFormat)}
                          </span>
                        </div>
                        {quality >= 1080 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium rounded">
                            HD
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Codec:</span>
                          <span className="font-medium">
                            {displayFormat.vcodec?.split(".")[0] || "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span className="font-medium">
                            {displayFormat.filesize
                              ? formatFileSize(displayFormat.filesize)
                              : "Size not available"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bitrate:</span>
                          <span className="font-medium">
                            {displayFormat.tbr
                              ? `${Math.round(displayFormat.tbr)} kbps`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {formats.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showVideoVariants(formats);
                        }}
                        className="mt-2 w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        📋 View {formats.length} variant
                        {formats.length > 1 ? "s" : ""} with different codecs &
                        sizes
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {videoInfo.formats.video_formats.length > 6 && (
            <div className="mt-4 text-center">
              <button
                onClick={
                  disabled
                    ? undefined
                    : () => setShowAllVideoFormats(!showAllVideoFormats)
                }
                disabled={disabled}
                className={`px-4 py-2 font-medium transition-colors ${
                  disabled
                    ? "text-gray-400 cursor-wait"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                }`}
              >
                {showAllVideoFormats
                  ? "Show Less"
                  : `Show All ${videoInfo.formats.video_formats.length} Formats`}
              </button>
            </div>
          )}
        </div>

        {/* Audio Format/Language Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              🎵 Select Audio Language & Quality
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Object.keys(groupedAudioFormats).length} language
              {Object.keys(groupedAudioFormats).length !== 1 ? "s" : ""}{" "}
              available
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(groupedAudioFormats)
              .slice(0, showAllAudioFormats ? undefined : 4)
              .map(([language, formats]) => {
                const bestFormat = formats[0]; // Highest quality for this language

                // Check if any format in this language group is selected
                const selectedFormat = formats.find(
                  (f) => selectedAudioFormat?.format_id === f.format_id
                );
                const isSelected = !!selectedFormat;

                // Use selected format info if available, otherwise use best format
                const displayFormat = selectedFormat || bestFormat;
                const isVariantSelected =
                  selectedFormat &&
                  selectedFormat.format_id !== bestFormat.format_id;

                return (
                  <div
                    key={language}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      disabled
                        ? "cursor-wait opacity-50"
                        : "cursor-pointer hover:shadow-sm"
                    } ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div
                      onClick={
                        disabled
                          ? undefined
                          : () => handleAudioFormatSelect(displayFormat)
                      }
                      className={`flex items-center space-x-4 flex-1 ${
                        disabled ? "cursor-wait" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="audio-format"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => handleAudioFormatSelect(displayFormat)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900 dark:text-white flex items-center space-x-1">
                            <span>
                              {getLanguageDisplay(displayFormat).flag}
                            </span>
                            <span>
                              {getLanguageDisplay(displayFormat).name}
                            </span>
                          </span>
                          {language === "en" && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {displayFormat.acodec?.toUpperCase() || "Unknown"} •{" "}
                          {displayFormat.abr || "N/A"} kbps
                          {displayFormat.filesize
                            ? ` • ${formatFileSize(displayFormat.filesize)}`
                            : " • Size not available"}
                        </div>
                        {formats.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showAudioVariants(formats);
                            }}
                            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            🎧 View {formats.length} quality option
                            {formats.length > 1 ? "s" : ""}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {isVariantSelected ? "Selected:" : "Best:"}{" "}
                        {displayFormat.abr || "N/A"} kbps
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {Object.keys(groupedAudioFormats).length > 4 && (
            <div className="mt-4 text-center">
              <button
                onClick={
                  disabled
                    ? undefined
                    : () => setShowAllAudioFormats(!showAllAudioFormats)
                }
                disabled={disabled}
                className={`px-4 py-2 font-medium transition-colors ${
                  disabled
                    ? "text-gray-400 cursor-wait"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                }`}
              >
                {showAllAudioFormats
                  ? "Show Less"
                  : `Show All ${
                      Object.keys(groupedAudioFormats).length
                    } Languages`}
              </button>
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {(selectedVideoFormat || selectedAudioFormat) && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
              📋 Download Selection Summary
            </h4>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-400">
              <div>
                <strong>Video:</strong>{" "}
                {selectedVideoFormat
                  ? `${getQualityLabel(selectedVideoFormat)} (${
                      selectedVideoFormat.vcodec?.split(".")[0] || "Unknown"
                    })`
                  : "None selected"}
              </div>
              <div>
                <strong>Audio:</strong>{" "}
                {selectedAudioFormat
                  ? `${getLanguageDisplay(selectedAudioFormat).flag} ${
                      getLanguageDisplay(selectedAudioFormat).name
                    } - ${selectedAudioFormat.abr || "N/A"} kbps (${
                      selectedAudioFormat.acodec?.toUpperCase() || "Unknown"
                    })`
                  : "None selected"}
              </div>
              {selectedVideoFormat && selectedAudioFormat && (
                <div className="pt-2 border-t border-green-300 dark:border-green-700">
                  <strong>Estimated Total Size:</strong>{" "}
                  {(() => {
                    const videoSize = selectedVideoFormat.filesize || 0;
                    const audioSize = selectedAudioFormat.filesize || 0;
                    const totalSize = videoSize + audioSize;
                    return totalSize > 0
                      ? formatFileSize(totalSize)
                      : "Unknown";
                  })()}
                </div>
              )}
            </div>

            {selectedVideoFormat && selectedAudioFormat && onDownload && (
              <button
                onClick={onDownload}
                disabled={disabled}
                className={`mt-4 w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                  disabled
                    ? "bg-gray-400 text-gray-200 cursor-wait"
                    : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                }`}
              >
                {disabled ? "Processing..." : "Download Selected Formats"}
              </button>
            )}
          </div>
        )}

        {/* Fallback Info */}
        {videoInfo.formats.video_formats.length === 0 &&
          videoInfo.formats.audio_formats.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                ❌ No formats available for custom selection
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Use the quick download option above with automatic format
                selection
              </p>
            </div>
          )}
      </div>

      {/* Video Variants Modal */}
      {showVariantsModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  📹 Choose Video Format Variant
                </h3>
                <button
                  onClick={() => setShowVariantsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Different variants with same resolution but different codecs,
                file sizes, and bitrates
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedQualityVariants.map((format, index) => {
                  const isSelected =
                    selectedVideoFormat?.format_id === format.format_id;

                  return (
                    <div
                      key={format.format_id}
                      onClick={() => {
                        handleVideoFormatSelect(format);
                        setShowVariantsModal(false);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleVideoFormatSelect(format)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-bold text-lg text-gray-900 dark:text-white">
                            Variant {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {index === 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-medium rounded">
                              Recommended
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium rounded">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Quality:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {getQualityLabel(format)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Codec:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {format.vcodec?.split(".")[0] || "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            File Size:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {format.filesize
                              ? formatFileSize(format.filesize)
                              : "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Bitrate:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {format.tbr
                              ? `${Math.round(format.tbr)} kbps`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Format ID:
                          </span>
                          <span className="font-mono text-xs text-gray-900 dark:text-white">
                            {format.format_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Variants Modal */}
      {showAudioVariantsModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  🎵 Choose Audio Quality Variant
                </h3>
                <button
                  onClick={() => setShowAudioVariantsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Different quality options for{" "}
                {selectedLanguageVariants[0] &&
                  getLanguageDisplay(selectedLanguageVariants[0]).name}{" "}
                audio
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedLanguageVariants.map((format, index) => {
                  const isSelected =
                    selectedAudioFormat?.format_id === format.format_id;
                  const langInfo = getLanguageDisplay(format);

                  return (
                    <div
                      key={format.format_id}
                      onClick={() => {
                        handleAudioFormatSelect(format);
                        setShowAudioVariantsModal(false);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleAudioFormatSelect(format)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{langInfo.flag}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {langInfo.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {index === 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-medium rounded">
                                Best Quality
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium rounded">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {format.abr || "N/A"} kbps
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {format.acodec?.toUpperCase() || "Unknown"}
                          </div>
                          {format.filesize && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {formatFileSize(format.filesize)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
