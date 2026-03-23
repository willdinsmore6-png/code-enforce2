import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}