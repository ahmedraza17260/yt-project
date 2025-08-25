const express = require("express");
const ytdl = require("ytdl-core");
const router = express.Router();

// GET /api/download?url=YOUTUBE_URL&format_id=ITAG
router.get("/download", async (req, res) => {
  const { url, format_id } = req.query;
  if (!url || !format_id) return res.status(400).send("Missing parameters");

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: format_id });
    if (!format) return res.status(404).send("Format not found");

    const ext = format.container || "mp4";
    res.setHeader("Content-Disposition", `attachment; filename="${info.videoDetails.title}.${ext}"`);
    res.setHeader("Content-Type", "video/mp4");

    ytdl(url, { format }).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to download video");
  }
});

module.exports = router;
