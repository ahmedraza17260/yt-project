const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const path = require("path");

// Path to store the yt-dlp binary
const YT_DLP_PATH = path.join(__dirname, "yt-dlp");

// Check if yt-dlp exists, if not download it
const initializeYtdlp = async () => {
  if (!fs.existsSync(YT_DLP_PATH)) {
    console.log("Downloading yt-dlp binary...");
    try {
      await YTDlpWrap.downloadFromGithub(YT_DLP_PATH);
      console.log("yt-dlp downloaded successfully");
      
      // Make it executable (Unix systems)
      if (process.platform !== "win32") {
        fs.chmodSync(YT_DLP_PATH, 0o755);
      }
    } catch (error) {
      console.error("Failed to download yt-dlp:", error);
      throw new Error("Could not download yt-dlp binary");
    }
  }
};

// Initialize yt-dlp
let ytDlp;
try {
  initializeYtdlp().then(() => {
    ytDlp = new YTDlpWrap(YT_DLP_PATH);
    console.log("yt-dlp initialized successfully");
  }).catch(error => {
    console.error("Failed to initialize yt-dlp:", error);
  });
} catch (error) {
  console.error("Error setting up yt-dlp:", error);
}

// Fetch video info (formats, title, duration, etc.)
const getVideoInfo = async (url) => {
  try {
    if (!ytDlp) {
      await initializeYtdlp();
      ytDlp = new YTDlpWrap(YT_DLP_PATH);
    }

    const info = await ytDlp.getVideoInfo(url);

    // Filter out formats without video or audio
    const filteredFormats = info.formats
      .filter(format => format.vcodec !== "none" || format.acodec !== "none")
      .map((format) => ({
        format_id: format.format_id,
        height: format.height || null,
        width: format.width || null,
        ext: format.ext || "mp4",
        vcodec: format.vcodec || "none",
        acodec: format.acodec || "none",
        filesize: format.filesize || null,
        quality: format.quality || null,
        fps: format.fps || null
      }));

    return {
      title: info.title || "Unknown Title",
      channel: info.channel || "Unknown Channel",
      duration: info.duration_string || "0:00",
      thumbnail: info.thumbnail || null,
      formats: filteredFormats,
    };
  } catch (error) {
    console.error("Error getting video info:", error);
    throw new Error(`Failed to get video info: ${error.message}`);
  }
};

// Download video in selected format
const downloadVideo = async (url, formatId, response) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ytDlp) {
        await initializeYtdlp();
        ytDlp = new YTDlpWrap(YT_DLP_PATH);
      }

      // First get video info to validate format and get title
      const info = await ytDlp.getVideoInfo(url);
      const format = info.formats.find(f => f.format_id === formatId);
      
      if (!format) {
        throw new Error(`Format ${formatId} not found for this video`);
      }

      const stream = ytDlp.execStream([
        url,
        "-f",
        formatId,
        "--no-playlist",
        "-o",
        "-", // output to stdout
      ]);

      // Handle stream errors
      stream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!response.headersSent) {
          response.status(500).json({ error: `Download failed: ${error.message}` });
        }
        reject(error);
      });

      // Handle when stream ends
      stream.on("end", () => {
        console.log("Download completed successfully");
        resolve();
      });

      // Pipe the stream to response
      stream.pipe(response);

    } catch (error) {
      console.error("Download error:", error);
      if (!response.headersSent) {
        response.status(500).json({ error: `Download failed: ${error.message}` });
      }
      reject(error);
    }
  });
};

module.exports = { getVideoInfo, downloadVideo, initializeYtdlp };
