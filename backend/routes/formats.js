const express = require("express");
const ytdl = require("ytdl-core");
const router = express.Router();

// GET /api/formats?url=YOUTUBE_URL
router.get("/formats", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

  try {
    const info = await ytdl.getInfo(url);

    // Map only relevant format info
    const formats = info.formats.map(f => ({
      itag: f.itag,
      ext: f.container || f.ext,
      vcodec: f.vcodec,
      acodec: f.acodec,
      qualityLabel: f.qualityLabel,
      audioBitrate: f.audioBitrate,
      contentLength: f.contentLength ? parseInt(f.contentLength) : null,
    }));

    res.json({
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      formats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch formats" });
  }
});

module.exports = router;
