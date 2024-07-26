// 音頻混音器遊戲

// 音軌設置
const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let tracksBaseUrl = isLocalDevelopment
    ? '../UpLifeSongs/以斯拉 - 至高全能神的榮光'
    : '../../UpLifeSongs/以斯拉 - 至高全能神的榮光';
const tracks = ['vocal', 'guitar', 'piano', 'other', 'bass', 'drum'];
let audioContext, audioBuffers = {}, audioSources = {}, gainNodes = {}, analyserNodes = {};
let masterGainNode, randomGains = {};
let isAudioInitialized = false;
let isAudioLoaded = false;

// 初始化 Web Audio API
function initAudio() {
    if (isAudioInitialized) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);

    tracks.forEach(track => {
        gainNodes[track] = audioContext.createGain();
        analyserNodes[track] = audioContext.createAnalyser();
        gainNodes[track].connect(analyserNodes[track]);
        analyserNodes[track].connect(masterGainNode);
        randomGains[track] = Math.random() * 0.8 + 0.2; // 隨機音量在 0.2 到 1 之間
        
        // 設置推桿初始位置為中間（0.5）
        const fader = document.getElementById(`${track}-fader`).querySelector('input');
        fader.value = 0.5;
        setTrackVolume(track, 0.5);
    });

    isAudioInitialized = true;
}

// 加載音頻文件
async function loadAudio() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.textContent = '載入中';
    playPauseBtn.disabled = true;

    try {
        await Promise.all(tracks.map(async (track) => {
            let audioData;
            const response = await fetch(`${tracksBaseUrl}/${track}.mp3`);
            audioData = await response.arrayBuffer();
            audioBuffers[track] = await audioContext.decodeAudioData(audioData);
        }));

        isAudioLoaded = true;
        playPauseBtn.innerHTML = '&#9658;'; // 播放圖示
        playPauseBtn.disabled = false;
        console.log('所有音軌已成功載入');
    } catch (error) {
        console.error('載入音頻時發生錯誤:', error);
        playPauseBtn.textContent = '載入失敗';
        playPauseBtn.disabled = false;
    }
}

// 創建音頻源
function createAudioSources() {
    tracks.forEach(track => {
        if (audioSources[track]) {
            audioSources[track].disconnect();
        }
        audioSources[track] = audioContext.createBufferSource();
        audioSources[track].buffer = audioBuffers[track];
        audioSources[track].connect(gainNodes[track]);
        audioSources[track].loop = true;
    });
}

// 播放/暫停
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
function togglePlayPause() {
    if (!isAudioInitialized) {
        initAudio();
        loadAudio();
        return;
    }

    if (!isAudioLoaded) return;

    if (isPlaying) {
        audioContext.suspend();
        pauseTime = audioContext.currentTime;
    } else {
        audioContext.resume();
        if (!audioSources[tracks[0]] || !audioSources[tracks[0]].buffer) {
            createAudioSources();
            startTime = audioContext.currentTime;
            tracks.forEach(track => audioSources[track].start());
        } else {
            startTime += audioContext.currentTime - pauseTime;
        }
        requestAnimationFrame(updateTimeSlider);
    }
    isPlaying = !isPlaying;
    document.getElementById('playPauseBtn').innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9658;'; // 暫停圖示 : 播放圖示
}

// 更新時間軸
function updateTimeSlider() {
    if (!isPlaying) return;
    const currentTime = audioContext.currentTime - startTime;
    const duration = audioBuffers[tracks[0]].duration;
    const percentage = (currentTime / duration) * 100;
    document.getElementById('timeSlider').value = percentage;
    requestAnimationFrame(updateTimeSlider);
}

// 設置總音量
function setMasterVolume(volume) {
    if (!isAudioInitialized) return;
    masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
}

// 設置單軌音量
function setTrackVolume(track, faderValue) {
    if (!isAudioInitialized) return;
    // 將推桿值（0-1）映射到增益範圍（0.1-1.9）
    const gainValue = 0.1 + (faderValue * 1.8);
    gainNodes[track].gain.setValueAtTime(gainValue * randomGains[track], audioContext.currentTime);
}

// 設置播放位置
function setPlaybackPosition(position) {
    if (!isAudioInitialized || !isAudioLoaded) return;
    const duration = audioBuffers[tracks[0]].duration;
    const newTime = (position / 100) * duration;
    
    const wasPlaying = isPlaying;
    if (isPlaying) {
        audioContext.suspend();
    }
    
    createAudioSources();
    startTime = audioContext.currentTime - newTime;
    tracks.forEach(track => audioSources[track].start(0, newTime));
    
    if (wasPlaying) {
        audioContext.resume();
        requestAnimationFrame(updateTimeSlider);
    }
    isPlaying = wasPlaying;
    document.getElementById('playPauseBtn').innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9658;'; // 暫停圖示 : 播放圖示
}

// 計算分數
function calculateScore() {
    if (!isAudioInitialized || !isAudioLoaded) return 0;
    let totalDifference = 0;
    tracks.forEach(track => {
        const faderValue = document.getElementById(`${track}-fader`).querySelector('input').value;
        const userGain = 0.1 + (faderValue * 1.8); // 與 setTrackVolume 中的計算相同
        const targetGain = 1 / randomGains[track]; // 目標增益是隨機增益的倒數
        totalDifference += Math.abs(userGain - targetGain);
    });
    const score = Math.max(0, 100 - (totalDifference / tracks.length) * 50); // 調整分數計算以提供更大的範圍
    return Math.round(score);
}

// 初始化遊戲
function initGame() {
    // 設置 UI 事件監聽器
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('masterVolume').addEventListener('input', (e) => setMasterVolume(e.target.value));
    document.getElementById('timeSlider').addEventListener('input', (e) => setPlaybackPosition(e.target.value));
    
    tracks.forEach(track => {
        const fader = document.getElementById(`${track}-fader`).querySelector('input');
        fader.addEventListener('input', (e) => setTrackVolume(track, e.target.value));
    });
    
    document.getElementById('submitBtn').addEventListener('click', () => {
        const score = calculateScore();
        document.querySelector('#score span').textContent = score;
    });
}

// 開始遊戲
initGame();