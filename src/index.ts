// 定義類型
type TrackName = 'vocal' | 'guitar' | 'piano' | 'other' | 'bass' | 'drum';
type AudioNodes = {
    [key in TrackName]: AudioBufferSourceNode;
};
type GainNodes = {
    [key in TrackName]: GainNode;
};
type AnalyserNodes = {
    [key in TrackName]: AnalyserNode;
};
type AudioBuffers = {
    [key in TrackName]: AudioBuffer;
};
type RandomGains = {
    [key in TrackName]: number;
};
type PlayerSettings = {
    [key in TrackName]: number;
};

// 音頻混音器遊戲
class MixerGame {
    private tracksBaseUrl: string;
    private tracks: TrackName[];
    private audioContext: AudioContext;
    private audioBuffers: AudioBuffers;
    private audioSources: AudioNodes;
    private gainNodes: GainNodes;
    private analyserNodes: AnalyserNodes;
    private masterGainNode: GainNode;
    private randomGains: RandomGains;
    private isAudioInitialized: boolean = false;
    private isAudioLoaded: boolean = false;
    private isAnswerMode: boolean = false;
    private playerSettings: PlayerSettings = {
        vocal: 0.5,
        guitar: 0.5,
        piano: 0.5,
        other: 0.5,
        bass: 0.5,
        drum: 0.5
    };
    private isSubmitted: boolean = false;
    private isComparisonMode: boolean = false;
    private isPlaying: boolean = false;
    private startTime: number = 0;
    private pauseTime: number = 0;

    constructor() {
        const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.tracksBaseUrl = isLocalDevelopment
            ? '../UpLifeSongs/以斯拉 - 至高全能神的榮光'
            : '../../UpLifeSongs/以斯拉 - 至高全能神的榮光';
        this.tracks = ['vocal', 'guitar', 'piano', 'other', 'bass', 'drum'];
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioBuffers = {} as AudioBuffers;
        this.audioSources = {} as AudioNodes;
        this.gainNodes = {} as GainNodes;
        this.analyserNodes = {} as AnalyserNodes;
        this.masterGainNode = this.audioContext.createGain();
        this.randomGains = {} as RandomGains;

        this.initGame();
    }

    private initAudio(): void {
        if (this.isAudioInitialized) return;

        this.masterGainNode.connect(this.audioContext.destination);

        this.tracks.forEach(track => {
            this.gainNodes[track] = this.audioContext.createGain();
            this.analyserNodes[track] = this.audioContext.createAnalyser();
            this.gainNodes[track].connect(this.analyserNodes[track]);
            this.analyserNodes[track].connect(this.masterGainNode);
            this.randomGains[track] = Math.exp(Math.random() * Math.log(16)) / 4; // 0.25 到 4 的範圍
            
            const fader = document.getElementById(`${track}-fader`)?.querySelector('input') as HTMLInputElement;
            if (fader) {
                fader.value = '0.5'; // 設置推桿到中間位置
                this.playerSettings[track] = 0.5;
                this.setTrackVolume(track, 0.5, false); // 初始化時不應用隨機增益
            }
        });

        this.isAudioInitialized = true;
    }

    private async loadAudio(): Promise<void> {
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.textContent = '載入中';
        playPauseBtn.disabled = true;

        try {
            await Promise.all(this.tracks.map(async (track) => {
                const response = await fetch(`${this.tracksBaseUrl}/${track}.mp3`);
                const audioData = await response.arrayBuffer();
                this.audioBuffers[track] = await this.audioContext.decodeAudioData(audioData);
            }));

            this.isAudioLoaded = true;
            playPauseBtn.innerHTML = '&#9658;';
            playPauseBtn.disabled = false;
            console.log('所有音軌已成功載入');
        } catch (error) {
            console.error('載入音頻時發生錯誤:', error);
            playPauseBtn.textContent = '載入失敗';
            playPauseBtn.disabled = false;
        }
    }

    private createAudioSources(): void {
        this.tracks.forEach(track => {
            if (this.audioSources[track]) {
                this.audioSources[track].disconnect();
            }
            this.audioSources[track] = this.audioContext.createBufferSource();
            this.audioSources[track].buffer = this.audioBuffers[track];
            this.audioSources[track].connect(this.gainNodes[track]);
            this.audioSources[track].loop = true;
        });
    }

    private togglePlayPause(): void {
        if (!this.isAudioInitialized) {
            this.initAudio();
            this.loadAudio();
            return;
        }

        if (!this.isAudioLoaded) return;

        if (this.isPlaying) {
            this.audioContext.suspend();
            this.pauseTime = this.audioContext.currentTime;
        } else {
            this.audioContext.resume();
            if (!this.audioSources[this.tracks[0]] || !this.audioSources[this.tracks[0]].buffer) {
                this.createAudioSources();
                this.startTime = this.audioContext.currentTime;
                this.tracks.forEach(track => this.audioSources[track].start());
            } else {
                this.startTime += this.audioContext.currentTime - this.pauseTime;
            }
            requestAnimationFrame(() => this.updateTimeSlider());
        }
        this.isPlaying = !this.isPlaying;
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.innerHTML = this.isPlaying ? '&#10074;&#10074;' : '&#9658;';
    }

    private updateTimeSlider(): void {
        if (!this.isPlaying) return;
        const currentTime = this.audioContext.currentTime - this.startTime;
        const duration = this.audioBuffers[this.tracks[0]].duration;
        const percentage = (currentTime / duration) * 100;
        const timeSlider = document.getElementById('timeSlider') as HTMLInputElement;
        timeSlider.value = percentage.toString();
        requestAnimationFrame(() => this.updateTimeSlider());
    }

    private setMasterVolume(volume: number): void {
        if (!this.isAudioInitialized) return;
        this.masterGainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }

    private gainToFader(gain: number): number {
        return Math.log(gain / 0.2) / Math.log(25);
    }

    private faderToGain(faderValue: number): number {
        return 0.2 * Math.pow(25, faderValue);
    }

    private setTrackVolume(track: TrackName, faderValue: number, applyRandom: boolean = true): void {
        if (!this.isAudioInitialized) return;
        let gainValue = this.faderToGain(faderValue);
        if (applyRandom) {
            gainValue *= this.randomGains[track]; // 只在非比較模式時應用隨機增益
        }
        this.gainNodes[track].gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    }

    private setPlaybackPosition(position: number): void {
        if (!this.isAudioInitialized || !this.isAudioLoaded) return;
        const duration = this.audioBuffers[this.tracks[0]].duration;
        const newTime = (position / 100) * duration;

        const wasPlaying = this.isPlaying;
        if (this.isPlaying) {
            this.audioContext.suspend();
        }

        this.createAudioSources();
        this.startTime = this.audioContext.currentTime - newTime;
        this.tracks.forEach(track => this.audioSources[track].start(0, newTime));

        if (wasPlaying) {
            this.audioContext.resume();
            requestAnimationFrame(() => this.updateTimeSlider());
        }
        this.isPlaying = wasPlaying;
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.innerHTML = this.isPlaying ? '&#10074;&#10074;' : '&#9658;';
    }

    private calculateScore(): number {
        if (!this.isAudioInitialized || !this.isAudioLoaded) return 0;
        let totalDifference = 0;
        this.tracks.forEach(track => {
            const faderValue = this.playerSettings[track];
            const userGain = this.faderToGain(faderValue);
            const targetGain = 1 / this.randomGains[track]; // 正確答案是隨機增益的倒數
            const logDifference = Math.abs(Math.log2(userGain) - Math.log2(targetGain));
            totalDifference += logDifference;
        });
        const score = Math.max(0, 100 - (totalDifference / this.tracks.length) * 25);
        return Math.round(score);
    }

    private toggleComparisonMode(isComparison: boolean): void {
        this.isComparisonMode = isComparison;
        this.tracks.forEach(track => {
            const fader = document.getElementById(`${track}-fader`)?.querySelector('input') as HTMLInputElement;
            if (isComparison) {
                // 在比較模式下，顯示原始音量（不應用隨機增益）
                this.setTrackVolume(track, this.playerSettings[track], false);
            } else {
                // 在正常模式下，應用隨機增益
                this.setTrackVolume(track, this.playerSettings[track], true);
            }
            fader.value = this.playerSettings[track].toString();
            fader.disabled = isComparison;
        });
    }

    private initGame(): void {
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        const masterVolume = document.getElementById('masterVolume') as HTMLInputElement;
        masterVolume.addEventListener('input', (e) => this.setMasterVolume(parseFloat((e.target as HTMLInputElement).value)));

        const timeSlider = document.getElementById('timeSlider') as HTMLInputElement;
        timeSlider.addEventListener('input', (e) => this.setPlaybackPosition(parseFloat((e.target as HTMLInputElement).value)));

        this.tracks.forEach(track => {
            const fader = document.getElementById(`${track}-fader`)?.querySelector('input') as HTMLInputElement;
            fader.addEventListener('input', (e) => {
                if (!this.isAnswerMode) {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    this.setTrackVolume(track, value);
                    this.playerSettings[track] = value;
                }
            });
        });

        const modeToggleCheckbox = document.getElementById('modeToggleCheckbox') as HTMLInputElement;
        modeToggleCheckbox.addEventListener('change', (e) => {
            this.toggleComparisonMode((e.target as HTMLInputElement).checked);
        });

        const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
        submitBtn.addEventListener('click', () => {
            const score = this.calculateScore();
            const scoreDisplay = document.getElementById('scoreDisplay') as HTMLSpanElement;
            scoreDisplay.style.visibility = 'visible';
            scoreDisplay.textContent = score.toString();
            const comparisonLabel = document.getElementById('comparisonLabel') as HTMLSpanElement;
            comparisonLabel.textContent = '正確答案';
            this.isSubmitted = true;
            modeToggleCheckbox.checked = false;
            this.toggleComparisonMode(false);
        });
    }
}

// 開始遊戲
new MixerGame();