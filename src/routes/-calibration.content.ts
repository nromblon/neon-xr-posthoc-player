import { t } from 'intlayer'
import type { Dictionary } from 'intlayer'

const calibrationContent = {
  key: 'calibration',
  content: {
    pageTitle: t({ en: 'Frustum Calibration', ja: '視錐台キャリブレーション' }),
    backToPlayer: t({ en: '← Back to Player', ja: '← プレイヤーに戻る' }),

    // Session upload
    uploadSession: t({
      en: 'Upload Calibration Session',
      ja: 'キャリブレーションセッションをアップロード',
    }),
    uploadSessionHint: t({
      en: 'Upload a JSON file with recordingMode, markerDistance, and markers array.',
      ja: 'recordingMode、markerDistance、マーカー配列を含むJSONファイルをアップロードしてください。',
    }),

    // Video upload
    uploadVideo: t({
      en: 'Calibration Video',
      ja: 'キャリブレーション動画',
    }),
    uploadVideoHint: t({
      en: 'Upload the video corresponding to this calibration session.',
      ja: 'このキャリブレーションセッションに対応する動画をアップロードしてください。',
    }),

    // Marker list
    markers: t({ en: 'Markers', ja: 'マーカー' }),
    markerAz: t({ en: 'Az', ja: 'Az' }),
    markerEl: t({ en: 'El', ja: 'El' }),
    remeasure: t({ en: 'Re-measure', ja: '再測定' }),
    measured: t({ en: 'Measured', ja: '測定済み' }),
    notMeasured: t({ en: 'Click to measure', ja: 'クリックして測定' }),
    activeMarker: t({ en: 'Click on video', ja: '動画をクリック' }),
    mode: t({ en: 'Mode', ja: 'モード' }),

    // Buttons
    solve: t({ en: 'Solve Intrinsics', ja: '内部パラメーターを解く' }),
    save: t({ en: 'Save Calibration', ja: 'キャリブレーションを保存' }),
    reset: t({ en: 'Reset', ja: 'リセット' }),

    // Results
    results: t({ en: 'Results', ja: '結果' }),
    intrinsicsTable: t({ en: 'Intrinsics', ja: '内部パラメーター' }),
    parameter: t({ en: 'Parameter', ja: 'パラメーター' }),
    fovEstimate: t({ en: 'FOV Estimate', ja: 'FOV 推定値' }),
    calibrated: t({ en: 'Calibrated', ja: 'キャリブレーション済み' }),
    reprojectionTable: t({ en: 'Reprojection Errors', ja: '再投影誤差' }),
    markerCol: t({ en: 'Marker', ja: 'マーカー' }),
    measuredCol: t({ en: 'Measured (u,v)', ja: '測定値 (u,v)' }),
    projectedCol: t({ en: 'Projected (u,v)', ja: '投影値 (u,v)' }),
    errorCol: t({ en: 'Error (px)', ja: '誤差 (px)' }),
    meanError: t({ en: 'Mean error', ja: '平均誤差' }),
    saveAs: t({ en: 'Save As', ja: '名前を付けて保存' }),

    // Quality badges
    qualityExcellent: t({ en: 'Excellent', ja: '優秀' }),
    qualityUsable: t({ en: 'Usable', ja: '使用可能' }),
    qualityRedo: t({ en: 'Redo', ja: 'やり直し' }),

    // cy warning
    cyWarning: t({
      en: 'Principal point (cy) is significantly off-center.',
      ja: '主点 (cy) が中心から大きくずれています',
    }),

    // Toast messages
    toastSaved: t({
      en: 'Calibration Saved',
      ja: 'キャリブレーションを保存しました',
    }),
    toastSavedDesc: t({
      en: 'Calibration intrinsics saved to a JSON file.',
      ja: 'キャリブレーション内部パラメーターをJSONファイルに保存しました。',
    }),
    toastSaveFailed: t({ en: 'Save Failed', ja: '保存に失敗しました' }),
    toastSessionError: t({ en: 'Session Error', ja: 'セッションエラー' }),
    toastSolveError: t({ en: 'Solve Error', ja: '解決エラー' }),
    toastSolveErrorDesc: t({
      en: 'Not enough measurements or degenerate marker placement.',
      ja: '測定が不十分かマーカーの配置が縮退しています。',
    }),
  },
} satisfies Dictionary

export default calibrationContent
