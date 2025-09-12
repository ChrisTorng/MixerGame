class VolumeSlider extends HTMLElement {
  private slider!: HTMLInputElement;
  private valueDisplay!: HTMLSpanElement;
  private initialGain: number = 1;
  // 可配置的上下限（單位 dB），預設為 ±14 dB
  private minDb: number = -14;
  private maxDb: number = 14;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const valueAttr = this.getAttribute('value');
    if (valueAttr !== null) {
      this.initialGain = parseFloat(valueAttr);
    }
    const minAttr = this.getAttribute('min-db');
    const maxAttr = this.getAttribute('max-db');
    if (minAttr !== null) {
      const parsed = parseFloat(minAttr);
      if (!Number.isNaN(parsed)) this.minDb = parsed;
    }
    if (maxAttr !== null) {
      const parsed = parseFloat(maxAttr);
      if (!Number.isNaN(parsed)) this.maxDb = parsed;
    }
    // 確保數值有效（min 小於 max）
    if (!(this.minDb < this.maxDb)) {
      // 若設定錯誤，回退預設值
      this.minDb = -14;
      this.maxDb = 14;
    }
    this.render();
    this.setupEventListeners();
  }

  render() {
    const name = this.getAttribute('name') || 'Track';
    const sliderValue = this.gainToSliderValue(this.initialGain);
    const dbValue = this.gainToDb(this.initialGain);
    const ticksHtml = this.buildScaleTicks()
      .map(t => `<span style="bottom: ${t.percent}%">${t.label}</span>`)
      .join('');
    this.shadowRoot!.innerHTML = `
      <style>
        .fader {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 60px;
          height: 220px;
          background: #2c3e50;
          border-radius: 10px;
          padding: 10px 0;
          box-sizing: border-box;
          position: relative;
        }
        .slider-container {
          position: relative;
          height: 150px;
          width: 10px;
          background: #34495e;
          border-radius: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px 0;
        }
        input[type="range"] {
          writing-mode: bt-lr;
          -webkit-appearance: none;
          width: 200px;
          height: 10px;
          background: transparent;
          transform: rotate(-90deg);
          z-index: 2;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 30px;
          background: #3498db;
          cursor: pointer;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        /* Firefox */
        input[type="range"]::-moz-range-thumb {
          width: 10px;
          height: 30px;
          background: #3498db;
          cursor: pointer;
          border: none;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        /* Track styling for better disabled contrast */
        input[type="range"]::-webkit-slider-runnable-track {
          height: 10px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 10px;
          background: transparent;
        }
        .scale {
          position: absolute;
          left: 20px;
          top: 10px;
          margin-top: 5px;
          height: 120px;
          width: 13px;
          color: #bdc3c7;
          font-size: 10px;
        }
        .scale span {
          position: absolute;
          right: 0;
          transform: translateY(50%);
        }
        label {
          margin-top: 10px;
          color: #ecf0f1;
          font-size: 12px;
          font-weight: bold;
        }
        .value-display {
          margin-top: 5px;
          color: #3498db;
          font-size: 14px;
        }
        /* Disabled state styles */
        .fader.is-disabled {
          opacity: 0.8; /* slight dim across component */
        }
        .fader.is-disabled .slider-container {
          background: #3a4a5a; /* darker track when disabled */
        }
        .fader.is-disabled label,
        .fader.is-disabled .value-display,
        .fader.is-disabled .scale {
          color: #7f8c8d;
        }
        input[type="range"]:disabled {
          cursor: not-allowed;
          filter: grayscale(80%);
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          background: #95a5a6;
          box-shadow: none;
          cursor: not-allowed;
        }
        input[type="range"]:disabled::-moz-range-thumb {
          background: #95a5a6;
          box-shadow: none;
          cursor: not-allowed;
        }
        input[type="range"]:disabled::-webkit-slider-runnable-track {
          background: transparent;
        }
        input[type="range"]:disabled::-moz-range-track {
          background: transparent;
        }
      </style>
      <div class="fader">
        <div class="slider-container">
          <input type="range" min="0" max="100" step="1" value="${sliderValue}">
          <div class="scale">
            ${ticksHtml}
          </div>
        </div>
        <label>${name}</label>
        <span class="value-display">${!isFinite(dbValue) ? '-∞' : dbValue.toFixed(1)} dB</span>
      </div>
    `;
    this.slider = this.shadowRoot!.querySelector('input')!;
    this.valueDisplay = this.shadowRoot!.querySelector('.value-display')!;
  }

  setupEventListeners() {
    this.slider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value);
      const gain = this.sliderValueToGain(value);
      const dbValue = this.gainToDb(gain);
      this.updateValueDisplay(dbValue);
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: gain },
        bubbles: true,
        composed: true,
      }));
    });
  }

  setDisabled(isDisabled: boolean) {
    this.slider.disabled = isDisabled;
    const fader = this.shadowRoot!.querySelector('.fader');
    if (fader) {
      (fader as HTMLElement).classList.toggle('is-disabled', isDisabled);
    }
  }

  setValue(gainValue: number) {
    const sliderValue = this.gainToSliderValue(gainValue);
    this.slider.value = sliderValue.toString();
    this.updateValueDisplay(this.gainToDb(gainValue));
  }

  private gainToSliderValue(gain: number): number {
    if (gain <= 0) {
      // 將 0 視為最小位置（顯示為 -∞）
      return 0;
    }
    const db = this.gainToDb(gain);
    const clampedDb = Math.min(this.maxDb, Math.max(this.minDb, db));
    const value = ((clampedDb - this.minDb) / (this.maxDb - this.minDb)) * 100;
    return Math.round(value);
  }

  private sliderValueToGain(value: number): number {
    const percent = Math.min(100, Math.max(0, value)) / 100;
    const db = (percent * (this.maxDb - this.minDb)) + this.minDb;
    return this.dbToGain(db);
  }

  private updateValueDisplay(dbValue: number) {
    if (!isFinite(dbValue)) {
      this.valueDisplay.textContent = '-∞ dB';
    } else {
      this.valueDisplay.textContent = `${dbValue.toFixed(1)} dB`;
    }
  }

  private gainToDb(gainValue: number): number {
    if (gainValue <= 0) {
      return -Infinity;
    } else {
      return 20 * Math.log10(gainValue);
    }
  }

  private dbToGain(dbValue: number): number {
    return Math.pow(10, dbValue / 20);
  }

  private dbToPercent(db: number): number {
    const clamped = Math.min(this.maxDb, Math.max(this.minDb, db));
    return ((clamped - this.minDb) / (this.maxDb - this.minDb)) * 100;
  }

  private buildScaleTicks(): { label: string; percent: number }[] {
    // 建立 5 個刻度：max、(max+0)/2、0、(min+0)/2、min
    const tickValues = [
      this.maxDb,
      this.maxDb / 2,
      0,
      this.minDb / 2,
      this.minDb,
    ];
    return tickValues.map(v => ({
      label: Number.isFinite(v) ? `${Math.round(v)}` : '-∞',
      percent: this.dbToPercent(v),
    }));
  }
}

if (!customElements.get('volume-slider')) {
  customElements.define('volume-slider', VolumeSlider);
}

export default VolumeSlider;
