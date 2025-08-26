const express = require("express");
const router = express.Router();
const { getVideoInfo } = require("../utils/ytdlpUtil");
const ytdl = require("ytdl-core"); // Keep for validation

// POST /api/formats - using yt-dlp-wrap (your custom utility)
router.post("/", async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL" });
  }

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log(`Formats request for: ${url}`);
    
    // Use your yt-dlp utility to get video info
    const videoInfo = await getVideoInfo(url);
    
    res.json({
      title: videoInfo.title,
      channel: videoInfo.channel,
      duration: videoInfo.duration,
      formats: videoInfo.formats,
      thumbnail: videoInfo.thumbnail
    });
    
  } catch (err) {
    console.error("Formats error:", err);
    res.status(500).json({ error: "Failed to fetch formats: " + err.message });
  }
});

// Keep GET endpoint for backward compatibility or testing
router.get("/", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL" });
  }

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log(`GET Formats request for: ${url}`);
    
    // Use ytdl-core as fallback for GET requests
    const info = await ytdl.getInfo(url);

    const formats = info.formats
      .filter(f => f.vcodec !== "none" || f.acodec !== "none") // Filter out useless formats
      .map(f => ({
        format_id: f.itag.toString(), // Convert to string to match frontend expectation
        height: f.height || null,
        ext: f.container || "mp4",
        vcodec: f.vcodec || "none",
        acodec: f.acodec || "none",
        filesize: f.contentLength ? parseInt(f.contentLength) : null,
        quality: f.qualityLabel || null
      }));

    res.json({
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      formats,
      thumbnail: info.videoDetails.thumbnails[0]?.url || null
    });
    
  } catch (err) {
    console.error("GET Formats error:", err);
    res.status(500).json({ error: "Failed to fetch formats: " + err.message });
  }
});

module.exports = router;
