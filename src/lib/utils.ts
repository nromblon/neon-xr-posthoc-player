import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import type { Event as AnnotationEvent } from '@/types/annotations'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function serializeEventsCsv(eventItems: AnnotationEvent[]) {
  const rows = [...eventItems]
    .sort((a, b) => a.utx_timestamp_ns - b.utx_timestamp_ns)
    .map(
      (eventItem) =>
        `${eventItem.utx_timestamp_ns},${JSON.stringify(eventItem.name)}`,
    )

  return ['timestamp [ns],name', ...rows].join('\r\n')
}

export async function writeEventsCsv(
  directoryHandle: FileSystemDirectoryHandle,
  eventItems: AnnotationEvent[],
) {
  const handle = await directoryHandle.getFileHandle('events.csv', {
    create: true,
  })
  const writable = await handle.createWritable()
  await writable.write(serializeEventsCsv(eventItems))
  await writable.close()
}
