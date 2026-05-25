import {  t } from 'intlayer'
import type {Dictionary} from 'intlayer';

const videoplayerContent = {
  key: 'videoplayer',
  content: {
    gazeLayer: t({ en: 'Gaze', ja: '視線' }),
  },
} satisfies Dictionary

export default videoplayerContent
