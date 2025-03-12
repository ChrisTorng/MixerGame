class VolumeSlider extends HTMLElement {
  private slider!: HTMLInputElement;
  private valueDisplay!: HTMLSpanElement;
  private initialGain: number = 1;
  private static readonly MIN_DB = -70; // 代表 -∞ dB
  private static readonly MAX_DB = 14;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const valueAttr = this.getAttribute('value');
    if (valueAttr !== null) {
      this.initialGain = parseFloat(valueAttr);
    }
    this.render();
    this.setupEventListeners();
  }

  render() {
    const name = this.getAttribute('name') || 'Track';
    const sliderValue = this.gainToSliderValue(this.initialGain);
    const dbValue = this.gainToDb(this.initialGain);
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
          width: 40px;
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
          width: 20px;
          height: 40px;
          background: #3498db;
          cursor: pointer;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .scale {
          position: absolute;
          left: 45px;
          top: 10px;
          height: 150px;
          width: 20px;
          color: #bdc3c7;
          font-size: 10px;
        }
        .scale span {
          position: absolute;
          left: 0;
          transform: translateY(50%);
        }
        label {
          margin-top: 10px;
          text-align: center;
          color: #ecf0f1;
          font-size: 12px;
          font-weight: bold;
        }
        .value-display {
          margin-top: 5px;
          color: #3498db;
          font-size: 14px;
        }
      </style>
      <div class="fader">
        <div class="slider-container">
          <input type="range" min="0" max="100" step="1" value="${sliderValue}">
          <div class="scale">
            <span style="bottom: 100%;">14</span>
            <span style="bottom: 92.86%;">8</span>
            <span style="bottom: 83.33%;">0</span>
            <span style="bottom: 71.43%;">-10</span>
            <span style="bottom: 59.52%;">-20</span>
            <span style="bottom: 0%;">-∞</span>
          </div>
        </div>
        <label>${name}</label>
        <span class="value-display">${dbValue <= VolumeSlider.MIN_DB + 0.1 ? '-∞' : dbValue.toFixed(1)} dB</span>
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
  }

  setValue(gainValue: number) {
    const sliderValue = this.gainToSliderValue(gainValue);
    this.slider.value = sliderValue.toString();
    this.updateValueDisplay(this.gainToDb(gainValue));
  }

  private gainToSliderValue(gain: number): number {
    if (gain <= 0) {
      return 0;
    } else {
      const db = this.gainToDb(gain);
      const value = ((db - VolumeSlider.MIN_DB) / (VolumeSlider.MAX_DB - VolumeSlider.MIN_DB)) * 100;
      return Math.round(value);
    }
  }

  private sliderValueToGain(value: number): number {
    if (value <= 0) {
      return 0;
    } else {
      const db = ((value / 100) * (VolumeSlider.MAX_DB - VolumeSlider.MIN_DB)) + VolumeSlider.MIN_DB;
      return this.dbToGain(db);
    }
  }

  private updateValueDisplay(dbValue: number) {
    if (dbValue <= VolumeSlider.MIN_DB + 0.1 || !isFinite(dbValue)) {
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
}

if (!customElements.get('volume-slider')) {
  customElements.define('volume-slider', VolumeSlider);
}

export default VolumeSlider;
