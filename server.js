const express = require("express");
const ytdl = require("ytdl-core");
const path = require("path");
const cors = require("cors");

const app = express();

// Enable CORS with specific options for security
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "frontend")));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// API: Get video formats - Changed to POST to match frontend
app.post("/api/formats", async (req, res) => {
  const { url } = req.body; // Changed from req.query to req.body
  
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL" });
  }
  
  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    console.log("Fetching info for URL:", url);
    const info = await ytdl.getInfo(url);

    const formats = info.formats
      .filter(f => f.hasVideo || f.hasAudio) // Only include formats with video or audio
      .map(f => ({
        format_id: f.itag.toString(), // Changed from itag to format_id to match frontend
        height: f.height || null,
        ext: f.container || "mp4",
        vcodec: f.videoCodec || null,
        acodec: f.audioCodec || null,
        filesize: f.contentLength ? parseInt(f.contentLength) : null,
        quality: f.qualityLabel || null
      }));

    res.json({
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      formats,
    });
  } catch (err) {
    console.error("Error fetching formats:", err);
    res.status(500).json({ error: "Failed to fetch formats: " + err.message });
  }
});

// API: Download video - Changed to POST to match frontend
app.post("/api/download", async (req, res) => {
  const { url, format_id } = req.body; // Changed from req.query to req.body
  
  if (!url || !format_id) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  
  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: format_id });
    
    if (!format) {
      return res.status(404).json({ error: "Format not found" });
    }

    const ext = format.container || "mp4";
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
    
    res.setHeader("Content-Disposition", `attachment; filename="${title}.${ext}"`);
    res.setHeader("Content-Type", format.mimeType || "video/mp4");

    ytdl(url, { format }).pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to download video: " + err.message });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
