import {  t } from 'intlayer'
import type {Dictionary} from 'intlayer';

const videoControlsContent = {
  key: 'videoControls',
  content: {
    play: t({ en: 'Play', ja: '再生' }),
    pause: t({ en: 'Pause', ja: '一時停止' }),
    stepBackward: t({ en: 'Step backward one frame', ja: '1フレーム後退' }),
    stepForward: t({ en: 'Step forward one frame', ja: '1フレーム前進' }),
    mute: t({ en: 'Mute', ja: 'ミュート' }),
    unmute: t({ en: 'Unmute', ja: 'ミュート解除' }),
    volume: t({ en: 'Volume', ja: '音量' }),
    playbackSpeedPrefix: t({ en: 'Playback speed: ', ja: '再生速度: ' }),
    setPlaybackSpeedPre: t({ en: 'Set playback speed to ', ja: '再生速度を' }),
    setPlaybackSpeedPost: t({ en: '', ja: 'に設定' }),
    enterFullscreen: t({ en: 'Enter fullscreen', ja: '全画面表示' }),
    exitFullscreen: t({ en: 'Exit fullscreen', ja: '全画面表示を終了' }),
    layers: t({ en: 'Layers', ja: 'レイヤー' }),
  },
} satisfies Dictionary

export default videoControlsContent
