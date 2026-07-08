import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Primary action — JBL orange. Use sparingly. */
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
        /** Solid black — secondary emphasis */
        dark:
          "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 active:scale-[0.98]",
        /** Outline — neutral action */
        outline:
          "border border-neutral-300 bg-transparent text-foreground hover:bg-neutral-100",
        /** Subtle gray fill */
        secondary:
          "bg-neutral-100 text-foreground hover:bg-neutral-200",
        /** Minimal — for tertiary actions */
        ghost: "text-foreground hover:bg-neutral-100",
        /** Destructive */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Inline link */
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-6",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
