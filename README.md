
# MixerGame 混音遊戲

[線上展示 Live Demo](https://christorng.github.io/MixerGame/src/)

MixerGame 是一款網頁音訊混音訓練遊戲。玩家需調整 6 軌音量，盡量還原隱藏的目標設定，訓練混音技巧。

MixerGame is a web-based audio mixing training game. Adjust 6 track faders to match hidden targets and improve your mixing skills.

## 特色 Features

- 6 軌分軌混音訓練（vocal, guitar, piano, other, bass, drum）
- 隨機增益挑戰，提升聽力與混音判斷
- 支援中英文介面
- 可自訂/擴充歌曲素材
- 現代瀏覽器免安裝，直接遊玩

---


## 開發方式 How to Develop

1. `npm install` 安裝相依套件 Install dependencies
2. `npm start` 啟動開發伺服器 (http://localhost:9000)
3. 以瀏覽器開啟 `/src/` 進行手動測試
4. `npm run build` 產生 production bundle 至 `dist/`
5. Windows 可用 `run.cmd` 快速啟動

> 測試：目前無自動化測試，請以瀏覽器手動測試


## 主要結構 Project Structure

```
src/
  index.ts           # 主遊戲邏輯 Main game logic
  volume-slider.ts   # 自訂 fader Web Component
  index.html         # UI 版面
  index.css          # 樣式
songs/
  [Artist]/[SongName]/
    vocal.mp3, guitar.mp3, piano.mp3, other.mp3, bass.mp3, drum.mp3
    (可選) *.png 波形圖 waveform images (optional)
```


## 新增歌曲 Adding New Songs
1. 在 `songs/` 建立資料夾結構 Create folder in `songs/`
2. 更新 MixerGame tracksBaseUrl（如有需要）Update `tracksBaseUrl` in MixerGame if needed
3. 確認 6 軌檔案齊全 Ensure all 6 tracks exist

---
本專案歡迎貢獻與建議，請以 PR 或 issue 聯絡。