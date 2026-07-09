/**
 * Placeholder ilustrativo genérico para materiais de PDV.
 * Sem cor e sem marca — apenas indica que haverá imagem no espaço.
 */
type Props = { tipo?: string | null; className?: string };

export function MaterialPlaceholder({ tipo, className }: Props) {
  const t = (tipo ?? "").toLowerCase();

  const Icon = pickIcon(t);

  return (
    <div className={"flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 " + (className ?? "")}>
      <svg
        viewBox="0 0 200 200"
        className="h-2/3 w-2/3 text-neutral-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <Icon />
      </svg>
    </div>
  );
}

function pickIcon(t: string) {
  if (t.includes("wobbler")) return Wobbler;
  if (t.includes("totem")) return Totem;
  if (t.includes("cubo")) return Cubo;
  if (t.includes("banner") || t.includes("faixa")) return Banner;
  if (t.includes("testeira")) return Testeira;
  if (t.includes("adesivo")) return Adesivo;
  if (t.includes("mockup")) return Mockup;
  if (t.includes("display") || t.includes("plaquin")) return Display;
  return Display;
}

const Display = () => (
  <>
    <rect x="40" y="30" width="120" height="110" rx="6" />
    <path d="M60 60h80M60 80h80M60 100h50" />
    <path d="M70 140l-10 30M130 140l10 30M60 170h80" />
  </>
);

const Wobbler = () => (
  <>
    <circle cx="100" cy="60" r="35" />
    <path d="M100 95v70" strokeDasharray="4 4" />
    <path d="M85 170h30" />
  </>
);

const Totem = () => (
  <>
    <rect x="70" y="20" width="60" height="150" rx="4" />
    <path d="M85 40h30M85 60h30M85 80h20" />
    <path d="M60 180h80" />
  </>
);

const Cubo = () => (
  <>
    <path d="M100 30l60 30v60l-60 30-60-30V60z" />
    <path d="M100 30v60M100 90l60-30M100 90l-60-30" />
  </>
);

const Banner = () => (
  <>
    <rect x="20" y="60" width="160" height="80" rx="4" />
    <path d="M40 90h120M40 110h90" />
  </>
);

const Testeira = () => (
  <>
    <rect x="20" y="70" width="160" height="40" rx="4" />
    <path d="M50 90h100" />
    <rect x="20" y="120" width="160" height="4" />
  </>
);

const Adesivo = () => (
  <>
    <path d="M50 40h80l30 30v90H50z" />
    <path d="M130 40v30h30" />
    <circle cx="100" cy="115" r="18" />
  </>
);

const Mockup = () => (
  <>
    <rect x="30" y="40" width="140" height="90" rx="4" />
    <path d="M30 130l50-40 30 20 30-30 30 20v20z" />
    <circle cx="140" cy="65" r="8" />
  </>
);
