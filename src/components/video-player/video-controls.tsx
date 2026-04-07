import {
  GaugeIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeOffIcon,
} from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'

const TIMELINE_TAGS = [
  'Tag 1',
  'Tag 2',
  'Tag 3',
  'Tag 4',
  'Tag 5',
  'Tag 6',
  'Tag 7',
  'Tag 8',
  'Tag 9',
  'Tag 10',
]

const EVENT_NAME_COLUMN_WIDTH_PX = 160

export interface VideoControlLayer {
  id: string
  label: string
}

export interface VideoControlsProps {
  currentTime: number
  duration: number
  enabledLayers: Record<string, boolean>
  isFullscreen: boolean
  isMuted: boolean
  isPlaying: boolean
  layers: VideoControlLayer[]
  playbackRate: number
  playbackRates: readonly number[]
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
  isFullscreen,
  isMuted,
  isPlaying,
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
  const timelineGridTemplate = `${EVENT_NAME_COLUMN_WIDTH_PX}px minmax(0, 1fr)`

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-3">
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pr-1">
          <Button
            onClick={() => void onTogglePlayback()}
            size="sm"
            className="w-20 shrink-0"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            onClick={() => onStepFrame(-1)}
            size="icon-sm"
            variant="outline"
            title="Step backward one frame"
            aria-label="Step backward one frame"
            className="shrink-0"
          >
            <SkipBackIcon />
          </Button>
          <Button
            onClick={() => onStepFrame(1)}
            size="icon-sm"
            variant="outline"
            title="Step forward one frame"
            aria-label="Step forward one frame"
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
                title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                className="shrink-0"
              >
                {isMuted || volume === 0 ? <VolumeOffIcon /> : <Volume2Icon />}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-44 p-3" side="top" align="start">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Volume
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
                  aria-label="Volume"
                />
              </div>
            </HoverCardContent>
          </HoverCard>
          <HoverCard openDelay={100} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                title={`Playback speed: ${playbackRate}x`}
                aria-label={`Playback speed: ${playbackRate}x`}
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
                    title={`Set playback speed to ${rate}x`}
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
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="shrink-0"
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>
          <div className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div
          className="mb-3 grid items-center gap-3"
          style={{ gridTemplateColumns: timelineGridTemplate }}
        >
          <div className="text-sm font-medium text-muted-foreground">
            Playback
          </div>
          <Slider
            min={0}
            max={duration || 0.001}
            step={0.001}
            value={[Math.min(currentTime, duration || 0)]}
            onValueChange={(values) => {
              const [nextTime = 0] = values
              onSeek(nextTime)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Layers
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
        </div>
      </div>

      <div className="p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-medium leading-none">Events</h4>
            <Button variant="outline" size="sm" className="text-xs">
              + Add Event
            </Button>
          </div>
          <InputGroup className="w-44">
            <SearchIcon className="ml-2 size-4 text-muted-foreground" />
            <InputGroupInput
              placeholder="Search events..."
              className="text-xs"
            />
          </InputGroup>
        </div>

        <div className="overflow-hidden rounded-md border">
          <div
            className="grid border-b bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: timelineGridTemplate }}
          >
            <div className="border-r px-4 py-2">Event</div>
            <div className="px-4 py-2">Timeline</div>
          </div>

          <ScrollArea className="h-72">
            <div className="divide-y">
              {TIMELINE_TAGS.map((tag) => (
                <div
                  key={tag}
                  className="grid min-h-12"
                  style={{ gridTemplateColumns: timelineGridTemplate }}
                >
                  <div className="border-r px-4 py-3 text-sm">{tag}</div>
                  <div className="px-4 py-3">
                    <div className="relative h-6 rounded-full bg-muted/50">
                      <div className="absolute inset-y-1 left-0 right-0 rounded-full bg-gradient-to-r from-border via-transparent to-border" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
