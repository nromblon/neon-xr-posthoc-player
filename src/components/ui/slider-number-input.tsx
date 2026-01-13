"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SliderNumberInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  inputWidthClassName?: string; // e.g. "w-16"
  className?: string;
};

export function SliderNumberInput({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  inputWidthClassName = "w-16",
  className,
}: SliderNumberInputProps) {
  const clamp = React.useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [min, max]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        <Slider
          className="flex-1"
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(v) => onValueChange(clamp(v[0]))}
        />

        <Input
          className={cn("h-9 text-right tabular-nums", inputWidthClassName)}
          inputMode="numeric"
          value={String(value)}
          onChange={(e) => {
            // allow empty while typing
            const raw = e.target.value;
            if (raw.trim() === "") return;

            // parse + clamp
            const next = Number(raw);
            if (!Number.isFinite(next)) return;
            onValueChange(clamp(next));
          }}
          onBlur={(e) => {
            // if user clears input then blurs, reset to min
            if (e.target.value.trim() === "") onValueChange(min);
          }}
        />
      </div>
    </div>
  );
}
