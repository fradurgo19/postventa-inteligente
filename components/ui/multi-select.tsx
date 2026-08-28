'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  readonly label: string;
  readonly options: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly placeholder?: string;
  readonly className?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Todos',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (option: string) => {
    if (selected.has(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length} seleccionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-9 min-w-[140px] justify-between gap-2 font-normal', className)}
          aria-label={label}
        >
          <span className="truncate text-left">
            <span className="text-muted-foreground mr-1">{label}:</span>
            {summary}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          {value.length > 0 ? (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3">Sin opciones</p>
          ) : (
            options.map((option) => {
              const checked = selected.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                    checked && 'bg-muted/70'
                  )}
                  onClick={() => toggle(option)}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border border-border',
                      checked && 'bg-[#cf1b22] border-[#cf1b22] text-white'
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="truncate">{option}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
