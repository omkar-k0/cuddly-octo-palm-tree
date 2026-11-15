import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex w-full resize-none bg-transparent text-base placeholder:text-muted-foreground/80 focus-visible:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
