const express = require("express");
const ytdl = require("ytdl-core");
const path = require("path");
const cors = require("cors");

const app = express();

// Enable CORS
app.use(cors());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "frontend")));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// API: Get video formats
app.get("/api/formats", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

  try {
    console.log("Fetching info for URL:", url);
    const info = await ytdl.getInfo(url);

    const formats = info.formats.map(f => ({
      itag: f.itag,
      ext: f.container || f.ext,
      vcodec: f.vcodec,
      acodec: f.acodec,
      qualityLabel: f.qualityLabel || null,
      audioBitrate: f.audioBitrate || null,
      contentLength: f.contentLength ? parseInt(f.contentLength) : null,
    }));

    res.json({
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      formats,
    });
  } catch (err) {
    console.error("Error fetching formats:", err);
    res.status(500).json({ error: "Failed to fetch formats" });
  }
});

// API: Download video
app.get("/api/download", async (req, res) => {
  const { url, format_id } = req.query;
  if (!url || !format_id) return res.status(400).json({ error: "Missing parameters" });

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: format_id });
    if (!format) return res.status(404).json({ error: "Format not found" });

    const ext = format.container || "mp4";
    res.setHeader("Content-Disposition", `attachment; filename="${info.videoDetails.title}.${ext}"`);
    res.setHeader("Content-Type", "video/mp4");

    ytdl(url, { format }).pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to download video" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
