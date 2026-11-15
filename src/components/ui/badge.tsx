import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-foreground/15 text-muted-foreground",
        accent: "border-accent/30 bg-accent-soft text-accent",
        verified: "border-verified/30 text-verified",
        warning: "border-warning/30 text-warning",
        solid: "border-transparent bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
