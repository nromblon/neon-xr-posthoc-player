"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type FolderInputProps = {
  onPick?: (files: FileList, folderName: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  className?: string;
};

export function FolderPicker({
  onPick,
  placeholder = "No folder chosen",
  buttonLabel = "Choose Folder",
  className,
}: FolderInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [label, setLabel] = React.useState(placeholder);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setLabel(placeholder);
      return;
    }

    const first = files[0] as File & { webkitRelativePath?: string };
    const folderName =
      first.webkitRelativePath?.split("/")[0] ?? "Selected folder";

    setLabel(folderName);
    onPick?.(files, folderName);
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        className="absolute w-0 h-0 overflow-hidden opacity-0"
        onChange={handleChange}
      />

      <InputGroup onClick={() => inputRef.current?.click()}>
        <InputGroupAddon align="inline-start">
          <span className="text-foreground"> {buttonLabel} </span> 
        </InputGroupAddon>
        <div className="flex flex-1 items-center px-1 text-sm font-normal text-muted-foreground">
          <span className="truncate">{label}</span>
        </div>
      </InputGroup>
    </div>
  );
}
