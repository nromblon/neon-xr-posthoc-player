import { t } from 'intlayer'
import type { Dictionary } from 'intlayer'

const appContent = {
  key: 'app',
  content: {
    // Empty state
    noData: t({ en: 'No data', ja: 'データなし' }),
    chooseFiles: t({
      en: 'Choose XR Video and Gaze Data Folder',
      ja: 'XR映像と視線データフォルダーを選択してください',
    }),

    // Setup
    setup: t({ en: 'Setup', ja: 'セットアップ' }),
    recordingFolder: t({ en: 'Recording Folder', ja: '録音フォルダー' }),
    chooseFolderButton: t({ en: 'Choose Folder', ja: 'フォルダーを選択' }),
    chooseRecordingFolderPlaceholder: t({
      en: 'Choose a recording folder',
      ja: '録音フォルダーを選択してください',
    }),
    xrVideoLabel: t({
      en: 'XR Video (Scene Video)',
      ja: 'XR映像（シーン映像）',
    }),
    neonGazeData: t({ en: 'Neon Gaze Data', ja: 'Neon 視線データ' }),
    projectorSettings: t({
      en: 'Projector Settings',
      ja: '視線プロジェクター設定',
    }),
    resetConfigTitle: t({
      en: 'Reset to previous config.json values',
      ja: 'config.jsonの値にリセット',
    }),
    saveConfigTitle: t({
      en: 'Save to config_modified.json',
      ja: 'config_modified.jsonに保存',
    }),
    calibrationFile: t({
      en: 'Neon XR Calibration File (config.json)',
      ja: 'Neon XR キャリブレーションファイル (config.json)',
    }),
    recordingMode: t({ en: 'Recording Mode', ja: '録画モード' }),
    calibratedIntrinsicsLoaded: t({
      en: 'Calibrated intrinsics loaded',
      ja: 'キャリブレーション済み内部パラメーター読み込み済み',
    }),
    usingFovEstimate: t({
      en: 'Using FOV estimate',
      ja: 'FOV 推定値を使用中',
    }),
    meanError: t({ en: 'mean error', ja: '平均誤差' }),
    horizontalFov: t({ en: 'Horizontal FOV', ja: '水平視野角' }),
    fovSliderHint: t({
      en: 'Lower if there is centre pull',
      ja: '中心への引きがある場合は下げてください',
    }),
    sensorOffsets: t({ en: 'Sensor Offsets', ja: 'センサーオフセット' }),
    translationMm: t({ en: 'Translation (mm)', ja: '平行移動 (mm)' }),
    rotationDeg: t({ en: 'Rotation (degrees)', ja: '回転 (度)' }),

    // Adjustments
    adjustments: t({ en: 'Adjustments', ja: '調整' }),
    adjustmentsMetadata: t({
      en: 'Adjustments Metadata',
      ja: '調整メタデータ',
    }),
    saveAdjustmentsTitle: t({
      en: 'Save to adjustments-config.json',
      ja: 'adjustments-config.jsonに保存',
    }),
    gazeStartTime: t({ en: 'Gaze Start Time', ja: '視線開始時間' }),
    gazeBackOneFrame: t({
      en: 'Press when gaze is behind by one frame',
      ja: '視線が1フレーム遅れている場合に押す',
    }),
    gazeForwardOneFrame: t({
      en: 'Press when gaze is ahead by one frame',
      ja: '視線が1フレーム先行している場合に押す',
    }),
    setCurrentTimeAsGazeStart: t({
      en: 'Set Current Time as Gaze Start Time',
      ja: '現在の時間を視線開始時間に設定',
    }),
    gazeOffset2d: t({ en: '2D Gaze Offset', ja: '2D 視線オフセット' }),

    // Export
    exportGazeVideo: t({ en: 'Export Gaze Video', ja: '視線映像エクスポート' }),
    exportDescription: t({
      en: 'Export the current scene video with the gaze overlay burned into an MP4 file.',
      ja: '現在のシーン映像に視線オーバーレイを焼き付けてMP4ファイルとしてエクスポートします。',
    }),
    exportPreparing: t({
      en: 'Preparing Export...',
      ja: 'エクスポートを準備中...',
    }),
    exportInProgress: t({ en: 'Exporting', ja: 'エクスポート中' }),
    exportSaving: t({ en: 'Saving MP4...', ja: 'MP4を保存中...' }),
    exportSuccess: t({
      en: 'Export completed and the MP4 file was saved.',
      ja: 'エクスポートが完了し、MP4ファイルが保存されました。',
    }),
    exportLoadFilesHint: t({
      en: 'Load a scene video, gaze data, and config file to enable export.',
      ja: 'エクスポートを有効にするには、シーン映像、視線データ、および設定ファイルを読み込んでください。',
    }),
    exportUsesSettings: t({
      en: 'The export uses the current gaze timing, offsets, projector settings, and gaze style.',
      ja: 'エクスポートでは、現在の視線タイミング、オフセット、視線プロジェクター設定、および視線スタイルが使用されます。',
    }),

    // Toast notifications — titles
    toastSelectionError: t({ en: 'Selection Error', ja: '選択エラー' }),
    toastAdjustmentsLoaded: t({
      en: 'Adjustments Loaded',
      ja: '調整を読み込みました',
    }),
    toastAdjustmentsLoadFailed: t({
      en: 'Adjustments Load Failed',
      ja: '調整の読み込みに失敗しました',
    }),
    toastConfigSaved: t({ en: 'Config Saved', ja: '設定を保存しました' }),
    toastConfigReset: t({ en: 'Config Reset', ja: '設定をリセットしました' }),
    toastConfigResetFailed: t({
      en: 'Config Reset Failed',
      ja: '設定のリセットに失敗しました',
    }),
    toastAdjustmentsSaved: t({
      en: 'Adjustments Saved',
      ja: '調整を保存しました',
    }),
    toastSaveFailed: t({ en: 'Save Failed', ja: '保存に失敗しました' }),

    // Toast notifications — descriptions
    toastGazeFileNotFound: t({
      en: "Unable to find valid gaze data file. Please select a folder containing 'gaze.csv'.",
      ja: "有効な視線データファイルが見つかりません。'gaze.csv' を含むフォルダーを選択してください。",
    }),
    toastAutoSelectFailed: t({
      en: "Unable to auto-select files. Expected a top-level 'scene*' video, a 'data*' folder, and either 'config_modified.json' or 'config.json'.",
      ja: "ファイルの自動選択に失敗しました。最上位に 'scene*' 映像、'data*' フォルダー、'config_modified.json' または 'config.json' が必要です。",
    }),
    toastDataFolderMissingGazePre: t({ en: "Found '", ja: '「' }),
    toastDataFolderMissingGazeSuf: t({
      en: "' but it does not contain 'gaze.csv'.",
      ja: "」に 'gaze.csv' が見つかりません。",
    }),
    toastAdjustmentsLoadedFromFolder: t({
      en: 'Loaded adjustments-config.json from the recording folder.',
      ja: '録音フォルダーから adjustments-config.json を読み込みました。',
    }),
    toastAdjustmentsLoadFailedFromFolder: t({
      en: 'Unable to parse adjustments-config.json from the recording folder.',
      ja: '録音フォルダーの adjustments-config.json を解析できませんでした。',
    }),
    toastConfigSavedDesc: t({
      en: 'Saved the updated offsets to config_modified.json.',
      ja: '更新されたオフセットを config_modified.json に保存しました。',
    }),
    toastConfigResetDesc: t({
      en: 'Reset offsets to values from config.json.',
      ja: 'config.json の値にオフセットをリセットしました。',
    }),
    toastConfigResetFailedDesc: t({
      en: 'Unable to parse config.json to reset offsets.',
      ja: 'config.json を解析してオフセットをリセットできませんでした。',
    }),
    toastAdjustmentsLoadedDesc: t({
      en: 'Loaded adjustments-config.json.',
      ja: 'adjustments-config.json を読み込みました。',
    }),
    toastAdjustmentsLoadFailedDesc: t({
      en: 'Unable to parse adjustments-config.json.',
      ja: 'adjustments-config.json を解析できませんでした。',
    }),
    toastAdjustmentsSavedDesc: t({
      en: 'Saved the adjustments to adjustments-config.json.',
      ja: '調整を adjustments-config.json に保存しました。',
    }),
    toastSaveFailedDesc: t({
      en: 'Unable to save adjustments-config.json.',
      ja: 'adjustments-config.json を保存できませんでした。',
    }),

    // Gaze Visualizer Style
    gazeVisualizerStyle: t({
      en: 'Gaze Visualizer Style',
      ja: '視線ビジュアライザースタイル',
    }),
    radius: t({ en: 'Radius', ja: '半径' }),
    strokeWidth: t({ en: 'Stroke Width', ja: '線の太さ' }),
    color: t({ en: 'Color', ja: '色' }),
  },
} satisfies Dictionary

export default appContent
