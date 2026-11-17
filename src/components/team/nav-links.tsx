"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Path prefix that marks this item as current. */
  match: string;
  exact?: boolean;
  /** Prefixes that belong to another item. */
  except?: string[];
}

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function isCurrent(path: string, item: NavItem): boolean {
  if (item.except?.some((p) => under(path, p))) return false;
  return item.exact ? path === item.match : under(path, item.match);
}

/** Highlights the current section. Uses the pathname: render inside <Suspense>. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="-mx-1 flex flex-wrap items-center gap-1 text-sm">
      {items.map((item) => {
        const current = isCurrent(path, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              current ? "bg-accent-soft text-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
