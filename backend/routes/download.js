const express = require("express");
const router = express.Router();
const { downloadVideo } = require("../utils/ytdlpUtil");
const ytdl = require("ytdl-core"); // Keep as fallback if needed

// POST /api/download - using yt-dlp-wrap (your custom utility)
router.post("/", async (req, res) => {
  const { url, format_id } = req.body;
  
  if (!url || !format_id) {
    return res.status(400).json({ error: "Missing parameters: url and format_id are required" });
  }

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log(`Download request: ${url} with format ${format_id}`);
    
    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="video.mp4"`);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Use your yt-dlp utility for download
    await downloadVideo(url, format_id, res);
    
  } catch (err) {
    console.error("Download error:", err);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download video: " + err.message });
    } else {
      // If headers were already sent, we can't send JSON, so end the response
      res.end();
    }
  }
});

// Keep GET endpoint for backward compatibility or direct browser downloads
router.get("/", async (req, res) => {
  const { url, format_id } = req.query;
  
  if (!url || !format_id) {
    return res.status(400).json({ error: "Missing parameters: url and format_id are required" });
  }

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log(`GET Download request: ${url} with format ${format_id}`);
    
    // Use ytdl-core as fallback for GET requests
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: format_id });
    
    if (!format) {
      return res.status(404).json({ error: "Format not found" });
    }

    const ext = format.container || "mp4";
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "_"); // Sanitize filename
    
    res.setHeader("Content-Disposition", `attachment; filename="${title}.${ext}"`);
    res.setHeader("Content-Type", format.mimeType || "video/mp4");
    res.setHeader("Cache-Control", "no-cache");

    ytdl(url, { format }).pipe(res);
    
  } catch (err) {
    console.error("GET Download error:", err);
    
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download video: " + err.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
