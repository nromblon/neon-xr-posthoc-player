import {  t } from 'intlayer'
import type {Dictionary} from 'intlayer';

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
