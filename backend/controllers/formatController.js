const { getVideoInfo } = require("../utils/ytdlpUtil");

const getFormats = async (req, res) => {
  try {
    const { url } = req.query;  // ✅ Correct for GET request
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const info = await getVideoInfo(url);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getFormats };
