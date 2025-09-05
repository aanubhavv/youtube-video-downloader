import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { FuturisticIcons } from "./FuturisticIcons";

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
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<string>("");
  const [selectedAudioLanguage, setSelectedAudioLanguage] =
    useState<string>("");
  const [videoFormatMenuOpen, setVideoFormatMenuOpen] = useState<string>("");
  const [audioFormatMenuOpen, setAudioFormatMenuOpen] = useState<string>("");

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown-container]")) {
        setVideoFormatMenuOpen("");
        setAudioFormatMenuOpen("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    } else {
      return `${format.width}x${format.height || "auto"}`;
    }
  };

  const getLanguageDisplay = (format: AudioFormat) => {
    const languageInfo: { [key: string]: { name: string; flag: string } } = {
      en: { name: "English", flag: "🇺🇸" },
      "en-US": { name: "English (US)", flag: "🇺🇸" },
      "en-GB": { name: "English (UK)", flag: "🇬🇧" },
      es: { name: "Spanish", flag: "🇪🇸" },
      fr: { name: "French", flag: "🇫🇷" },
      de: { name: "German", flag: "🇩🇪" },
      it: { name: "Italian", flag: "🇮🇹" },
      pt: { name: "Portuguese", flag: "🇵🇹" },
      ru: { name: "Russian", flag: "🇷🇺" },
      ja: { name: "Japanese", flag: "🇯🇵" },
      ko: { name: "Korean", flag: "🇰🇷" },
      zh: { name: "Chinese", flag: "🇨🇳" },
      hi: { name: "Hindi", flag: "🇮🇳" },
      ar: { name: "Arabic", flag: "🇸🇦" },
    };

    if (format.language) {
      const lang =
        languageInfo[format.language] ||
        languageInfo[format.language.split("-")[0]];
      return lang ? `${lang.flag} ${lang.name}` : format.language.toUpperCase();
    } else {
      return "🌐 Default";
    }
  };

  const handleVideoFormatSelect = (format: VideoFormat) => {
    const newFormat =
      selectedVideoFormat?.format_id === format.format_id ? null : format;
    setSelectedVideoFormat(newFormat);
    onFormatSelect?.(newFormat, selectedAudioFormat);
  };

  const handleAudioFormatSelect = (format: AudioFormat) => {
    const newFormat =
      selectedAudioFormat?.format_id === format.format_id ? null : format;
    setSelectedAudioFormat(newFormat);
    onFormatSelect?.(selectedVideoFormat, newFormat);
  };

  // Show all video formats, sorted by quality and bitrate
  const sortedVideoFormats = videoInfo.formats.video_formats
    .filter((format) => format.height && format.width) // Only show formats with valid dimensions
    .sort((a, b) => {
      // First sort by height (quality)
      const heightDiff = (b.height || 0) - (a.height || 0);
      if (heightDiff !== 0) return heightDiff;
      // Then by bitrate for same quality
      return (b.tbr || 0) - (a.tbr || 0);
    });

  // Show all audio formats, sorted by bitrate and language
  const sortedAudioFormats = videoInfo.formats.audio_formats
    .filter((format) => format.acodec && format.acodec !== "none")
    .sort((a, b) => {
      // First sort by bitrate
      const bitrateA = a.abr || a.tbr || 0;
      const bitrateB = b.abr || b.tbr || 0;
      const bitrateDiff = bitrateB - bitrateA;
      if (bitrateDiff !== 0) return bitrateDiff;
      // Then by language preference
      return (b.language_preference || 0) - (a.language_preference || 0);
    });

  // Group video formats by quality
  const groupedVideoFormats = sortedVideoFormats.reduce((acc, format) => {
    const quality = getQualityLabel(format);
    if (!acc[quality]) {
      acc[quality] = [];
    }
    acc[quality].push(format);
    return acc;
  }, {} as Record<string, VideoFormat[]>);

  // Group audio formats by language
  const groupedAudioFormats = sortedAudioFormats.reduce((acc, format) => {
    const language = getLanguageDisplay(format);
    if (!acc[language]) {
      acc[language] = [];
    }
    acc[language].push(format);
    return acc;
  }, {} as Record<string, AudioFormat[]>);

  const getSelectedVideoFormatFromGroup = (
    quality: string
  ): VideoFormat | null => {
    const formats = groupedVideoFormats[quality];
    if (!formats || formats.length === 0) return null;

    // If user selected a specific format, return it
    const selected = formats.find(
      (f) => f.format_id === selectedVideoFormat?.format_id
    );
    if (selected) return selected;

    // Otherwise return the best quality format from the group (highest bitrate)
    return formats[0];
  };

  const getSelectedAudioFormatFromGroup = (
    language: string
  ): AudioFormat | null => {
    const formats = groupedAudioFormats[language];
    if (!formats || formats.length === 0) return null;

    // If user selected a specific format, return it
    const selected = formats.find(
      (f) => f.format_id === selectedAudioFormat?.format_id
    );
    if (selected) return selected;

    // Otherwise return the best quality format from the group (highest bitrate)
    return formats[0];
  };

  const getDisplayFormatForVideo = (
    quality: string,
    formats: VideoFormat[]
  ): VideoFormat => {
    // If there's a selected video format that belongs to this quality group, show its info
    const selectedFormat = formats.find(
      (f) => f.format_id === selectedVideoFormat?.format_id
    );
    return selectedFormat || formats[0];
  };

  const getDisplayFormatForAudio = (
    language: string,
    formats: AudioFormat[]
  ): AudioFormat => {
    // If there's a selected audio format that belongs to this language group, show its info
    const selectedFormat = formats.find(
      (f) => f.format_id === selectedAudioFormat?.format_id
    );
    return selectedFormat || formats[0];
  };

  return (
    <div className="card-base p-8 space-y-8">
      {/* Video Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Thumbnail */}
        <div className="relative lg:w-80 lg:flex-shrink-0">
          <div className="relative aspect-video rounded-xl overflow-hidden group">
            <Image
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                  ⏱️ {formatDuration(videoInfo.duration)}
                </span>
                <span className="px-2 py-1 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                  👁️ {formatViewCount(videoInfo.view_count)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-3">
              {videoInfo.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <FuturisticIcons.User />
                </div>
                <span className="font-semibold">{videoInfo.uploader}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm">
                  {formatDate(videoInfo.upload_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Description Preview */}
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
              {videoInfo.description || "No description available."}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
              <div className="text-xl font-bold text-blue-400">
                {Object.keys(groupedVideoFormats).length}
              </div>
              <div className="text-xs text-gray-400">Video Qualities</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm">
              <div className="text-xl font-bold text-green-400">
                {Object.keys(groupedAudioFormats).length}
              </div>
              <div className="text-xs text-gray-400">Audio Languages</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg backdrop-blur-sm">
              <div className="text-xl font-bold text-purple-400">
                {Math.max(...sortedVideoFormats.map((f) => f.height || 0))}p
              </div>
              <div className="text-xs text-gray-400">Max Quality</div>
            </div>
            <div className="text-center p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
              <div className="text-xl font-bold text-cyan-400">
                {formatDuration(videoInfo.duration)}
              </div>
              <div className="text-xs text-gray-400">Duration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div className="space-y-6">
        {/* Video Formats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <FuturisticIcons.Video />
              </div>
              Video Formats
            </h3>
            {Object.keys(groupedVideoFormats).length > 6 && (
              <button
                onClick={() => setShowAllVideoFormats(!showAllVideoFormats)}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors cursor-pointer"
              >
                {showAllVideoFormats
                  ? "Show Less"
                  : `Show All (${Object.keys(groupedVideoFormats).length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(groupedVideoFormats)
              .slice(0, showAllVideoFormats ? undefined : 6)
              .map(([quality, formats]) => (
                <div key={quality} className="relative" data-dropdown-container>
                  <button
                    onClick={() => {
                      // Close all dropdown menus
                      setVideoFormatMenuOpen("");
                      setAudioFormatMenuOpen("");

                      if (selectedVideoQuality === quality) {
                        // Deselect if clicking on already selected quality
                        setSelectedVideoQuality("");
                        setSelectedVideoFormat(null);
                        onFormatSelect?.(null, selectedAudioFormat);
                      } else {
                        // Select the best format from this quality group
                        setSelectedVideoQuality(quality);
                        setSelectedVideoFormat(formats[0]);
                        onFormatSelect?.(formats[0], selectedAudioFormat);
                      }
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 hover-lift cursor-pointer relative ${
                      selectedVideoQuality === quality
                        ? "border-blue-500 bg-blue-500/20 glow-electric"
                        : "border-gray-600/50 bg-gray-800/30 hover:border-blue-400/50 hover:bg-blue-500/10"
                    }`}
                  >
                    {parseInt(quality) >= 1080 && (
                      <span className="absolute bottom-4 right-4 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                        HD
                      </span>
                    )}
                    <div className="text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white">
                          {quality}
                        </span>
                        <div className="flex items-center gap-2">
                          {formats.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoFormatMenuOpen(
                                  videoFormatMenuOpen === quality ? "" : quality
                                );
                              }}
                              className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white px-2 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              {formats.length} variants
                            </button>
                          )}
                          {selectedVideoQuality === quality && (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <FuturisticIcons.Check />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        {(() => {
                          const displayFormat = getDisplayFormatForVideo(
                            quality,
                            formats
                          );
                          return (
                            <>
                              <div>
                                Size: {formatFileSize(displayFormat.filesize)}
                              </div>
                              {displayFormat.tbr && (
                                <div>
                                  Bitrate: {Math.round(displayFormat.tbr)} kbps
                                </div>
                              )}
                              {displayFormat.fps && (
                                <div>FPS: {displayFormat.fps}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </button>

                  {/* Dropdown menu for multiple variants */}
                  {formats.length > 1 && videoFormatMenuOpen === quality && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-10">
                      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 bg-gray-700 text-xs font-semibold text-gray-300">
                          Choose Variant:
                        </div>
                        {formats.map((format) => (
                          <button
                            key={format.format_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Close all dropdown menus
                              setVideoFormatMenuOpen("");
                              setAudioFormatMenuOpen("");
                              // Set the quality as selected and the specific format
                              setSelectedVideoQuality(quality);
                              setSelectedVideoFormat(format);
                              onFormatSelect?.(format, selectedAudioFormat);
                            }}
                            className={`w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 cursor-pointer ${
                              selectedVideoFormat?.format_id ===
                              format.format_id
                                ? "bg-blue-500/20 text-blue-300"
                                : "text-gray-300"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm">
                                {Math.round(format.tbr || 0)} kbps
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(format.filesize)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Audio Formats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <FuturisticIcons.Audio />
              </div>
              Audio Formats
            </h3>
            {Object.keys(groupedAudioFormats).length > 6 && (
              <button
                onClick={() => setShowAllAudioFormats(!showAllAudioFormats)}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors cursor-pointer"
              >
                {showAllAudioFormats
                  ? "Show Less"
                  : `Show All (${Object.keys(groupedAudioFormats).length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(groupedAudioFormats)
              .slice(0, showAllAudioFormats ? undefined : 6)
              .map(([language, formats]) => (
                <div
                  key={language}
                  className="relative"
                  data-dropdown-container
                >
                  <button
                    onClick={() => {
                      // Close all dropdown menus
                      setVideoFormatMenuOpen("");
                      setAudioFormatMenuOpen("");

                      if (selectedAudioLanguage === language) {
                        // Deselect if clicking on already selected language
                        setSelectedAudioLanguage("");
                        setSelectedAudioFormat(null);
                        onFormatSelect?.(selectedVideoFormat, null);
                      } else {
                        // Select the best format from this language group
                        setSelectedAudioLanguage(language);
                        setSelectedAudioFormat(formats[0]);
                        onFormatSelect?.(selectedVideoFormat, formats[0]);
                      }
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 hover-lift cursor-pointer ${
                      selectedAudioLanguage === language
                        ? "border-green-500 bg-green-500/20 glow-electric"
                        : "border-gray-600/50 bg-gray-800/30 hover:border-green-400/50 hover:bg-green-500/10"
                    }`}
                  >
                    <div className="text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white">
                          {language}
                        </span>
                        <div className="flex items-center gap-2">
                          {formats.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAudioFormatMenuOpen(
                                  audioFormatMenuOpen === language
                                    ? ""
                                    : language
                                );
                              }}
                              className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white px-2 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              {formats.length} variants
                            </button>
                          )}
                          {selectedAudioLanguage === language && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <FuturisticIcons.Check />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        {(() => {
                          const displayFormat = getDisplayFormatForAudio(
                            language,
                            formats
                          );
                          return (
                            <>
                              <div>
                                Size: {formatFileSize(displayFormat.filesize)}
                              </div>
                              {displayFormat.abr && (
                                <div>Bitrate: {displayFormat.abr} kbps</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </button>

                  {/* Dropdown menu for multiple variants */}
                  {formats.length > 1 && audioFormatMenuOpen === language && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-10">
                      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 bg-gray-700 text-xs font-semibold text-gray-300">
                          Choose Variant:
                        </div>
                        {formats.map((format) => (
                          <button
                            key={format.format_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Close all dropdown menus
                              setVideoFormatMenuOpen("");
                              setAudioFormatMenuOpen("");
                              // Set the language as selected and the specific format
                              setSelectedAudioLanguage(language);
                              setSelectedAudioFormat(format);
                              onFormatSelect?.(selectedVideoFormat, format);
                            }}
                            className={`w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 cursor-pointer ${
                              selectedAudioFormat?.format_id ===
                              format.format_id
                                ? "bg-green-500/20 text-green-300"
                                : "text-gray-300"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm">
                                {Math.round(format.abr || format.tbr || 0)} kbps
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(format.filesize)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Selection Summary */}
        {(selectedVideoFormat || selectedAudioFormat) && (
          <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FuturisticIcons.Star />
              Selected Formats
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedVideoFormat && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h5 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                    <FuturisticIcons.Video />
                    Video Format
                  </h5>
                  <div className="text-white text-lg font-bold">
                    {getQualityLabel(selectedVideoFormat)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Size: {formatFileSize(selectedVideoFormat.filesize)}
                    {selectedVideoFormat.tbr &&
                      ` • ${Math.round(selectedVideoFormat.tbr)} kbps`}
                  </div>
                </div>
              )}

              {selectedAudioFormat && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h5 className="font-semibold text-green-300 mb-2 flex items-center gap-2">
                    <FuturisticIcons.Audio />
                    Audio Format
                  </h5>
                  <div className="text-white text-lg font-bold">
                    {getLanguageDisplay(selectedAudioFormat)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Size: {formatFileSize(selectedAudioFormat.filesize)}
                    {selectedAudioFormat.abr &&
                      ` • ${selectedAudioFormat.abr} kbps`}
                  </div>
                </div>
              )}
            </div>

            {/* Download Button */}
            {(selectedVideoFormat || selectedAudioFormat) && (
              <div className="mt-6 pt-4 border-t border-purple-500/20">
                <button
                  onClick={onDownload}
                  disabled={disabled}
                  className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-lg font-semibold relative overflow-hidden group transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600 before:to-purple-600 before:translate-x-[-100%] before:transition-transform before:duration-300 hover:before:translate-x-0 disabled:hover:before:translate-x-[-100%] before:rounded-xl"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <FuturisticIcons.Download />
                    Download Selected Formats
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
