"use client";

import type { ChatModelOption } from "@/lib/ai/models";
import { ChevronDownIcon } from "@/components/ui/icons";

interface ModelSelectProps {
  value: string;
  options: ChatModelOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelect({ value, options, onChange, disabled }: ModelSelectProps) {
  return (
    <div className="relative inline-flex w-fit shrink-0">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pilih model AI"
        className="appearance-none rounded-md border border-border bg-surface py-1.5 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none hover:text-foreground disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
    </div>
  );
}
