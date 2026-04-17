'use client'

import * as React from 'react'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

type FolderInputProps = {
  onPick?: (
    files: FileList,
    folderName: string,
    directoryHandle?: FileSystemDirectoryHandle,
    entries?: FolderPickEntry[],
  ) => void
  placeholder?: string
  buttonLabel?: string
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  selectedLabel?: string
}

export type FolderPickEntry = {
  file: File
  relativePath: string
}

async function collectDirectoryFiles(
  directoryHandle: FileSystemDirectoryHandle,
  pathPrefix = directoryHandle.name,
): Promise<FolderPickEntry[]> {
  const entries: FolderPickEntry[] = []

  for await (const entry of directoryHandle.values()) {
    const nextPath = `${pathPrefix}/${entry.name}`

    if (entry.kind === 'file') {
      entries.push({
        file: await entry.getFile(),
        relativePath: nextPath,
      })
      continue
    }

    entries.push(...(await collectDirectoryFiles(entry, nextPath)))
  }

  return entries
}

export function FolderPicker({
  onPick,
  placeholder = 'No folder chosen',
  buttonLabel = 'Choose Folder',
  className,
  inputRef,
  selectedLabel,
}: FolderInputProps) {
  if (inputRef === undefined) {
    inputRef = React.useRef<HTMLInputElement>(null)
  }
  const [label, setLabel] = React.useState(placeholder)

  React.useEffect(() => {
    setLabel(selectedLabel?.trim() ? selectedLabel : placeholder)
  }, [placeholder, selectedLabel])

  const pickWithDirectoryHandle = async () => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      inputRef.current?.click()
      return
    }

    try {
      const directoryHandle = await window.showDirectoryPicker()
      const entries = await collectDirectoryFiles(directoryHandle)

      if (entries.length === 0) {
        setLabel(placeholder)
        return
      }

      const dataTransfer = new DataTransfer()
      for (const entry of entries) {
        dataTransfer.items.add(entry.file)
      }

      setLabel(directoryHandle.name)
      onPick?.(dataTransfer.files, directoryHandle.name, directoryHandle, entries)
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('Failed to pick directory:', error)
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) {
      setLabel(placeholder)
      return
    }

    const first = files[0] as File & { webkitRelativePath?: string }
    const folderName =
      first.webkitRelativePath?.split('/')[0] ?? 'Selected folder'
    const entries = Array.from(files).map((file) => ({
      file,
      relativePath:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
        `${folderName}/${file.name}`,
    }))

    setLabel(folderName)
    onPick?.(files, folderName, undefined, entries)
  }

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        {...({
          webkitdirectory: '',
          directory: '',
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        className="absolute w-0 h-0 overflow-hidden opacity-0"
        onChange={handleChange}
      />

      <InputGroup onClick={() => void pickWithDirectoryHandle()}>
        <InputGroupAddon align="inline-start">
          <span className="text-foreground inline-flex w-23 shrink-0 justify-center whitespace-nowrap">
            {buttonLabel}
          </span>
        </InputGroupAddon>
        <div className="flex flex-1 items-center px-1 text-sm font-normal text-muted-foreground">
          <span className="truncate">{label}</span>
        </div>
      </InputGroup>
    </div>
  )
}
