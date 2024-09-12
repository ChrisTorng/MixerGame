class VolumeSlider extends HTMLElement {
  private slider!: HTMLInputElement;
  private valueDisplay!: HTMLSpanElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const name = this.getAttribute('name') || 'Track';
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
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
          left: 0;
          height: 150px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #bdc3c7;
          font-size: 10px;
        }
        .scale span {
          position: relative;
        }
        .scale span::before {
          content: '';
          position: absolute;
          right: -12px;
          top: 50%;
          width: 8px;
          height: 1px;
          background: #bdc3c7;
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
          <input type="range" min="0" max="100" step="1" value="50">
          <div class="scale">
            <span>14</span>
            <span>8</span>
            <span>0</span>
            <span>-10</span>
            <span>-20</span>
            <span>-∞</span>
          </div>
        </div>
        <label>${name}</label>
        <span class="value-display">0 dB</span>
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
            composed: true
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
    // Convert gain to dB, then map dB range to slider range
    const db = this.gainToDb(gain);
    return Math.round(((db + 20) / 34) * 100);
  }

  private sliderValueToGain(value: number): number {
    // Map slider range to dB range, then convert dB to gain
    const db = ((value / 100) * 34) - 20;
    return this.dbToGain(db);
  }

  private updateValueDisplay(dbValue: number) {
    if (dbValue <= -70) {
      this.valueDisplay.textContent = '-∞ dB';
    } else {
      this.valueDisplay.textContent = `${dbValue.toFixed(1)} dB`;
    }
  }
  
  private gainToDb(gainValue: number): number {
    return 20 * Math.log10(gainValue);
  }

  private dbToGain(dbValue: number): number {
    return Math.pow(10, dbValue / 20);
  }
}

if (!customElements.get('volume-slider')) {
  customElements.define('volume-slider', VolumeSlider);
}

export default VolumeSlider;