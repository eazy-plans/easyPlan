import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";

export interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /**
   * When true (default) the body scrolls internally so the page header stays
   * fixed. When false, a child owns the scroll (data tables) and the body is a
   * height-constrained flex column instead.
   */
  scroll?: boolean;
  bodyClassName?: string;
}

/**
 * Standard full-height screen frame: a fixed header band (title / description /
 * actions) over a body that fills the remaining viewport height. Keeps the app
 * chrome from ever scrolling — only the data region moves.
 */
export function PageShell({
  title,
  description,
  actions,
  children,
  scroll = true,
  bodyClassName,
}: PageShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/70 px-4 sm:px-6 pt-5 pb-4">
        <PageHeader title={title} description={description} actions={actions} />
      </header>
      <div
        className={cn(
          "min-h-0 px-4 sm:px-6 py-5",
          scroll ? "flex-1 overflow-y-auto scroll-area" : "flex-1 flex flex-col overflow-hidden",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
