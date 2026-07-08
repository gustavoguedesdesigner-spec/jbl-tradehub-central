import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  actions?: ReactNode;
}

export function PageHero({ eyebrow, title, description, image, actions }: PageHeroProps) {
  return (
    <section className="relative border-b border-neutral-200 bg-neutral-50">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.05fr_1fr] md:items-center md:py-16">
        <div className="max-w-xl">
          {eyebrow && <p className="text-eyebrow mb-4">{eyebrow}</p>}
          <h1 className="text-h1 text-foreground md:text-[2.5rem] md:leading-[1.05]">{title}</h1>
          {description && (
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-100 shadow-sm ring-1 ring-neutral-200">
          <img
            src={image}
            alt=""
            width={1600}
            height={900}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
