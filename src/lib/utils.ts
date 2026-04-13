import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import type { Event as AnnotationEvent } from '@/types/annotations'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      const nextCharacter = line[index + 1]
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (character === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += character
  }

  cells.push(current)
  return cells
}

function escapeCsvField(value: string | number) {
  const normalizedValue = String(value)
  if (!/[",\r\n]/.test(normalizedValue)) {
    return normalizedValue
  }

  return `"${normalizedValue.replace(/"/g, '""')}"`
}

export function serializeEventsCsv(eventItems: AnnotationEvent[]) {
  const rows = [...eventItems]
    .sort((a, b) => a.utx_timestamp_ns - b.utx_timestamp_ns)
    .map((eventItem) =>
      [
        escapeCsvField(eventItem.recording_id),
        escapeCsvField(eventItem.utx_timestamp_ns),
        escapeCsvField(eventItem.name),
        escapeCsvField(eventItem.type),
      ].join(','),
    )

  return ['recording id,timestamp [ns],name,type', ...rows].join('\r\n')
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
