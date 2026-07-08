import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-neutral-200 bg-background px-4 py-2 text-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-neutral-400",
          "hover:border-neutral-300",
          "focus-visible:outline-none focus-visible:border-neutral-900 focus-visible:ring-4 focus-visible:ring-neutral-900/5",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
