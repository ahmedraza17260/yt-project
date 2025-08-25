const ytdlp = require("yt-dlp-exec");

(async () => {
  try {
    const result = await ytdlp("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });
    console.log("yt-dlp is working ✅");
    console.log(result.title);
  } catch (err) {
    console.error("yt-dlp failed ❌", err);
  }
})();
