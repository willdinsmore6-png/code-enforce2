import { useId } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small help trigger (tap / click) with scrollable popover — works on mobile better than hover-only tooltips.
 */
export default function HelpTip({
  title = 'Help',
  children,
  className,
  contentClassName,
  align = 'start',
  side = 'bottom',
}) {
  const titleId = useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground',
            className
          )}
          aria-label={`Help: ${title}`}
        >
          <CircleHelp className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        aria-labelledby={titleId}
        className={cn(
          'w-[min(22rem,calc(100vw-2rem))] max-h-[min(70dvh,26rem)] overflow-y-auto overscroll-contain border-border p-4 text-sm shadow-md',
          contentClassName
        )}
      >
        <p id={titleId} className="font-semibold leading-tight text-foreground">
          {title}
        </p>
        <div className="mt-2 space-y-2 leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
