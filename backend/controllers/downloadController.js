const downloadVideoController = async (req, res) => {
  try {
    const { url, format_id } = req.query;   // ✅ read from query

    if (!url || !format_id) {
      return res.status(400).json({ error: "URL and format_id are required" });
    }

    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    res.setHeader("Content-Type", "video/mp4");

    await downloadVideo(url, format_id, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
