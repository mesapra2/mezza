import React, { useId } from 'react';
import { cn } from "@/utils"

const Input = React.forwardRef(({ className, type, required, error, ...props }, ref) => {
  const inputId = props.id || useId();
  
  return (
    (<input
      id={inputId}
      type={type}
      required={required}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${inputId}-error` : undefined}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-red-500 ring-red-500 focus-visible:ring-red-500",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }