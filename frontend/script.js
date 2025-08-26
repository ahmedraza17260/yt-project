const API_BASE = "http://localhost:3000/api";

// DOM elements
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
const formatInfo = document.getElementById("format-info");
const formatText = document.getElementById("format-text");

let currentFormats = [];
let currentUrl = "";

// Hide initially
videoInfo.style.display = "none";
errorMessage.style.display = "none";
loader.style.display = "none";
document.getElementById("dropdown-group").style.display = "none";
downloadBtn.style.display = "none";
formatDetails.style.display = "none";

// Click "Check Formats"
checkBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showError("Please enter a YouTube URL");
    return;
  }
  
  // Validate YouTube URL
  const videoId = extractVideoId(url);
  if (!videoId) {
    showError("Please enter a valid YouTube URL");
    return;
  }

  errorMessage.style.display = "none";
  loader.style.display = "block";
  videoInfo.style.display = "none";
  document.getElementById("dropdown-group").style.display = "none";
  downloadBtn.style.display = "none";
  formatDetails.style.display = "none";

  try {
    // Changed to POST request with JSON body
    const res = await fetch(`${API_BASE}/formats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to fetch formats");
    }

    const data = await res.json();
    currentFormats = data.formats;
    currentUrl = url;

    loader.style.display = "none";
    videoInfo.style.display = "flex";
    
    // Use maxresdefault.jpg for higher quality thumbnail
    thumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    thumbnail.onerror = function() {
      // Fallback to lower quality if maxresdefault doesn't exist
      this.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
    };
    
    videoTitle.textContent = data.title;
    videoChannel.textContent = data.channel || "Unknown Channel";
    
    // Format duration from seconds to MM:SS
    const durationSeconds = parseInt(data.duration) || 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    videoDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Show available formats info
    const resolutionList = [...new Set(data.formats.map(f => f.height).filter(Boolean))].sort((a, b) => a - b);
    formatText.textContent = `Available resolutions: ${resolutionList.join('p, ')}p`;
    formatInfo.style.display = "block";

    // Filter downloadable formats
    const downloadableFormats = currentFormats.filter(f => f.ext && (f.acodec !== "none" || f.vcodec !== "none"));

    formatSelect.innerHTML = `<option value="">-- Select Format --</option>`;
    downloadableFormats.forEach(f => {
      const quality = f.qualityLabel || (f.height ? `${f.height}p` : "Audio");
      const option = document.createElement("option");
      option.value = f.format_id || f.itag; // Use format_id from server response
      option.textContent = `${quality} - ${f.ext.toUpperCase()} (${f.vcodec !== "none" ? f.vcodec : "audio only"})`;
      formatSelect.appendChild(option);
    });

    document.getElementById("dropdown-group").style.display = "block";
  } catch (err) {
    loader.style.display = "none";
    showError(err.message);
    console.error("Error:", err);
  }
});

// Format selection
formatSelect.addEventListener("change", () => {
  const selectedFormatId = formatSelect.value;
  // Find format by format_id (server response) or itag (fallback)
  const format = currentFormats.find(f => (f.format_id || f.itag) == selectedFormatId);

  if (format) {
    formatDetails.style.display = "flex";
    formatType.textContent = format.ext.toUpperCase();
    formatCodec.textContent = `${format.vcodec !== "none" ? format.vcodec : "Audio only"}`;
    formatSize.textContent = format.filesize || format.contentLength
      ? `${((format.filesize || format.contentLength) / (1024 * 1024)).toFixed(2)} MB`
      : "Unknown size";
    downloadBtn.style.display = "block";
  } else {
    formatDetails.style.display = "none";
    downloadBtn.style.display = "none";
  }
});

// Download button - using a form POST method
downloadBtn.addEventListener("click", async () => {
  const formatId = formatSelect.value;
  if (!formatId) return;

  try {
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    downloadBtn.disabled = true;

    // Create a form to submit as POST
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE}/download`;
    
    const urlInput = document.createElement('input');
    urlInput.type = 'hidden';
    urlInput.name = 'url';
    urlInput.value = currentUrl;
    
    const formatInput = document.createElement('input');
    formatInput.type = 'hidden';
    formatInput.name = 'format_id';
    formatInput.value = formatId;
    
    form.appendChild(urlInput);
    form.appendChild(formatInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
  } catch (err) {
    showError("Download failed: " + err.message);
    console.error("Download error:", err);
  } finally {
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Video';
    downloadBtn.disabled = false;
  }
});

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.style.display = "block";
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorMessage.style.display = "none";
  }, 5000);
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Add Enter key support for URL input
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    checkBtn.click();
  }
});
