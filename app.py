from flask import Flask, request, jsonify, send_from_directory, render_template_string
from celery import Celery
import subprocess
import os
import uuid
import logging
import shutil

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_url_path='/static')

# Configure Celery
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Create downloads folder
OUTDIR = os.path.join(os.path.dirname(__file__), 'downloads')
if not os.path.exists(OUTDIR):
    os.makedirs(OUTDIR)

# Store task status
TASKS = {}

# Check if FFmpeg is installed
def check_ffmpeg():
    try:
        subprocess.check_output(['ffmpeg', '-version'], stderr=subprocess.STDOUT)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        logger.error("FFmpeg is not installed or not in PATH")
        return False

# Your HTML (same as before, with minor JS tweaks for better status messages)
HTML = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Video Downloader</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body {
            background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #fff;
        }
        .container {
            width: 100%;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        header {
            text-align: center;
            margin-bottom: 30px;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .description {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 20px;
            font-size: 1.1rem;
        }
        .input-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 1.1rem;
        }
        .url-input-container {
            position: relative;
            display: flex;
            align-items: center;
        }
        .url-input-container i {
            position: absolute;
            left: 15px;
            color: #ff4b4b;
            font-size: 20px;
            z-index: 1;
        }
        input[type="text"] {
            width: 100%;
            padding: 15px 15px 15px 50px;
            border: none;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            color: #333;
        }
        input[type="text"]:focus {
            outline: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            background: #fff;
        }
        .option-group {
            margin-bottom: 20px;
            display: none;
        }
        .option-title {
            font-size: 1.2rem;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .option-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        .option-btn {
            padding: 12px;
            background: rgba(255, 255, 255, 0.15);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .option-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }
        .option-btn.selected {
            background: #4CAF50;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        .download-btn {
            width: 100%;
            padding: 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        .download-btn:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        .download-btn:active {
            transform: translateY(0);
        }
        .download-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .loader {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        .loader .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid #ff4b4b;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        .error-message {
            background: rgba(255, 0, 0, 0.2);
            border-left: 4px solid #ff4b4b;
            padding: 12px 15px;
            border-radius: 4px;
            margin-top: 15px;
            display: none;
        }
        .success-message {
            background: rgba(0, 255, 0, 0.2);
            border-left: 4px solid #4CAF50;
            padding: 12px 15px;
            border-radius: 4px;
            margin-top: 15px;
            display: none;
        }
        .download-link {
            margin-top: 10px;
            text-align: center;
        }
        .download-link a {
            color: #4CAF50;
            text-decoration: none;
            font-weight: bold;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        footer {
            margin-top: 40px;
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
        }
        @media (max-width: 600px) {
            h1 {
                font-size: 2rem;
            }
            .option-buttons {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>YouTube Video Downloader</h1>
            <p class="description">Download YouTube videos in various formats and resolutions</p>
        </header>
        
        <div class="input-group">
            <label for="youtube-url"><i class="fas fa-link"></i> YouTube URL</label>
            <div class="url-input-container">
                <i class="fab fa-youtube"></i>
                <input type="text" id="youtube-url" placeholder="https://www.youtube.com/watch?v=..." />
            </div>
        </div>
        
        <div class="option-group" id="type-options">
            <div class="option-title">Select Download Type:</div>
            <div class="option-buttons">
                <button class="option-btn" data-type="video">Video + Audio</button>
                <button class="option-btn" data-type="audio">Audio Only</button>
            </div>
        </div>
        
        <div class="option-group" id="quality-options">
            <div class="option-title">Select Video Quality:</div>
            <div class="option-buttons">
                <button class="option-btn" data-quality="360">360p</button>
                <button class="option-btn" data-quality="480">480p</button>
                <button class="option-btn" data-quality="720">720p</button>
                <button class="option-btn" data-quality="1080">1080p</button>
                <button class="option-btn" data-quality="best">Best Available</button>
            </div>
        </div>
        
        <div class="option-group" id="speed-options">
            <div class="option-title">Select Download Speed:</div>
            <div class="option-buttons">
                <button class="option-btn" data-speed="normal">Normal</button>
                <button class="option-btn" data-speed="fast">Faster</button>
                <button class="option-btn" data-speed="max">Maximum</button>
            </div>
        </div>
        
        <div class="loader" id="loader">
            <div class="spinner"></div>
            <p id="loader-text">Preparing download...</p>
        </div>
        
        <div class="error-message" id="error-message">
            <i class="fas fa-exclamation-circle"></i> <span id="error-text"></span>
        </div>
        
        <div class="success-message" id="success-message">
            <i class="fas fa-check-circle"></i> <span id="success-text"></span>
            <div class="download-link" id="download-link"></div>
        </div>
        
        <button class="download-btn" id="download-btn" disabled>
            <i class="fas fa-download"></i> Start Download
        </button>
        
        <footer>
            <p>YouTube Video Downloader &copy; 2023 | For educational purposes only</p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const urlInput = document.getElementById('youtube-url');
            const typeOptions = document.getElementById('type-options');
            const qualityOptions = document.getElementById('quality-options');
            const speedOptions = document.getElementById('speed-options');
            const downloadBtn = document.getElementById('download-btn');
            const loader = document.getElementById('loader');
            const loaderText = document.getElementById('loader-text');
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');
            const successMessage = document.getElementById('success-message');
            const successText = document.getElementById('success-text');
            const downloadLink = document.getElementById('download-link');
            
            let selectedType = null;
            let selectedQuality = null;
            let selectedSpeed = 'normal';
            let currentUrl = '';
            let taskId = null;
            
            // URL input event
            urlInput.addEventListener('input', function() {
                const url = this.value.trim();
                const isValid = url.includes('youtube.com/') || url.includes('youtu.be/');
                
                if (isValid && url.length > 20) {
                    currentUrl = url;
                    typeOptions.style.display = 'block';
                    checkIfReady();
                } else {
                    typeOptions.style.display = 'none';
                    qualityOptions.style.display = 'none';
                    speedOptions.style.display = 'none';
                    downloadBtn.disabled = true;
                    errorMessage.style.display = 'none';
                    successMessage.style.display = 'none';
                }
            });
            
            // Type selection
            document.querySelectorAll('#type-options .option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#type-options .option-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedType = this.dataset.type;
                    
                    if (selectedType === 'video') {
                        qualityOptions.style.display = 'block';
                    } else {
                        qualityOptions.style.display = 'none';
                        selectedQuality = null;
                    }
                    
                    speedOptions.style.display = 'block';
                    checkIfReady();
                });
            });
            
            // Quality selection
            document.querySelectorAll('#quality-options .option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#quality-options .option-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedQuality = this.dataset.quality;
                    checkIfReady();
                });
            });
            
            // Speed selection
            document.querySelectorAll('#speed-options .option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#speed-options .option-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedSpeed = this.dataset.speed;
                    checkIfReady();
                });
            });
            
            // Check if all options are selected
            function checkIfReady() {
                const isReady = currentUrl && selectedType && 
                              (selectedType !== 'video' || selectedQuality) && 
                              selectedSpeed;
                downloadBtn.disabled = !isReady;
            }
            
            // Download button click
            downloadBtn.addEventListener('click', async function() {
                loader.style.display = 'block';
                loaderText.textContent = 'Starting download...';
                downloadBtn.disabled = true;
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                downloadLink.innerHTML = '';
                
                try {
                    const response = await fetch('/api/download', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: currentUrl,
                            type: selectedType,
                            quality: selectedQuality,
                            speed: selectedSpeed
                        }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        taskId = data.task_id;
                        pollTaskStatus(taskId);
                    } else {
                        showError(data.message);
                        loader.style.display = 'none';
                        downloadBtn.disabled = false;
                    }
                } catch (error) {
                    showError('Failed to start download: ' + error.message);
                    loader.style.display = 'none';
                    downloadBtn.disabled = false;
                }
            });
            
            // Poll task status
            async function pollTaskStatus(taskId) {
                const interval = setInterval(async () => {
                    try {
                        const response = await fetch(`/api/task_status/${taskId}`);
                        const data = await response.json();
                        
                        loaderText.textContent = data.status_message || 'Processing download...';
                        
                        if (data.status === 'SUCCESS') {
                            clearInterval(interval);
                            loader.style.display = 'none';
                            downloadBtn.disabled = false;
                            if (data.success) {
                                showSuccess(data.message);
                                downloadLink.innerHTML = `<a href="${data.download_url}" download>Click here to download the file</a>`;
                            } else {
                                showError(data.message);
                            }
                        } else if (data.status === 'FAILURE') {
                            clearInterval(interval);
                            loader.style.display = 'none';
                            downloadBtn.disabled = false;
                            showError(data.message);
                        }
                    } catch (error) {
                        clearInterval(interval);
                        loader.style.display = 'none';
                        downloadBtn.disabled = false;
                        showError('Error checking task status: ' + error.message);
                    }
                }, 2000);
            }
            
            // Helper functions
            function showError(message) {
                errorText.textContent = message;
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
            }
            
            function showSuccess(message) {
                successText.textContent = message;
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';
            }
            
            // Add Font Awesome dynamically
            const fontAwesome = document.createElement('link');
            fontAwesome.rel = 'stylesheet';
            fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fontAwesome);
        });
    </script>
</body>
</html>
'''

@app.route('/', methods=['GET'])
def index():
    return render_template_string(HTML)

@celery.task(bind=True)
def download_task(self, url, download_type, quality, speed):
    logger.debug(f"Starting download task: {url}, type={download_type}, quality={quality}, speed={speed}")
    
    if not check_ffmpeg():
        return {'success': False, 'message': 'FFmpeg is not installed. Please install FFmpeg and add it to PATH.'}
    
    speed_flag = ''
    if speed == 'fast':
        speed_flag = '--concurrent-fragments 2'
    elif speed == 'max':
        speed_flag = '--concurrent-fragments 3'  # Reduced for stability
    
    cmd_base = ['yt-dlp', '--no-part', '--no-continue'] + (speed_flag.split() if speed_flag else [])
    output_template = os.path.join(OUTDIR, '%(title)s-%(id)s.%(ext)s')

    try:
        if download_type == 'audio':
            self.update_state(state='PROGRESS', meta={'status_message': 'Downloading audio...'})
            cmd = cmd_base + [
                '-f', 'bestaudio[ext=m4a]',
                '--embed-thumbnail', '--add-metadata',
                '-o', output_template, url
            ]
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
            message = 'Audio download completed successfully!'
        elif download_type == 'video':
            if not quality:
                raise ValueError('Quality is required for video')
            
            self.update_state(state='PROGRESS', meta={'status_message': f'Downloading {quality}p video...'})
            # Prioritize pre-merged MP4 if available, else merge with FFmpeg
            if quality == 'best':
                cmd = cmd_base + [
                    '-f', 'bestvideo[vcodec^=avc1][height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best[vcodec^=avc1]',
                    '--merge-output-format', 'mp4',
                    '-o', output_template, url
                ]
            else:
                cmd = cmd_base + [
                    '-f', f'bestvideo[vcodec^=avc1][height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][height<={quality}]/best[vcodec^=avc1][height<={quality}]',
                    '--merge-output-format', 'mp4',
                    '-o', output_template, url
                ]
            try:
                output = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
                message = 'Video download completed successfully! (H.264 compatible)'
            except subprocess.CalledProcessError as e:
                logger.warning(f"Primary video download failed: {e.output.decode()}")
                self.update_state(state='PROGRESS', meta={'status_message': 'Trying fallback method...'})
                if quality == 'best':
                    fallback_cmd = cmd_base + [
                        '-f', 'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/b[vcodec^=avc1]',
                        '--merge-output-format', 'mp4',
                        '-o', output_template, url
                    ]
                else:
                    fallback_cmd = cmd_base + [
                        '-f', f'bv*[vcodec^=avc1][height<={quality}][ext=mp4]+ba[ext=m4a]/b[vcodec^=avc1][height<={quality}]',
                        '--merge-output-format', 'mp4',
                        '-o', output_template, url
                    ]
                output = subprocess.check_output(fallback_cmd, stderr=subprocess.STDOUT)
                message = 'Fallback video download completed! (H.264 compatible)'
        
        # Find the downloaded file
        files = sorted(os.listdir(OUTDIR), key=lambda f: os.path.getmtime(os.path.join(OUTDIR, f)), reverse=True)
        filename = files[0] if files else None
        if not filename:
            raise FileNotFoundError('No file downloaded')
        
        logger.debug(f"Download completed: {filename}")
        return {'success': True, 'message': message, 'download_url': f'/downloads/{filename}'}
    
    except subprocess.CalledProcessError as e:
        logger.error(f"Download failed: {e.output.decode()}")
        return {'success': False, 'message': f'Download failed: {e.output.decode()}'}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {'success': False, 'message': f'Unexpected error: {str(e)}'}

@app.route('/api/download', methods=['POST'])
def api_download():
    if not check_ffmpeg():
        return jsonify({'success': False, 'message': 'FFmpeg is not installed. Please install FFmpeg and add it to PATH.'}), 500
    
    data = request.json
    url = data.get('url')
    download_type = data.get('type')
    quality = data.get('quality')
    speed = data.get('speed')

    if not url:
        return jsonify({'success': False, 'message': 'URL is required'}), 400
    if download_type not in ['video', 'audio']:
        return jsonify({'success': False, 'message': 'Invalid download type'}), 400
    if download_type == 'video' and not quality:
        return jsonify({'success': False, 'message': 'Quality is required for video'}), 400

    task = download_task.apply_async(args=[url, download_type, quality, speed])
    TASKS[task.id] = {'status': 'PENDING', 'message': 'Starting download...'}
    
    return jsonify({'success': True, 'task_id': task.id})

@app.route('/api/task_status/<task_id>')
def task_status(task_id):
    task = download_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {'status': task.state, 'status_message': TASKS.get(task_id, {}).get('message', 'Waiting...')}
    elif task.state == 'PROGRESS':
        response = {'status': task.state, 'status_message': task.info.get('status_message', 'Processing...')}
    elif task.state == 'SUCCESS':
        response = {'status': task.state, 'success': task.result['success'], 'message': task.result['message']}
        if task.result['success']:
            response['download_url'] = task.result['download_url']
    else:  # FAILURE
        response = {'status': task.state, 'success': False, 'message': task.result.get('message', 'Task failed')}
    return jsonify(response)

@app.route('/downloads/<filename>')
def serve_download(filename):
    try:
        return send_from_directory(OUTDIR, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'File not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)