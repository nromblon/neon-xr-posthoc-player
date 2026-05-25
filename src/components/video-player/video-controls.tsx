import {
  GaugeIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeOffIcon,
} from 'lucide-react'
import React from 'react'
import { useIntlayer } from 'react-intlayer'

import { VideoEventsTimeline } from './video-events-timeline'
import type { Event as AnnotationEvent } from '@/types/annotations'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Slider } from '@/components/ui/slider'

const EVENT_NAME_COLUMN_WIDTH_PX = 160

export interface VideoControlLayer {
  id: string
  label: string
}

export interface VideoControlsProps {
  currentTime: number
  duration: number
  enabledLayers: Record<string, boolean>
  events: Array<AnnotationEvent>
  isFullscreen: boolean
  isMuted: boolean
  isPlaying: boolean
  isSavingEvents: boolean
  layers: Array<VideoControlLayer>
  playbackRate: number
  playbackRates: ReadonlyArray<number>
  volume: number
  onSeek: (nextTime: number) => void
  onStepFrame: (direction: 1 | -1) => void
  onToggleFullscreen: () => Promise<void>
  onToggleLayer: (layerId: string) => void
  onToggleMute: () => void
  onTogglePlayback: () => Promise<void>
  onUpdatePlaybackRate: (nextRate: number) => void
  onUpdateVolume: (nextVolume: number) => void
  formatTime: (seconds: number) => string
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  currentTime,
  duration,
  enabledLayers,
  events,
  isFullscreen,
  isMuted,
  isPlaying,
  isSavingEvents,
  layers,
  playbackRate,
  playbackRates,
  volume,
  onSeek,
  onStepFrame,
  onToggleFullscreen,
  onToggleLayer,
  onToggleMute,
  onTogglePlayback,
  onUpdatePlaybackRate,
  onUpdateVolume,
  formatTime,
}) => {
  const content = useIntlayer('videoControls')
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pr-1">
          <Button
            onClick={() => void onTogglePlayback()}
            size="sm"
            className="w-20 shrink-0"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            {isPlaying ? content.pause : content.play}
          </Button>
          <Button
            onClick={() => onStepFrame(-1)}
            size="icon-sm"
            variant="outline"
            title={String(content.stepBackward)}
            aria-label={String(content.stepBackward)}
            className="shrink-0"
          >
            <SkipBackIcon />
          </Button>
          <Button
            onClick={() => onStepFrame(1)}
            size="icon-sm"
            variant="outline"
            title={String(content.stepForward)}
            aria-label={String(content.stepForward)}
            className="shrink-0"
          >
            <SkipForwardIcon />
          </Button>
          <HoverCard openDelay={100} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Button
                onClick={onToggleMute}
                size="icon-sm"
                variant="outline"
                title={String(isMuted || volume === 0 ? content.unmute : content.mute)}
                aria-label={String(isMuted || volume === 0 ? content.unmute : content.mute)}
                className="shrink-0"
              >
                {isMuted || volume === 0 ? <VolumeOffIcon /> : <Volume2Icon />}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-44 p-3" side="top" align="start">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {content.volume}
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(values) => {
                    const [nextVolume = 0] = values
                    onUpdateVolume(nextVolume)
                  }}
                  aria-label={String(content.volume)}
                />
              </div>
            </HoverCardContent>
          </HoverCard>
          <HoverCard openDelay={100} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                title={`${String(content.playbackSpeedPrefix)}${playbackRate}x`}
                aria-label={`${String(content.playbackSpeedPrefix)}${playbackRate}x`}
                className="shrink-0"
              >
                <GaugeIcon />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto p-2" side="top" align="start">
              <div className="flex items-center gap-1">
                {playbackRates.map((rate) => (
                  <Button
                    key={rate}
                    onClick={() => onUpdatePlaybackRate(rate)}
                    size="sm"
                    variant={playbackRate === rate ? 'default' : 'outline'}
                    title={`${String(content.setPlaybackSpeedPre)}${rate}x${String(content.setPlaybackSpeedPost)}`}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </HoverCardContent>
          </HoverCard>
          <Button
            onClick={() => void onToggleFullscreen()}
            size="icon-sm"
            variant="outline"
            title={String(isFullscreen ? content.exitFullscreen : content.enterFullscreen)}
            aria-label={String(isFullscreen ? content.exitFullscreen : content.enterFullscreen)}
            className="shrink-0"
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>
          <span className="text-sm font-medium ml-2 text-muted-foreground">
            {content.layers}
          </span>
          {layers.map((layer) => (
            <Button
              key={layer.id}
              size="sm"
              variant={enabledLayers[layer.id] ? 'default' : 'outline'}
              onClick={() => onToggleLayer(layer.id)}
            >
              {layer.label}
            </Button>
          ))}
          <div className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <VideoEventsTimeline
        currentTime={currentTime}
        duration={duration}
        eventNameColumnWidthPx={EVENT_NAME_COLUMN_WIDTH_PX}
        events={events}
        formatTime={formatTime}
        isSaving={isSavingEvents}
        onSeek={onSeek}
      />
    </div>
  )
}
