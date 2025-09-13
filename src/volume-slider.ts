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
        :host {
          display: block;
          /* Enable container queries based on host width */
          container-type: inline-size;
        }
        .fader {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: var(--fader-max-width, 64px);
          height: 224px;
          background: linear-gradient(180deg, #2c3e50 0%, #273747 100%);
          border-radius: 12px;
          padding: 10px 0;
          box-sizing: border-box;
          position: relative;
          box-shadow: 0 6px 18px rgba(0,0,0,.35) inset, 0 2px 10px rgba(0,0,0,.35);
        }
        .slider-container {
          position: relative;
          height: 150px;
          width: 12px;
          background: linear-gradient(180deg, #3b5167 0%, #2e4357 100%);
          border-radius: 20px;
          padding: 10px 0;
        }
        input[type="range"] {
          position: absolute;
          left: -50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(-90deg);
          transform-origin: center;
          writing-mode: bt-lr;
          -webkit-appearance: none;
          width: 150px;
          height: 12px;
          background: transparent;
          margin: 0;
          z-index: 2;
          /* Prevent page scroll while dragging the slider on touch devices */
          touch-action: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 32px;
          background: linear-gradient(180deg, #4fc3f7, #3498db);
          cursor: pointer;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }
        /* Firefox */
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 32px;
          background: linear-gradient(180deg, #4fc3f7, #3498db);
          cursor: pointer;
          border: none;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }
        /* Track styling for better disabled contrast */
        input[type="range"]::-webkit-slider-runnable-track {
          height: 12px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 12px;
          background: transparent;
        }
        .scale {
          position: absolute;
          left: 22px;
          top: 10px;
          margin-top: -3px;
          height: 140px;
          width: 13px;
          color: #c4d0da;
          font-size: 10px;
          display: var(--scale-display, block);
        }
        .scale span {
          position: absolute;
          right: 0;
          transform: translateY(50%);
        }
        .scale span:nth-child(3) { /* 0 dB tick */
          color: #ffffff;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0,0,0,.35);
        }
        label {
          margin-top: 10px;
          color: #ecf0f1;
          font-size: 12px;
          font-weight: bold;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-block;
        }
        .value-display {
          margin-top: 5px;
          color: #4fc3f7;
          font-size: 14px;
        }
        .value-display::after { content: ' dB'; }

        /* Compact only when the host becomes narrower than ~60px */
        @container (max-width: 59px) {
          .scale { display: none; }
          .value-display { font-size: 12px; }
          .value-display::after { content: ''; }
          .fader { height: 200px; padding: 8px 0; }
          .slider-container { height: 140px; width: 10px; }
          input[type="range"] { width: 150px; height: 10px; }
          input[type="range"]::-webkit-slider-thumb { width: 12px; height: 32px; }
          input[type="range"]::-moz-range-thumb { width: 12px; height: 32px; }
          label { font-size: 11px; }
        }

        /* Fallback for browsers without container queries */
        @supports not (container-type: inline-size) {
          @media (max-width: 500px) {
            .scale { display: none; }
            .value-display { font-size: 12px; }
            .value-display::after { content: ''; }
            .fader { height: 200px; padding: 8px 0; }
            .slider-container { height: 140px; width: 10px; }
            input[type="range"] { width: 160px; height: 10px; }
            input[type="range"]::-webkit-slider-thumb { width: 12px; height: 30px; }
            input[type="range"]::-moz-range-thumb { width: 12px; height: 30px; }
            label { font-size: 11px; }
          }
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
        input[type="range"]:focus-visible { outline: 3px solid rgba(33,150,243,.55); outline-offset: 2px; }
      </style>
      <div class="fader">
        <div class="slider-container">
          <input type="range" min="0" max="100" step="1" value="${sliderValue}">
          <div class="scale">
            ${ticksHtml}
          </div>
        </div>
        <label>${name}</label>
        <span class="value-display">${!isFinite(dbValue) ? '-∞' : dbValue.toFixed(1)}</span>
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
      this.valueDisplay.textContent = '-∞';
    } else {
      this.valueDisplay.textContent = `${dbValue.toFixed(1)}`;
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
