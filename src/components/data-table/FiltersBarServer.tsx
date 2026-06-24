"use client";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useUrlParams } from "@/hooks/useUrlParams";
import type { FilterConfig } from "@/types/filters";

const DEBOUNCE_MS = 400;

interface FiltersBarServerProps {
  filters: FilterConfig[];
}

export function FiltersBarServer({ filters }: FiltersBarServerProps) {
  const { clearAllParams } = useUrlParams();

  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map((f) => (
        <FilterField key={f.columnId} config={f} />
      ))}
      <Button variant="ghost" size="sm" onClick={clearAllParams} className="ml-auto">
        <X className="mr-1 h-3 w-3" />
        Limpiar
      </Button>
    </div>
  );
}

function FilterField({ config }: { config: FilterConfig }) {
  switch (config.type) {
    case "input":
      return <InputFilter config={config} />;
    case "multi-select":
      return <MultiSelectFilter config={config} />;
    case "date-range":
      return <DateRangeFilter config={config} />;
    default:
      return null;
  }
}

// ── input ──────────────────────────────────────────────────────────────────

function InputFilter({ config }: { config: FilterConfig }) {
  const { getParam, setMultipleParams } = useUrlParams();
  const urlValue = getParam(config.columnId) ?? "";
  const [local, setLocal] = useState(urlValue);

  // Sincronizar si la URL cambia externamente (back/forward)
  useEffect(() => {
    setLocal(urlValue);
  }, [urlValue]);

  // Debounce: actualiza URL después de 400ms sin tipear
  useEffect(() => {
    if (local === urlValue) return;
    const id = setTimeout(() => {
      setMultipleParams({ [config.columnId]: local || null, page: "1" });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{config.placeholder}</Label>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={config.placeholder}
        className={config.isCompact ? "h-8 w-[180px]" : "w-[220px]"}
      />
    </div>
  );
}

// ── multi-select ───────────────────────────────────────────────────────────

function MultiSelectFilter({ config }: { config: FilterConfig }) {
  const { getArrayParam, setMultipleParams } = useUrlParams();
  const selected = getArrayParam(config.columnId);
  const options = config.customOptions ?? [];

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setMultipleParams({ [config.columnId]: next.length > 0 ? next : null, page: "1" });
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{config.placeholder}</Label>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-[200px] justify-between font-normal"
            />
          }
        >
          {selected.length === 0
            ? config.placeholder
            : selected.length === 1
              ? selected[0]
              : `${selected.length} seleccionados`}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <div className="space-y-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggle(opt)}
                  className="pointer-events-none"
                />
                <span className="flex-1 text-left">{opt}</span>
                {selected.includes(opt) && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── date-range ─────────────────────────────────────────────────────────────
// Inputs nativos para simplicidad; se puede reemplazar por shadcn Calendar
// + DateRangePicker en sprint 2 si la UX lo amerita.

function DateRangeFilter({ config }: { config: FilterConfig }) {
  const { getParam, setMultipleParams } = useUrlParams();
  const fromKey = `${config.columnId}_from`;
  const toKey = `${config.columnId}_to`;
  const fromValue = getParam(fromKey) ?? "";
  const toValue = getParam(toKey) ?? "";

  function update(key: string, value: string) {
    setMultipleParams({
      [key]: value ? new Date(value).toISOString() : null,
      page: "1",
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{config.placeholder}</Label>
      <div className="flex gap-1">
        <Input
          type="date"
          value={fromValue ? fromValue.slice(0, 10) : ""}
          onChange={(e) => update(fromKey, e.target.value)}
          className="h-9 w-[140px]"
        />
        <Input
          type="date"
          value={toValue ? toValue.slice(0, 10) : ""}
          onChange={(e) => update(toKey, e.target.value)}
          className="h-9 w-[140px]"
        />
      </div>
    </div>
  );
}
