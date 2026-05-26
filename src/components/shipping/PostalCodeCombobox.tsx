"use client";
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AR_POSTAL_CODES,
  type PostalCodeEntry,
} from "@/lib/geo/ar-postal-codes";

interface PostalCodeComboboxProps {
  value: string;
  onSelect: (entry: PostalCodeEntry) => void;
  placeholder?: string;
  className?: string;
}

const ALL_ENTRIES: PostalCodeEntry[] = Object.values(AR_POSTAL_CODES).sort(
  (a, b) =>
    a.province.localeCompare(b.province) || a.city.localeCompare(b.city),
);

/**
 * Combobox para seleccionar un CP argentino del dataset.
 *
 * - Búsqueda fuzzy por CP, ciudad o provincia.
 * - Al seleccionar dispara `onSelect(entry)` con la entrada completa
 *   (cp, city, province, lat, lng).
 * - El valor visible en el trigger es el CP o el placeholder.
 * - Resultados agrupados visualmente por provincia.
 */
export function PostalCodeCombobox({
  value,
  onSelect,
  placeholder = "Buscar CP",
  className,
}: PostalCodeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return ALL_ENTRIES;
    const needle = q.toLowerCase().trim();
    return ALL_ENTRIES.filter(
      (e) =>
        e.cp.toLowerCase().includes(needle) ||
        e.city.toLowerCase().includes(needle) ||
        e.province.toLowerCase().includes(needle),
    );
  }, [q]);

  const selected = ALL_ENTRIES.find((e) => e.cp === value);

  function handleSelect(entry: PostalCodeEntry) {
    onSelect(entry);
    setOpen(false);
    setQ("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 w-full justify-between px-3 font-normal",
              !value && "text-muted-foreground",
              className,
            )}
            type="button"
          />
        }
      >
        {selected ? (
          <span className="flex flex-1 items-center gap-2 truncate">
            <span className="font-mono text-xs">{selected.cp}</span>
            <span className="truncate text-xs text-muted-foreground">
              · {selected.city}
            </span>
          </span>
        ) : value ? (
          <span className="font-mono text-xs">{value}</span>
        ) : (
          <span className="text-sm">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        className="w-[--anchor-width] min-w-[280px] p-0"
        align="start"
      >
        <div className="relative border-b border-border p-2">
          <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por CP, ciudad o provincia…"
            className="h-8 border-0 bg-transparent pl-7 shadow-none focus-visible:ring-0 focus-visible:border-0"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Sin coincidencias para “{q}”
            </p>
          ) : (
            <Grouped entries={filtered} value={value} onSelect={handleSelect} />
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
          {filtered.length} CP{filtered.length === 1 ? "" : "s"} · cobertura AR
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Grouped({
  entries,
  value,
  onSelect,
}: {
  entries: PostalCodeEntry[];
  value: string;
  onSelect: (entry: PostalCodeEntry) => void;
}) {
  // Agrupamos por provincia. Como ALL_ENTRIES ya viene ordenado por
  // provincia y después por city, basta con detectar cambios.
  const groups: Array<{ province: string; items: PostalCodeEntry[] }> = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.province === e.province) {
      last.items.push(e);
    } else {
      groups.push({ province: e.province, items: [e] });
    }
  }

  return (
    <ul className="space-y-1">
      {groups.map((g) => (
        <li key={g.province}>
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.province}
          </p>
          <ul>
            {g.items.map((e) => {
              const isSelected = e.cp === value;
              return (
                <li key={e.cp}>
                  <button
                    type="button"
                    onClick={() => onSelect(e)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <MapPin className="size-3 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs font-medium">
                      {e.cp}
                    </span>
                    <span className="flex-1 truncate text-xs text-foreground/80">
                      {e.city}
                    </span>
                    {isSelected && (
                      <Check className="size-3 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

PostalCodeCombobox.Skeleton = function PostalCodeComboboxSkeleton() {
  return <Skeleton className="h-9 w-full" />;
};
