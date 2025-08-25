const API_BASE = "http://localhost:3000/api";

const urlInput = document.getElementById("youtube-url");
const checkBtn = document.getElementById("check-btn");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const loader = document.getElementById("loader");
const videoInfo = document.getElementById("video-info");
const thumbnail = document.getElementById("thumbnail");
const videoTitle = document.getElementById("video-title");
const videoChannel = document.getElementById("video-channel");
const videoDuration = document.getElementById("video-duration");
const formatSelect = document.getElementById("format-select");
const formatDetails = document.getElementById("format-details");
const formatType = document.getElementById("format-type");
const formatCodec = document.getElementById("format-codec");
const formatSize = document.getElementById("format-size");
const downloadBtn = document.getElementById("download-btn");

let currentFormats = [];
let currentUrl = "";

// Hide initially
videoInfo.style.display = "none";
errorMessage.style.display = "none";
loader.style.display = "none";
document.getElementById("dropdown-group").style.display = "none";
downloadBtn.style.display = "none";

// Click "Check Formats"
checkBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    showError("Please enter a valid YouTube URL");
    return;
  }

  errorMessage.style.display = "none";
  loader.style.display = "block";
  videoInfo.style.display = "none";
  document.getElementById("dropdown-group").style.display = "none";
  downloadBtn.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/formats?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error("Failed to fetch formats");

    const data = await res.json();
    currentFormats = data.formats;
    currentUrl = url;

    loader.style.display = "none";
    videoInfo.style.display = "flex";
    thumbnail.src = `https://img.youtube.com/vi/${extractVideoId(url)}/0.jpg`;
    videoTitle.textContent = data.title;
    videoChannel.textContent = data.channel || "Unknown";
    videoDuration.textContent = data.duration || "00:00";

    // Filter downloadable formats
    const downloadableFormats = currentFormats.filter(f => f.ext && (f.acodec !== "none" || f.vcodec !== "none"));

    formatSelect.innerHTML = `<option value="">-- Select Format --</option>`;
    downloadableFormats.forEach(f => {
      const quality = f.qualityLabel || (f.audioBitrate ? f.audioBitrate + " kbps" : "Unknown");
      const option = document.createElement("option");
      option.value = f.itag; // use itag from API
      option.textContent = `${f.ext.toUpperCase()} - ${quality}`;
      formatSelect.appendChild(option);
    });

    document.getElementById("dropdown-group").style.display = "block";
  } catch (err) {
    loader.style.display = "none";
    showError(err.message);
  }
});

// Format selection
formatSelect.addEventListener("change", () => {
  const selectedItag = formatSelect.value;
  const format = currentFormats.find(f => f.itag == selectedItag);

  if (format) {
    formatDetails.style.display = "flex";
    formatType.textContent = format.ext.toUpperCase();
    formatCodec.textContent = `${format.vcodec !== "none" ? format.vcodec : "no video"} / ${format.acodec !== "none" ? format.acodec : "no audio"}`;
    formatSize.textContent = format.contentLength
      ? `${(format.contentLength / (1024 * 1024)).toFixed(2)} MB`
      : "Unknown size";
    downloadBtn.style.display = "inline-block";
  } else {
    formatDetails.style.display = "none";
    downloadBtn.style.display = "none";
  }
});

// Download button
downloadBtn.addEventListener("click", () => {
  const itag = formatSelect.value;
  if (!itag) return;

  const downloadUrl = `${API_BASE}/download?url=${encodeURIComponent(currentUrl)}&format_id=${itag}`;
  window.open(downloadUrl, "_blank");
});

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.style.display = "block";
}

// Extract video ID
function extractVideoId(url) {
  const match = url.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}
