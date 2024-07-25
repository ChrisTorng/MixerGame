// 音頻混音器游戲

// 音軌設置
const tracks = ['vocal', 'guitar', 'piano', 'other', 'bass', 'drum'];
let audioContext, audioSources = {}, gainNodes = {}, analyserNodes = {};
let masterGainNode, randomGains = {};

// 初始化 Web Audio API
function initAudio() {
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
}

// 加載音頻文件
async function loadAudio() {
    for (let track of tracks) {
        const response = await fetch(`src/${track}.mp3`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioSources[track] = audioContext.createBufferSource();
        audioSources[track].buffer = audioBuffer;
        audioSources[track].connect(gainNodes[track]);
        audioSources[track].loop = true;
    }
}

// 播放/暫停
let isPlaying = false;
function togglePlayPause() {
    if (isPlaying) {
        tracks.forEach(track => audioSources[track].stop());
    } else {
        tracks.forEach(track => {
            audioSources[track] = audioContext.createBufferSource();
            audioSources[track].buffer = audioSources[track].buffer;
            audioSources[track].connect(gainNodes[track]);
            audioSources[track].loop = true;
            audioSources[track].start();
        });
    }
    isPlaying = !isPlaying;
    document.getElementById('playPauseBtn').textContent = isPlaying ? '暫停' : '播放';
}

// 設置總音量
function setMasterVolume(volume) {
    masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
}

// 設置單軌音量
function setTrackVolume(track, volume) {
    gainNodes[track].gain.setValueAtTime(volume, audioContext.currentTime);
}

// 設置播放位置
function setPlaybackPosition(position) {
    const duration = audioSources[tracks[0]].buffer.duration;
    const newTime = position * duration / 100;
    
    if (isPlaying) {
        togglePlayPause();
    }
    
    tracks.forEach(track => {
        if (audioSources[track].buffer) {
            audioSources[track].stop();
            audioSources[track] = audioContext.createBufferSource();
            audioSources[track].buffer = audioSources[track].buffer;
            audioSources[track].connect(gainNodes[track]);
            audioSources[track].loop = true;
            audioSources[track].start(0, newTime);
        }
    });
    
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '暫停';
}

// 計算分數
function calculateScore() {
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
async function initGame() {
    initAudio();
    await loadAudio();
    
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