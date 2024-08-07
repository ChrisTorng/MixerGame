class VolumeSlider extends HTMLElement {
  private slider!: HTMLInputElement;

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
          margin: 0 10px 20px;
        }
        input[type="range"] {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 20px;
          height: 150px;
          margin: 0 10px;
        }
        label {
          margin-top: 10px;
          text-align: center;
          color: white;
        }
      </style>
      <div class="fader">
        <input type="range" min="0" max="1" step="0.01" value="0.5" orient="vertical">
        <label>${name}</label>
      </div>
    `;
    this.slider = this.shadowRoot!.querySelector('input')!;
  }

  setupEventListeners() {
    this.slider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.dispatchEvent(new CustomEvent('change', { 
        detail: { value: parseFloat(target.value) },
        bubbles: true,
        composed: true
      }));
    });
  }

  setDisabled(isDisabled: boolean) {
    this.slider.disabled = isDisabled;
  }

  setValue(value: number) {
    this.slider.value = value.toString();
  }
}

// 只在元素未被定義時進行註冊
if (!customElements.get('volume-slider')) {
  customElements.define('volume-slider', VolumeSlider);
}

export default VolumeSlider;