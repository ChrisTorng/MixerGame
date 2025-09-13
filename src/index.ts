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
        this.tracksBaseUrl = '../songs/UpLifeSongs/以斯拉 - 至高全能神的榮光';
        // this.tracksBaseUrl = '../songs/Will/程式夢想家';
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

        // 建立節點與隨機增益，並初始化 UI 與玩家設定值
        this.tracks.forEach(track => {
            this.gainNodes[track] = this.audioContext.createGain();
            this.analyserNodes[track] = this.audioContext.createAnalyser();
            this.gainNodes[track].connect(this.analyserNodes[track]);
            this.analyserNodes[track].connect(this.masterGainNode);
            this.randomGains[track] = Math.exp(Math.random() * Math.log(16)) / 4; // 0.25 到 4 的範圍

            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;
            if (fader) {
                // 推桿顯示為 1（玩家初始設定為 1）
                fader.setValue(1);
                this.playerSettings[track] = 1;
            }
        });

        // 標記初始化完成，接著依目前推桿位置套用實際音量
        this.isAudioInitialized = true;
        this.tracks.forEach(track => {
            this.setTrackVolume(track, this.playerSettings[track]);
        });
    }

    private async loadAudio(): Promise<void> {
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        playPauseBtn.textContent = '載入中 0%';
        playPauseBtn.disabled = true;

        try {
            let loadedCount = 0;
            const total = this.tracks.length;
            await Promise.all(this.tracks.map(async (track) => {
                const response = await fetch(`${this.tracksBaseUrl}/${track}.mp3`);
                const audioData = await response.arrayBuffer();
                this.audioBuffers[track] = await this.audioContext.decodeAudioData(audioData);
                loadedCount += 1;
                const percent = Math.round((loadedCount / total) * 100);
                // 更新載入百分比到按鈕
                playPauseBtn.textContent = `載入中 ${percent}%`;
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
            this.audioSources[track].loop = false;
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
        // 開始播放後啟用「提交」鈕
        if (this.isPlaying) {
            const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
            if (submitBtn) submitBtn.disabled = false;
        }
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
        // 實際音量 = 玩家設定的增益 * 隨機增益
        const actualGain = gain * this.randomGains[track];
        this.gainNodes[track].gain.setValueAtTime(actualGain, this.audioContext.currentTime);
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
                // 原始混音（比較模式）：套用正確音量到音訊，但提交前不顯示正確推桿位置
                const correctGain = 1 / this.randomGains[track];
                this.setTrackVolume(track, correctGain);
                if (this.isSubmitted) {
                    // 提交後才顯示正確推桿位置供比對
                    fader.setValue(correctGain);
                } else {
                    // 提交前：維持玩家目前推桿位置（不變更數值）
                    // 不更新 fader 值，僅停用
                }
                fader.setDisabled(true);
            } else {
                // 目前設置模式：恢復玩家的設定與推桿顯示
                this.setTrackVolume(track, this.playerSettings[track]);
                fader.setValue(this.playerSettings[track]);
                fader.setDisabled(false);
            }
        });
        this.updateModeLabels();
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
            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;            fader.addEventListener('change', (e: Event) => {
                const customEvent = e as CustomEvent;
                if (!this.isComparisonMode) {
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

        // 點擊文字也能切換，僅允許點擊非當前的一側
        const currentLabel = document.getElementById('currentSettingLabel') as HTMLSpanElement;
        const comparisonLabel = document.getElementById('comparisonLabel') as HTMLSpanElement;

        const handleActivateCurrent = () => {
            if (this.isComparisonMode) {
                modeToggleCheckbox.checked = false;
                this.toggleComparisonMode(false);
            }
        };
        const handleActivateComparison = () => {
            if (!this.isComparisonMode) {
                modeToggleCheckbox.checked = true;
                this.toggleComparisonMode(true);
            }
        };

        currentLabel.addEventListener('click', handleActivateCurrent);
        comparisonLabel.addEventListener('click', handleActivateComparison);
        // 簡單鍵盤無障礙：Enter/Space 觸發
        currentLabel.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivateCurrent();
            }
        });
        comparisonLabel.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivateComparison();
            }
        });

        // 初始化標籤樣式狀態
        this.updateModeLabels();

        const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
        // 未播放前停用提交鈕
        submitBtn.disabled = true;
        submitBtn.addEventListener('click', () => {
            const score = this.calculateScore();
            const scoreDisplay = document.getElementById('scoreDisplay') as HTMLSpanElement;
            scoreDisplay.style.visibility = 'visible';
            scoreDisplay.textContent = score.toString();
            const comparisonLabel = document.getElementById('comparisonLabel') as HTMLSpanElement;
            comparisonLabel.textContent = '正確答案';
            this.isSubmitted = true;
            // 送出後自動切換到「正確答案」（比較模式），顯示正確推桿
            modeToggleCheckbox.checked = true;
            this.toggleComparisonMode(true);
            // 顯示再玩一次按鈕
            const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
            if (restartBtn) restartBtn.style.display = 'inline-block';
        });

        // 再玩一次：重置為新題目但保留已載入音訊
        const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartRound());
        }
    }

    // 同步切換文字的可點擊與樣式狀態
    private updateModeLabels(): void {
        const currentLabel = document.getElementById('currentSettingLabel');
        const comparisonLabel = document.getElementById('comparisonLabel');
        if (!currentLabel || !comparisonLabel) return;

        const currentIsActive = !this.isComparisonMode;
        currentLabel.classList.toggle('active', currentIsActive);
        currentLabel.classList.toggle('inactive', !currentIsActive);
        currentLabel.setAttribute('aria-disabled', currentIsActive ? 'true' : 'false');

        const comparisonIsActive = this.isComparisonMode;
        comparisonLabel.classList.toggle('active', comparisonIsActive);
        comparisonLabel.classList.toggle('inactive', !comparisonIsActive);
        comparisonLabel.setAttribute('aria-disabled', comparisonIsActive ? 'true' : 'false');
    }

    // 重新開始新一輪：產生新隨機值、重置 UI 與狀態、顯示「播放」
    private restartRound(): void {
        // 停止播放狀態
        if (this.isPlaying) {
            this.audioContext.suspend();
        }
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;

        // 清理來源節點，以便下次播放時重新建立
        this.tracks.forEach(track => {
            if (this.audioSources[track]) {
                try { this.audioSources[track].disconnect(); } catch {}
            }
            // 移除以觸發下次 createAudioSources
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.audioSources[track];
        });

        // 產生新的隨機增益，重置玩家設定與推桿
        this.tracks.forEach(track => {
            this.randomGains[track] = Math.exp(Math.random() * Math.log(16)) / 4; // 0.25~4
            this.playerSettings[track] = 1;
            const fader = document.getElementById(`${track}-fader`) as VolumeSlider;
            if (fader) {
                fader.setValue(1);
                fader.setDisabled(false);
            }
            this.setTrackVolume(track, 1);
        });

        // 重置總音量與滑桿
        const masterFader = document.getElementById('master-volume') as VolumeSlider;
        if (masterFader) masterFader.setValue(1);
        this.setMasterVolume(1);

        // 重置時間軸
        const timeSlider = document.getElementById('timeSlider') as HTMLInputElement;
        if (timeSlider) timeSlider.value = '0';

        // 重置模式與標籤
        const modeToggleCheckbox = document.getElementById('modeToggleCheckbox') as HTMLInputElement;
        if (modeToggleCheckbox) modeToggleCheckbox.checked = false;
        const comparisonText = document.getElementById('comparisonLabel') as HTMLSpanElement;
        if (comparisonText) comparisonText.textContent = '原版混音';
        this.isSubmitted = false;
        this.toggleComparisonMode(false);

        // 隱藏分數
        const scoreDisplay = document.getElementById('scoreDisplay') as HTMLSpanElement;
        if (scoreDisplay) {
            scoreDisplay.style.visibility = 'hidden';
            scoreDisplay.textContent = '00';
        }

        // 將播放鍵設為「播放」並可按（音訊已載入，無需重新載入）
        const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
        if (playPauseBtn) {
            playPauseBtn.disabled = false;
            // 保持原本的圖示風格（播放圖示）
            playPauseBtn.innerHTML = '&#9658;';
        }
    }
}

// 開始遊戲
new MixerGame();
