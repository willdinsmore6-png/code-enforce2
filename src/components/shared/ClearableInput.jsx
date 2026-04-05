import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  buildAddressSuggestionRows,
  buildParcelSuggestionRows,
  filterAddressRows,
  filterParcelRows,
} from '@/lib/propertyAddress';

export default function ClearableInput({ value, onChange, className, ...props }) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={onChange}
        className={cn("pr-8", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: '' } })}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label="Clear field"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Suggestions from existing cases — exported from this module so hosts that omit brand-new files still sync the feature. */
export function CasePropertySuggestList({
  cases,
  mode,
  query,
  open: panelOpen,
  onPickAddress,
  onPickParcel,
  className,
  maxItems = 12,
}) {
  const rows = useMemo(() => {
    if (mode === 'address') return buildAddressSuggestionRows(cases);
    return buildParcelSuggestionRows(cases);
  }, [cases, mode]);

  const filtered = useMemo(() => {
    if (mode === 'address') return filterAddressRows(rows, query, maxItems);
    return filterParcelRows(rows, query, maxItems);
  }, [mode, rows, query, maxItems]);

  if (!panelOpen || filtered.length === 0) return null;

  return (
    <ul
      className={cn(
        'absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md',
        className
      )}
      role="listbox"
      aria-label={mode === 'address' ? 'Address suggestions from cases' : 'Parcel ID suggestions from cases'}
    >
      {filtered.map((row) => (
        <li key={row.normKey}>
          <button
            type="button"
            role="option"
            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
            onMouseDown={(e) => {
              e.preventDefault();
              if (mode === 'address') onPickAddress(row.label, row.parcel_id || '');
              else onPickParcel(row.label);
            }}
          >
            {mode === 'address' ? (
              <>
                <span className="font-medium leading-tight">{row.label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {row.open && <span className="text-primary">Open case</span>}
                  {row.parcel_id && <span className="font-mono">{row.parcel_id}</span>}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-sm font-medium leading-tight">{row.label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {row.open && <span className="text-primary">Open case</span>}
                  {row.addressHint && <span className="line-clamp-1">{row.addressHint}</span>}
                </span>
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}