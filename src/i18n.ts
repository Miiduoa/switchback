export type Language = 'zh-TW' | 'en';
const en = {
  subtitle: 'A GPX FIELD NOTEBOOK', local: 'Your file stays on this device', open: 'Open a GPX file',
  notebook: 'THE ROUTE NOTEBOOK', intro: 'Every turn, a little clearer.',
  introBody: 'Unfold a track. Follow the climb. Find the details between the start and the finish.',
  sample: 'SYNTHETIC DEMO', yourTrack: 'YOUR TRACK', demoName: 'Switchback study',
  sampleNote: 'An invented track for exploring the notebook. Not a real trail.',
  importedNote: 'Read directly from your file. Nothing is uploaded.',
  route: 'Route trace', routeSub: 'A line through the landscape', schematic: 'SCHEMATIC · NO BASEMAP', north: 'N',
  start: 'Start', finish: 'Finish', inspect: 'Click a point to inspect it. Shift-click to select a range.',
  elevation: 'The ups and downs', elevationSub: 'Elevation along the track', noElevation: 'This track has no recorded elevations.',
  distance: 'Distance', ascent: 'Recorded ascent', descent: 'Recorded descent', elapsed: 'Recorded time',
  minElevation: 'Lowest point', maxElevation: 'Highest point', point: 'POINT', of: 'of',
  pointLabel: 'Inspect point', lat: 'Latitude', lon: 'Longitude', elevationLabel: 'Elevation', timestamp: 'Timestamp (UTC)',
  unknown: 'Not recorded', segment: 'Segment', segments: 'Segments', points: 'points',
  selection: 'A closer look', selectionSub: 'Choose the part that matters', from: 'First point', to: 'Last point',
  fullTrack: 'Full track', selected: 'Selected range', reset: 'Reset range', rangeNote: 'Exports contain the selected range. Cumulative distance keeps its original track origin.',
  export: 'Take your notes', exportBody: 'Measurements and original points, ready for your next step.',
  exportJSON: 'Export JSON', exportCSV: 'Export CSV', demoDownload: 'Download demo GPX', loadDemo: 'Return to demo',
  methods: 'How this notebook measures', methodsIntro: 'Transparent measurements. Useful limits.',
  distanceMethod: 'Distance uses the haversine formula on WGS84 latitude/longitude with a mean Earth radius of 6,371,008.8 m. It is horizontal distance; elevation does not add length. Segment gaps never count.',
  elevationMethod: 'Ascent and descent sum raw differences between adjacent points with elevation. Missing elevation breaks the calculation. There is no smoothing: GPS noise can increase these totals.',
  timeMethod: 'Recorded time sums strictly increasing timestamps between adjacent points in the same segment. Missing, equal, or backward times are excluded. This is not moving time; no speed estimate is inferred.',
  viewMethod: 'The route is an equirectangular schematic, not a map. It has no terrain, roads, or navigation guidance. Large areas and polar routes are distorted. Charts sample roughly 1,200 points plus route segment endpoints; calculations use all points.',
  limitsMethod: 'GPX 1.0 / 1.1 tracks only, up to 10 MiB, 100,000 points, and 1,000 segments. Routes and waypoints are not imported. Malformed coordinates, supplied elevations, or timestamps reject the file. Elevation must be within ±1,000,000 m. Timezones are required; leap seconds are unsupported.',
  privacyMethod: 'Files are read in this browser. No upload, analytics, remote fonts, or data storage. Only language and unit preferences are saved when browser storage is available.',
  drop: 'Drop one GPX file anywhere to open it', dropTitle: 'A new line to follow.',
  reading: 'Reading your GPX file…', loaded: 'Track loaded.', failed: 'The track could not be opened.', kept: 'Your current track is unchanged.',
  fileLimit: 'This file exceeds the 10 MiB limit. Export a shorter track and try again.',
  multipleFiles: 'Choose one GPX file at a time.', exportDone: 'Export downloaded.',
  coverage: 'usable adjacent pairs', timeExcluded: 'equal or backward time pairs excluded',
  recorded: 'recorded', none: '—', metric: 'Metric', imperial: 'Imperial', units: 'Measurement units', language: 'Interface language',
  footer: 'Made for looking closer.', localOnly: 'LOCAL FILES. OPEN METHODS.',
  routeAria: 'Route schematic. Use the point slider below for keyboard inspection.',
  elevationAria: 'Elevation profile. Use the point slider below for keyboard inspection.',
  gap: 'Segment gaps excluded', synthetic: 'Synthetic data', source: 'Source',
  whole: 'All points', partial: 'Partial data', emptyTime: 'No usable time pairs', emptyElevation: 'No usable elevation pairs',
};

const zh: typeof en = {
  subtitle: '一份 GPX 路線筆記', local: '檔案留在你的裝置上', open: '開啟 GPX 檔案',
  notebook: '把走過的路，攤開來看', intro: '每個轉彎，都有細節。',
  introBody: '讀一段軌跡，看看爬升，找出起點與終點之間的小事。',
  sample: '合成示範資料', yourTrack: '你的軌跡', demoName: '折返線練習',
  sampleNote: '這是一段為了示範而產生的軌跡，並非真實步道。',
  importedNote: '直接讀取你的檔案；內容不會上傳。',
  route: '路線輪廓', routeSub: '沿著這條線，再走一次', schematic: '路線示意圖 · 無底圖', north: '北',
  start: '起點', finish: '終點', inspect: '點選路線或高度圖查看資料；按住 Shift 點選可圈定範圍。',
  elevation: '那些上坡與下坡', elevationSub: '沿途高度變化', noElevation: '這段軌跡沒有記錄高度。',
  distance: '距離', ascent: '已記錄爬升', descent: '已記錄下降', elapsed: '已記錄時間',
  minElevation: '最低點', maxElevation: '最高點', point: '軌跡點', of: '／',
  pointLabel: '查看軌跡點', lat: '緯度', lon: '經度', elevationLabel: '高度', timestamp: '時間（UTC）',
  unknown: '未記錄', segment: '區段', segments: '軌跡區段', points: '個點',
  selection: '靠近一點看', selectionSub: '選出你想了解的那一段', from: '起始點', to: '結束點',
  fullTrack: '整段軌跡', selected: '選取範圍', reset: '重設範圍', rangeNote: '匯出包含選取範圍內的點；累積距離仍以原始軌跡起點計算。',
  export: '帶走這份筆記', exportBody: '原始座標與計算結果，留給下一步使用。',
  exportJSON: '匯出 JSON', exportCSV: '匯出 CSV', demoDownload: '下載示範 GPX', loadDemo: '回到示範軌跡',
  methods: '這份筆記怎麼計算', methodsIntro: '看得見的方法，也說清楚限制。',
  distanceMethod: '距離以 WGS84 經緯度套用半正矢公式計算，採地球平均半徑 6,371,008.8 公尺。這是水平距離，不加計高度造成的路程；不同區段之間不連線，也不計算距離。',
  elevationMethod: '爬升與下降加總相鄰且都有高度的點之高度差。缺漏高度會中斷計算，並顯示可用資料比例。未做平滑處理，因此 GPS 雜訊可能增加總量。',
  timeMethod: '已記錄時間只加總同一區段內相鄰、時間嚴格遞增的點。缺漏、相同或倒退的時間不計入。這不是移動時間，也不推估速度。',
  viewMethod: '路線使用等距圓柱投影繪製示意圖，沒有地形、道路或導航資訊。大範圍與極區軌跡可能變形。圖表約抽樣至 1,200 個點，另保留路線各區段端點；計算仍使用全部資料。',
  limitsMethod: '支援 GPX 1.0／1.1 軌跡，最多 10 MiB、100,000 個點及 1,000 個區段；不匯入路線規劃（route）或航點（waypoint）。座標、有填寫的高度或時間格式錯誤時會拒絕整份檔案。高度須在 ±1,000,000 公尺內。時間必須含時區，不支援閏秒。',
  privacyMethod: '檔案只在瀏覽器中讀取，沒有上傳、分析追蹤、遠端字型或軌跡儲存。瀏覽器允許時，只記住語言與單位偏好。',
  drop: '將一個 GPX 檔案拖曳到頁面即可開啟', dropTitle: '換一條路，繼續看。',
  reading: '正在讀取 GPX 檔案…', loaded: '軌跡已載入。', failed: '無法開啟這份軌跡。', kept: '目前顯示的軌跡保持不變。',
  fileLimit: '檔案超過 10 MiB 上限，請匯出較短的軌跡後再試。',
  multipleFiles: '請一次選擇一個 GPX 檔案。', exportDone: '已下載匯出檔案。',
  coverage: '組可用相鄰點', timeExcluded: '組相同或倒退的時間已排除',
  recorded: '已記錄', none: '—', metric: '公制', imperial: '英制', units: '量測單位', language: '介面語言',
  footer: '為了看得更仔細。', localOnly: '本機檔案。公開方法。',
  routeAria: '路線示意圖。鍵盤使用者可透過下方滑桿查看各軌跡點。',
  elevationAria: '高度剖面圖。鍵盤使用者可透過下方滑桿查看各軌跡點。',
  gap: '不計區段間斷點', synthetic: '合成資料', source: '資料來源',
  whole: '全部軌跡點', partial: '資料不完整', emptyTime: '沒有可用的相鄰時間', emptyElevation: '沒有可用的相鄰高度',
};

export function strings(language: Language): typeof en { return language === 'zh-TW' ? zh : en; }

export function localizeError(message: string, language: Language): string {
  if (language === 'en') return message;
  if (message === 'Choose one GPX file at a time.') return zh.multipleFiles;
  if (message.includes('10 MiB')) return zh.fileLimit;
  if (message.includes('100,000')) return '檔案超過 100,000 個點的上限，請簡化軌跡後再試。';
  if (message.includes('1,000-segment')) return '檔案超過 1,000 個區段的上限，請拆分軌跡後再試。';
  if (message.includes('Elevation exceeds')) return '高度超過支援範圍，必須介於 ±1,000,000 公尺。';
  if (message.includes('document types or entities')) return '不支援含文件類型宣告或實體宣告的 GPX 檔案。';
  if (message.includes('not valid XML')) return '這份檔案的 XML 格式不正確，請確認 GPX 匯出檔案是否完整。';
  if (message.includes('Expected a GPX')) return '請使用 GPX 1.0 或 1.1 格式的檔案。';
  if (message.includes('No track points')) return '找不到軌跡點。請匯出包含 trk／trkseg／trkpt 的 GPX 軌跡；不支援只有路線規劃或航點的檔案。';
  if (message.includes('Coordinates')) return '緯度須介於 ±90°，經度須介於 ±180°。';
  if (message.includes('timestamp')) return '時間格式不正確；請使用有效的 ISO 日期、時間與時區。';
  if (message.includes('latitude')) return '緯度無效，必須填寫完整的有限數值。';
  if (message.includes('longitude')) return '經度無效，必須填寫完整的有限數值。';
  if (message.includes('elevation')) return '高度無效，有填寫時必須是完整的有限數值。';
  return '無法讀取這份檔案，請確認檔案可正常存取後再試。';
}
