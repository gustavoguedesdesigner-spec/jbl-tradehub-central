import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tag — for filter chips, product line labels, category markers.
 * Different from Badge (status): Tag is interactive/removable.
 */
const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100",
        solid: "border-transparent bg-neutral-900 text-neutral-50",
        outline: "border-neutral-300 bg-transparent text-foreground hover:bg-neutral-50",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, onRemove, children, ...props }, ref) => (
    <span ref={ref} className={cn(tagVariants({ variant }), className)} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-neutral-900/10"
          aria-label="Remover"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  ),
);
Tag.displayName = "Tag";

export { Tag, tagVariants };
