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
let isAnswerMode = false;
let playerSettings = {};
let correctSettings = {};

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
        // 隨機 GAIN 範圍從 0.5 到 2
        randomGains[track] = Math.exp(Math.random() * Math.log(4)) / 2;
        
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

// GAIN 值轉換為推桿值
function gainToFader(gain) {
    return Math.log(gain / 0.25) / Math.log(16);
}

// 將線性推桿值轉換為對數增益值
function faderToGain(faderValue) {
    // 將 0-1 的推桿值映射到 0.25-4 的對數增益範圍
    return 0.25 * Math.pow(16, faderValue);
}

// 設置單軌音量
function setTrackVolume(track, faderValue) {
    if (!isAudioInitialized) return;
    const gainValue = faderToGain(faderValue);
    gainNodes[track].gain.setValueAtTime(gainValue, audioContext.currentTime);
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
        const faderValue = playerSettings[track] || 0.5;
        const userGain = faderToGain(faderValue);
        const targetGain = 1 / randomGains[track];
        // 使用對數比較來計算差異
        const logDifference = Math.abs(Math.log2(userGain) - Math.log2(targetGain));
        totalDifference += logDifference;
    });
    // 調整分數計算以提供合理的範圍
    const score = Math.max(0, 100 - (totalDifference / tracks.length) * 25);
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
        fader.addEventListener('input', (e) => {
            if (!isAnswerMode) {
                setTrackVolume(track, e.target.value);
                playerSettings[track] = e.target.value;
            }
        });
    });
    
    document.getElementById('submitBtn').addEventListener('click', () => {
        const score = calculateScore();
        document.querySelector('#score span').textContent = score;
        document.getElementById('answerToggle').disabled = false;
        document.getElementById('answerToggle').checked = true;
        toggleAnswerMode(true);
    });

    document.getElementById('answerToggle').addEventListener('change', (e) => {
        toggleAnswerMode(e.target.checked);
    });
}

// 切換答案模式
function toggleAnswerMode(isAnswer) {
    isAnswerMode = isAnswer;
    const toggleLabel = document.getElementById('toggleLabel');
    toggleLabel.textContent = isAnswer ? '正確答案' : '玩家設置';

    tracks.forEach(track => {
        const fader = document.getElementById(`${track}-fader`).querySelector('input');
        if (isAnswer) {
            correctSettings[track] = 1 / randomGains[track];
            fader.value = gainToFader(correctSettings[track]);
            setTrackVolume(track, fader.value);
        } else {
            fader.value = playerSettings[track] || 0.5;
            setTrackVolume(track, fader.value);
        }
        fader.disabled = isAnswer;
    });
}

// 開始遊戲
initGame();