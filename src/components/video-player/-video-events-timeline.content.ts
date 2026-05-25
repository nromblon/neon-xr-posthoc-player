import { t } from 'intlayer'
import type { Dictionary } from 'intlayer'

const videoEventsTimelineContent = {
  key: 'videoTimeline',
  content: {
    addEvent: t({ en: '+ Add Event', ja: '+ イベントを追加' }),
    savingEvents: t({ en: 'Saving Events', ja: 'イベントを保存中' }),
    searchEventsPlaceholder: t({
      en: 'Search events...',
      ja: 'イベントを検索...',
    }),
    track: t({ en: 'Track', ja: 'トラック' }),
    events: t({ en: 'Events', ja: 'イベント' }),
    rightClickToDelete: t({
      en: 'Right-click to delete this event',
      ja: '右クリックで削除',
    }),
    isReservedSuffix: t({
      en: ' is reserved and cannot be created manually.',
      ja: 'は予約済みのため手動で作成できません。',
    }),
    deleteEventPrefix: t({ en: 'Delete', ja: '削除' }),
  },
} satisfies Dictionary

export default videoEventsTimelineContent
