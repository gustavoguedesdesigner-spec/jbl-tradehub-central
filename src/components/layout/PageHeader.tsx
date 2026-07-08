import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 bg-background">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between md:py-14">
        <div className="max-w-3xl">
          {eyebrow && <p className="text-eyebrow mb-3">{eyebrow}</p>}
          <h1 className="text-h1 text-foreground md:text-[2.25rem]">{title}</h1>
          {description && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
