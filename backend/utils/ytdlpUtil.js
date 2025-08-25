const YTDlpWrap = require("yt-dlp-wrap").default;

// Initialize yt-dlp (make sure yt-dlp is downloaded in your project folder)
let ytDlp = new YTDlpWrap("./yt-dlp");

// Fetch video info (formats, title, duration, etc.)
const getVideoInfo = async (url) => {
  try {
    const info = await ytDlp.getVideoInfo(url);

    return {
      title: info.title,
      channel: info.channel,
      duration: info.duration_string,
      formats: info.formats.map((format) => ({
        format_id: format.format_id,
        height: format.height,
        ext: format.ext,
        vcodec: format.vcodec,
        acodec: format.acodec,
        filesize: format.filesize,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
};

// Download video in selected format
const downloadVideo = async (url, formatId, response) => {
  try {
    const stream = ytDlp.execStream([
      url,
      "-f",
      formatId,
      "-o",
      "-", // output to stdout
    ]);

    stream.pipe(response);

    stream.on("error", (err) => {
      response.status(500).json({ error: `Download failed: ${err.message}` });
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

module.exports = { getVideoInfo, downloadVideo };
