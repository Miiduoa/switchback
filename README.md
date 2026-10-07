# Switchback

**把 GPX 軌跡攤開來看。** 路線、沿途高度與每一個軌跡點，在瀏覽器裡連動查看；檔案留在你的裝置上。

[開啟工具](https://miiduoa.github.io/switchback/) · [English](docs/README.en.md) · [量測與匯出格式](docs/measurements.zh-TW.md) · [瀏覽器驗證](docs/browser-verification.md)

![Switchback 繁體中文介面，顯示合成示範軌跡](docs/screenshot.png)

## 可以做什麼

- 開啟或拖入 GPX，點選路線與高度圖，查看對應座標、高度及 UTC 時間。鍵盤可操作軌跡點滑桿。
- 按住 Shift 點選，或輸入起訖點，檢查選取範圍；每個區段也能單獨查看。
- 以公制或英制閱讀距離、爬升、下降與已記錄時間。缺漏資料保持「未記錄」，同時顯示可用相鄰點比例。
- 將選取範圍匯出為 JSON 或 CSV，保留原始座標、缺漏值與原始累積距離。
- 完整繁體中文與英文介面；隨附可下載、可重現的合成示範 GPX。

路線是**沒有底圖的投影示意圖**，不提供地形、道路或導航。示範資料不是實際步道。

## 本機執行

使用 Node.js 24.15 以上的 24.x 版本。

```sh
npm ci
npm run dev
```

開啟終端機顯示的 `/switchback/` 網址。

```sh
npm test
npm run build
npm run preview
```

TypeScript、Vite、原生 SVG 與瀏覽器 File API；沒有執行時套件、後端、分析追蹤或遠端字型。語言及單位偏好可儲存在本機，GPX 內容不會持久儲存。

## 量測規則

距離使用半正矢公式與平均地球半徑；**不同軌跡區段之間不補線，也不加總距離**。爬升與下降只加總相鄰且有高度的點，未做平滑，GPS 雜訊可能增加結果。已記錄時間只加總同區段內相鄰且嚴格遞增的時間，並非移動時間。

支援 GPX 1.0／1.1 的 `trk / trkseg / trkpt`，包含命名空間前綴。上限為 10 MiB、100,000 個點、1,000 個非空區段；不匯入 `rte` 或 `wpt`。高度範圍限 ±1,000,000 公尺。格式錯誤會拒絕整份新檔案，保留目前畫面。

圖表抽樣約 1,200 個點，另保留路線區段端點；所有量測使用完整資料。大範圍或極區路線的示意圖可能變形。[完整計算方法、時間限制與欄位定義](docs/measurements.zh-TW.md)。

## 專案結構

| 檔案 | 責任 |
| --- | --- |
| `src/core.ts` | XML 匯入、連續區段、測地距離、投影、匯出、匯入競態控制 |
| `src/main.ts` | 原生 SVG 圖表、範圍選取、檔案操作 |
| `src/i18n.ts` | 繁體中文與英文文案、錯誤訊息 |
| `src/core.test.ts` | 格式邊界、跨日界線、缺值、區段缺口、匯出與非同步匯入 |
| `src/ui.test.ts` | 語言、原生滑桿連續操作、範圍、失敗保留 |

## GitHub Pages

`vite.config.ts` 預設基底路徑為 `/switchback/`。在 GitHub 的 **Settings → Pages → Source** 選擇 **GitHub Actions**。工作流程會先執行測試、型別檢查與建置，成功後才部署 `main`；PR 只做檢查。若變更儲存庫名稱，也要調整基底路徑。

規格參考：[GPX 1.1](https://www.topografix.com/GPX/1/1/) · [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)

MIT License · Miiduoa
