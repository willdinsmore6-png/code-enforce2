import { Label } from '@/components/ui/label';

export default function FormFieldGroup({ 
  label, 
  required = false, 
  error = null, 
  errorId = null,
  hint = null,
  hintId = null,
  children 
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className={required ? "after:content-['*'] after:ml-1 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <div aria-describedby={`${errorId || ''} ${hintId || ''}`.trim()}>
        {children}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}