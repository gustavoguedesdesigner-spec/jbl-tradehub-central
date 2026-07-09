// Mock data for Territory Intelligence module

export interface Loja {
  id: string;
  nome: string;
  rede: string;
  cidade: string;
  estado: string;
  regiao: string;
  lat: number;
  lng: number;
  responsavel: string;
  produtos: string[];
  materiais: string[];
  investimento: number;
  sellOut: number;
  roi: number;
  cobertura: number;
  score: number;
  status: "verde" | "amarelo" | "vermelho";
  fotoUrl?: string;
  ultimoLancamento?: string;
  checklistPdv: { item: string; ok: boolean }[];
  historico: { data: string; evento: string }[];
}

export interface EstadoDados {
  uf: string;
  nome: string;
  regiao: string;
  investimento: number;
  sellOut: number;
  roi: number;
  lojas: number;
  materiais: number;
  produtos: number;
  score: number;
}

export const REDES = [
  "Fast Shop",
  "Magazine Luiza",
  "Casas Bahia",
  "Carrefour",
  "Kalunga",
  "Login",
  "Dufry",
  "Amazon",
  "Mercado Livre",
  "Ponto Frio",
];

export const PRODUTOS = [
  "Flip 7",
  "Xtreme 5",
  "PartyBox 130",
  "PartyBox 330",
  "Live 780NC",
  "Tour Pro 2",
  "Quantum",
];

export const MATERIAIS = [
  "Display Iluminado",
  "Wobbler",
  "Totem",
  "Cubo Demo",
  "Banner",
  "Testeira",
  "Faixa de Gôndola",
  "Adesivo",
  "Mockup",
];

const STATE_COORDS: Record<string, { lat: number; lng: number; nome: string; regiao: string }> = {
  SP: { lat: -23.55, lng: -46.63, nome: "São Paulo", regiao: "Sudeste" },
  RJ: { lat: -22.9, lng: -43.2, nome: "Rio de Janeiro", regiao: "Sudeste" },
  MG: { lat: -19.92, lng: -43.94, nome: "Minas Gerais", regiao: "Sudeste" },
  RS: { lat: -30.03, lng: -51.22, nome: "Rio Grande do Sul", regiao: "Sul" },
  PR: { lat: -25.43, lng: -49.27, nome: "Paraná", regiao: "Sul" },
  SC: { lat: -27.6, lng: -48.55, nome: "Santa Catarina", regiao: "Sul" },
  BA: { lat: -12.97, lng: -38.5, nome: "Bahia", regiao: "Nordeste" },
  PE: { lat: -8.05, lng: -34.9, nome: "Pernambuco", regiao: "Nordeste" },
  CE: { lat: -3.72, lng: -38.54, nome: "Ceará", regiao: "Nordeste" },
  DF: { lat: -15.8, lng: -47.88, nome: "Distrito Federal", regiao: "Centro-Oeste" },
  GO: { lat: -16.68, lng: -49.25, nome: "Goiás", regiao: "Centro-Oeste" },
  AM: { lat: -3.1, lng: -60.02, nome: "Amazonas", regiao: "Norte" },
};

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

function statusFromRoi(roi: number, invest: number, sellOut: number): "verde" | "amarelo" | "vermelho" {
  const ratio = sellOut / Math.max(invest, 1);
  if (roi >= 3.5 && ratio >= 5) return "verde";
  if (roi >= 2 && ratio >= 2.5) return "amarelo";
  return "vermelho";
}

export function buildLojas(): Loja[] {
  const rand = seededRand(42);
  const lojas: Loja[] = [];
  let id = 1;
  for (const uf of Object.keys(STATE_COORDS)) {
    const meta = STATE_COORDS[uf];
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const rede = REDES[Math.floor(rand() * REDES.length)];
      const investimento = Math.round(15000 + rand() * 180000);
      const sellOut = Math.round(investimento * (1 + rand() * 6));
      const roi = +(sellOut / investimento).toFixed(2);
      const cobertura = Math.round(40 + rand() * 60);
      const produtos = pick(PRODUTOS, 2 + Math.floor(rand() * 4), rand);
      const materiais = pick(MATERIAIS, 1 + Math.floor(rand() * 4), rand);
      const status = statusFromRoi(roi, investimento, sellOut);
      const score = Math.min(
        100,
        Math.round(
          cobertura * 0.25 +
            materiais.length * 6 +
            produtos.length * 5 +
            Math.min(roi, 8) * 5 +
            (status === "verde" ? 15 : status === "amarelo" ? 8 : 0)
        )
      );
      lojas.push({
        id: `L${String(id++).padStart(4, "0")}`,
        nome: `${rede} ${meta.nome} ${i + 1}`,
        rede,
        cidade: meta.nome,
        estado: uf,
        regiao: meta.regiao,
        lat: meta.lat + (rand() - 0.5) * 0.6,
        lng: meta.lng + (rand() - 0.5) * 0.6,
        responsavel: ["Ana Souza", "Carlos Lima", "Marina Alves", "Diego Rocha", "Priscila Nunes"][
          Math.floor(rand() * 5)
        ],
        produtos,
        materiais,
        investimento,
        sellOut,
        roi,
        cobertura,
        score,
        status,
        ultimoLancamento: ["Flip 7", "Tour Pro 2", "PartyBox 330"][Math.floor(rand() * 3)],
        checklistPdv: [
          { item: "Display principal instalado", ok: rand() > 0.2 },
          { item: "Preço visível", ok: rand() > 0.15 },
          { item: "Demo funcional", ok: rand() > 0.35 },
          { item: "Material de campanha vigente", ok: rand() > 0.3 },
          { item: "Estoque exposto", ok: rand() > 0.25 },
        ],
        historico: [
          { data: "2026-06-10", evento: "Instalação de novo totem PartyBox" },
          { data: "2026-05-22", evento: "Treinamento de vendedores Flip 7" },
          { data: "2026-04-15", evento: "Auditoria de PDV realizada" },
        ],
      });
    }
  }
  return lojas;
}

export function aggregarEstados(lojas: Loja[]): EstadoDados[] {
  const map = new Map<string, EstadoDados>();
  for (const l of lojas) {
    const meta = STATE_COORDS[l.estado];
    const cur = map.get(l.estado) ?? {
      uf: l.estado,
      nome: meta.nome,
      regiao: meta.regiao,
      investimento: 0,
      sellOut: 0,
      roi: 0,
      lojas: 0,
      materiais: 0,
      produtos: 0,
      score: 0,
    };
    cur.investimento += l.investimento;
    cur.sellOut += l.sellOut;
    cur.lojas += 1;
    cur.materiais += l.materiais.length;
    cur.produtos += l.produtos.length;
    cur.score += l.score;
    map.set(l.estado, cur);
  }
  return Array.from(map.values()).map((e) => ({
    ...e,
    roi: +(e.sellOut / Math.max(e.investimento, 1)).toFixed(2),
    score: Math.round(e.score / e.lojas),
  }));
}

export function scoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 55) return "#eab308";
  return "#dc2626";
}

export function mixColor(invest: number, sellOut: number, bias: number): string {
  // bias: 0 = puro investimento, 1 = puro vendas, 0.5 = equilíbrio
  const ratio = sellOut / Math.max(invest, 1);
  const investIdx = Math.min(1, invest / 800000);
  const sellIdx = Math.min(1, sellOut / 3500000);
  const balance = Math.min(1, ratio / 6);
  const metric = investIdx * (1 - bias) + sellIdx * bias;
  const health = bias === 0.5 ? balance : metric;
  if (health >= 0.7) return "#16a34a";
  if (health >= 0.4) return "#eab308";
  return "#dc2626";
}

export const BRASIL_TOPOJSON =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";

export const UF_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_COORDS).map(([uf, m]) => [uf, m.nome])
);

export const NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_COORDS).map(([uf, m]) => [m.nome, uf])
);
