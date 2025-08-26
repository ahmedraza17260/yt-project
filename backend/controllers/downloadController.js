const { downloadVideo } = require("../utils/ytdlpUtil");
const ytdl = require("ytdl-core");

// For POST requests (from your frontend)
const downloadVideoPostController = async (req, res) => {
  try {
    const { url, format_id } = req.body;

    if (!url || !format_id) {
      return res.status(400).json({ error: "URL and format_id are required" });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-cache");

    await downloadVideo(url, format_id, res);

  } catch (error) {
    console.error("POST Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
};

// For GET requests (direct browser access)
const downloadVideoGetController = async (req, res) => {
  try {
    const { url, format_id } = req.query;

    if (!url || !format_id) {
      return res.status(400).json({ error: "URL and format_id are required" });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-cache");

    await downloadVideo(url, format_id, res);

  } catch (error) {
    console.error("GET Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
};

module.exports = { downloadVideoPostController, downloadVideoGetController };
