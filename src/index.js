// 音頻混音器游戲

// 音軌設置
//let tracksBaseUrl = '../../UpLifeSongs/以斯拉 - 至高全能神的榮光';
let tracksBaseUrl = 'https://christorng.github.io/UpLifeSongs/以斯拉 - 至高全能神的榮光';
const tracks = ['vocal', 'guitar', 'piano', 'other', 'bass', 'drum'];
let audioContext, audioSources = {}, gainNodes = {}, analyserNodes = {};
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
    });

    isAudioInitialized = true;
}

// 加載音頻文件
async function loadAudio() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.textContent = '載入中';
    playPauseBtn.disabled = true;

    for (let track of tracks) {
        try {
            const response = await fetch(`${tracksBaseUrl}/${track}.mp3`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioSources[track] = audioContext.createBufferSource();
            audioSources[track].buffer = audioBuffer;
            audioSources[track].connect(gainNodes[track]);
            audioSources[track].loop = true;
        } catch (error) {
            console.error(`Error loading audio for ${track}:`, error);
        }
    }

    isAudioLoaded = true;
    playPauseBtn.innerHTML = '&#9658;'; // 播放圖示
    playPauseBtn.disabled = false;
}

// 播放/暫停
let isPlaying = false;
function togglePlayPause() {
    if (!isAudioInitialized) {
        initAudio();
        loadAudio();
        return;
    }

    if (!isAudioLoaded) return;

    if (isPlaying) {
        tracks.forEach(track => {
            if (audioSources[track] && audioSources[track].buffer) {
                audioSources[track].stop();
            }
        });
    } else {
        tracks.forEach(track => {
            if (audioSources[track] && audioSources[track].buffer) {
                audioSources[track] = audioContext.createBufferSource();
                audioSources[track].buffer = audioSources[track].buffer;
                audioSources[track].connect(gainNodes[track]);
                audioSources[track].loop = true;
                audioSources[track].start();
            }
        });
    }
    isPlaying = !isPlaying;
    document.getElementById('playPauseBtn').innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9658;'; // 暫停圖示 : 播放圖示
}

// 設置總音量
function setMasterVolume(volume) {
    if (!isAudioInitialized) return;
    masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
}

// 設置單軌音量
function setTrackVolume(track, volume) {
    if (!isAudioInitialized) return;
    gainNodes[track].gain.setValueAtTime(volume, audioContext.currentTime);
}

// 設置播放位置
function setPlaybackPosition(position) {
    if (!isAudioInitialized || !isAudioLoaded) return;
    const duration = audioSources[tracks[0]].buffer.duration;
    const newTime = position * duration / 100;
    
    if (isPlaying) {
        tracks.forEach(track => {
            if (audioSources[track] && audioSources[track].buffer) {
                audioSources[track].stop();
            }
        });
    }
    
    tracks.forEach(track => {
        if (audioSources[track] && audioSources[track].buffer) {
            audioSources[track] = audioContext.createBufferSource();
            audioSources[track].buffer = audioSources[track].buffer;
            audioSources[track].connect(gainNodes[track]);
            audioSources[track].loop = true;
            audioSources[track].start(0, newTime);
        }
    });
    
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '&#10074;&#10074;'; // 暫停圖示
}

// 計算分數
function calculateScore() {
    if (!isAudioInitialized || !isAudioLoaded) return 0;
    let totalDifference = 0;
    tracks.forEach(track => {
        const userGain = gainNodes[track].gain.value;
        const correctGain = randomGains[track];
        totalDifference += Math.abs(userGain - correctGain);
    });
    const score = Math.max(0, 100 - (totalDifference / tracks.length) * 100);
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