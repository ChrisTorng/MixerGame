import VolumeSlider from "./volume-slider";

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
        vocal: 1,
        guitar: 1,
        piano: 1,
        other: 1,
        bass: 1,
        drum: 1
    };
    private isSubmitted: boolean = false;
    private isComparisonMode: boolean = false;
    private isPlaying: boolean = false;
    private startTime: number = 0;
    private pauseTime: number = 0;

    constructor() {
        // const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // this.tracksBaseUrl = isLocalDevelopment
        //     ? '../songs/UpLifeSongs/以斯拉 - 至高全能神的榮光'
        //     : '../../songs/UpLifeSongs/以斯拉 - 至高全能神的榮光';
        this.tracksBaseUrl = '../songs/UpLifeSongs/以斯拉 - 至高全能神的榮光';
        this.tracks = ['vocal', 'guitar', 'piano', 'other', 'bass', 'drum'];
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioBuffers = {} as AudioBuffers;
        this.audioSources = {} as AudioNodes;
        this.gainNodes = {} as GainNodes;
        this.analyserNodes = {} as AnalyserNodes;
        this.masterGainNode = this.audioContext.createGain();
        this.randomGains = {} as RandomGains;

        // 確保 VolumeSlider 已註冊
        if (!customElements.get('volume-slider')) {
            customElements.define('volume-slider', VolumeSlider);
        }

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

            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;
            if (fader) {
                fader.setValue(1);
                this.setTrackVolume(track, 1);
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

    private setTrackVolume(track: TrackName, gain: number): void {
        if (!this.isAudioInitialized) return;
        this.gainNodes[track].gain.setValueAtTime(gain, this.audioContext.currentTime);
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
            const userGain = this.playerSettings[track];
            const targetGain = 1 / this.randomGains[track];
            const logDifference = Math.abs(Math.log2(userGain) - Math.log2(targetGain));
            totalDifference += logDifference;
        });
        const score = Math.max(0, 100 - (totalDifference / this.tracks.length) * 25);
        return Math.round(score);
    }

    private toggleComparisonMode(isComparison: boolean): void {
        this.isComparisonMode = isComparison;
        this.tracks.forEach(track => {
            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;
            if (isComparison) {
                const comparisonGain = 1 / this.randomGains[track];
                this.setTrackVolume(track, comparisonGain);
                fader.setValue(comparisonGain);
            } else {
                this.setTrackVolume(track, this.playerSettings[track]);
                fader.setValue(this.playerSettings[track]);
            }
            fader.setDisabled(isComparison);
        });
    }

    private initGame(): void {
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        const timeSlider = document.getElementById('timeSlider') as HTMLInputElement;
        timeSlider.addEventListener('input', (e) => this.setPlaybackPosition(parseFloat((e.target as HTMLInputElement).value)));

        const masterVolume = document.getElementById('master-volume') as VolumeSlider;
        masterVolume.addEventListener('change', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.setMasterVolume(customEvent.detail.value);
        });

        this.tracks.forEach(track => {
            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;
            fader.addEventListener('change', (e: Event) => {
                const customEvent = e as CustomEvent;
                if (!this.isAnswerMode) {
                    const value = customEvent.detail.value;
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