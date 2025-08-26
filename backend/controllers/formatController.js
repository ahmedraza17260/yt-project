const { getVideoInfo } = require("../utils/ytdlpUtil");
const ytdl = require("ytdl-core");

// For POST requests (from your frontend)
const getFormatsPost = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log(`POST - Fetching formats for: ${url}`);
    const info = await getVideoInfo(url);
    
    res.json(info);
    
  } catch (error) {
    console.error("POST Formats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// For GET requests (direct browser access or testing)
const getFormatsGet = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log(`GET - Fetching formats for: ${url}`);
    const info = await getVideoInfo(url);
    
    res.json(info);
    
  } catch (error) {
    console.error("GET Formats error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getFormatsPost, getFormatsGet };
