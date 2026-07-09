import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Store,
  Package,
  Rocket,
  Sparkles,
  AlertTriangle,
  Target,
  Download,
  X,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  buildLojas,
  aggregarEstados,
  scoreColor,
  mixColor,
  BRASIL_TOPOJSON,
  NAME_TO_UF,
  REDES,
  PRODUTOS,
  type Loja,
} from "@/lib/territory-data";

export const Route = createFileRoute("/territory")({
  head: () => ({
    meta: [
      { title: "Territory Intelligence · JBL Trade Hub" },
      {
        name: "description",
        content:
          "Centro nacional de inteligência de Trade Marketing. Vendas × Investimento em tempo real.",
      },
    ],
  }),
  component: TerritoryPage,
});

function formatBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function TerritoryPage() {
  const allLojas = useMemo(() => buildLojas(), []);
  const [filtroRede, setFiltroRede] = useState<string>("todas");
  const [filtroProduto, setFiltroProduto] = useState<string>("todos");
  const [filtroRegiao, setFiltroRegiao] = useState<string>("todas");
  const [bias, setBias] = useState<number>(50);
  const [selecionada, setSelecionada] = useState<Loja | null>(null);

  const lojas = useMemo(
    () =>
      allLojas.filter(
        (l) =>
          (filtroRede === "todas" || l.rede === filtroRede) &&
          (filtroProduto === "todos" || l.produtos.includes(filtroProduto)) &&
          (filtroRegiao === "todas" || l.regiao === filtroRegiao)
      ),
    [allLojas, filtroRede, filtroProduto, filtroRegiao]
  );

  const estados = useMemo(() => aggregarEstados(lojas), [lojas]);
  const estadosByUF = useMemo(
    () => Object.fromEntries(estados.map((e) => [e.uf, e])),
    [estados]
  );

  const totais = useMemo(() => {
    const invest = lojas.reduce((s, l) => s + l.investimento, 0);
    const sellOut = lojas.reduce((s, l) => s + l.sellOut, 0);
    const scoreMedio = Math.round(
      estados.reduce((s, e) => s + e.score, 0) / Math.max(estados.length, 1)
    );
    return {
      cobertura: lojas.length,
      invest,
      sellOut,
      roi: +(sellOut / Math.max(invest, 1)).toFixed(2),
      materiais: lojas.reduce((s, l) => s + l.materiais.length, 0),
      produtosAtivos: new Set(lojas.flatMap((l) => l.produtos)).size,
      lancamentos: new Set(lojas.map((l) => l.ultimoLancamento)).size,
      scoreMedio,
      oportunidades: estados.filter((e) => e.roi < 3 || e.score < 60).length,
    };
  }, [lojas, estados]);

  const biasRatio = bias / 100;

  const insights = useMemo(() => {
    const items: {
      icon: typeof Sparkles;
      texto: string;
      prioridade: "alta" | "media" | "baixa";
    }[] = [];
    const porRegiao = new Map<string, { invest: number; sellOut: number }>();
    for (const l of lojas) {
      const cur = porRegiao.get(l.regiao) ?? { invest: 0, sellOut: 0 };
      cur.invest += l.investimento;
      cur.sellOut += l.sellOut;
      porRegiao.set(l.regiao, cur);
    }
    for (const [reg, v] of porRegiao) {
      const r = v.sellOut / Math.max(v.invest, 1);
      if (r >= 5)
        items.push({
          icon: TrendingUp,
          texto: `${reg} apresenta alto Sell Out (${formatBRL(v.sellOut)}) com investimento comparativamente baixo.`,
          prioridade: "alta",
        });
      if (r < 2)
        items.push({
          icon: TrendingDown,
          texto: `${reg} concentra investimento (${formatBRL(v.invest)}) com retorno abaixo do esperado.`,
          prioridade: "alta",
        });
    }
    items.push({
      icon: Sparkles,
      texto: "Quantum apresenta baixa cobertura na Região Sul — oportunidade de ativação premium.",
      prioridade: "media",
    });
    items.push({
      icon: Sparkles,
      texto: "Flip 7 possui excelente ROI no Paraná — replicar playbook para SC e RS.",
      prioridade: "media",
    });
    items.push({
      icon: AlertTriangle,
      texto: "PartyBox 330 tem alta venda em MG sem materiais premium instalados.",
      prioridade: "alta",
    });
    return items.slice(0, 6);
  }, [lojas]);

  const oportunidades = useMemo(
    () =>
      estados
        .filter((e) => e.roi < 3.5 || e.score < 65)
        .slice(0, 5)
        .map((e) => ({
          problema: `${e.nome}: ROI ${e.roi.toFixed(1)} · Score ${e.score}`,
          impacto:
            e.roi < 2
              ? `Perda estimada de ${formatBRL(e.investimento * 0.3)}`
              : `Potencial de +${formatBRL(e.sellOut * 0.2)} em sell out`,
          recomendacao:
            e.score < 60
              ? "Reforçar cobertura de PDV com materiais premium"
              : "Realocar verba para redes com maior conversão",
          prioridade: e.roi < 2 ? ("alta" as const) : ("media" as const),
        })),
    [estados]
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-[1600px] px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#FF6B00]" />
                <span className="text-xs font-medium uppercase tracking-wider text-[#FF6B00]">
                  Territory Intelligence
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                Onde a JBL está vendendo × onde está investindo
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-500">
                Painel executivo em tempo real: cobertura nacional, ROI, Territory Score e
                oportunidades comerciais em território brasileiro.
              </p>
            </div>
            <Button variant="outline" size="lg" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar relatório
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-8 px-8 py-8">
        {/* Filtros */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Filter className="h-4 w-4 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-500">FILTROS</span>
            <Select value={filtroRegiao} onValueChange={setFiltroRegiao}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as regiões</SelectItem>
                {["Sudeste", "Sul", "Nordeste", "Norte", "Centro-Oeste"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroRede} onValueChange={setFiltroRede}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as redes</SelectItem>
                {REDES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroProduto} onValueChange={setFiltroProduto}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os produtos</SelectItem>
                {PRODUTOS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px]">
                DEMO · dados fictícios
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <Kpi icon={Store} label="Lojas positivadas" value={String(totais.cobertura)} delta="+12%" />
          <Kpi icon={DollarSign} label="Investimento Trade" value={formatBRL(totais.invest)} delta="+8%" />
          <Kpi icon={TrendingUp} label="Sell Out" value={formatBRL(totais.sellOut)} delta="+21%" tone="up" />
          <Kpi icon={Target} label="ROI médio" value={`${totais.roi}x`} delta="+0.4" tone="up" />
          <Kpi
            icon={Sparkles}
            label="Territory Score"
            value={String(totais.scoreMedio)}
            delta={totais.scoreMedio >= 70 ? "+5" : "-3"}
            tone={totais.scoreMedio >= 70 ? "up" : "down"}
          />
          <Kpi icon={Package} label="Materiais instalados" value={String(totais.materiais)} delta="+34" />
          <Kpi icon={Package} label="Produtos ativos" value={String(totais.produtosAtivos)} delta="0" />
          <Kpi icon={Rocket} label="Lançamentos ativos" value={String(totais.lancamentos)} delta="+2" />
          <Kpi
            icon={AlertTriangle}
            label="Oportunidades"
            value={String(totais.oportunidades)}
            delta="atenção"
            tone="down"
          />
          <Kpi
            icon={Target}
            label="Cobertura nacional"
            value={`${Math.round((totais.cobertura / 45) * 100)}%`}
            delta="+4%"
            tone="up"
          />
        </div>

        {/* Mapa */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Mapa nacional</CardTitle>
              <p className="mt-1 text-xs text-neutral-500">
                Estados coloridos pelo Territory Score · marcadores por loja
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <LegendDot color="#16a34a" label="Saudável" />
              <LegendDot color="#eab308" label="Atenção" />
              <LegendDot color="#dc2626" label="Alerta" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Slider Investimento x Vendas */}
            <div className="rounded-xl bg-neutral-50 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-medium text-neutral-600">
                <span>100% Investimento</span>
                <span className="text-neutral-900">
                  {bias === 50 ? "Equilíbrio" : bias < 50 ? `${100 - bias}% Investimento` : `${bias}% Vendas`}
                </span>
                <span>100% Vendas</span>
              </div>
              <Slider
                value={[bias]}
                onValueChange={(v) => setBias(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="rounded-xl border bg-white">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 700, center: [-54, -15] }}
                width={900}
                height={620}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography={BRASIL_TOPOJSON}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const nome = geo.properties.name as string;
                      const uf = NAME_TO_UF[nome];
                      const est = uf ? estadosByUF[uf] : undefined;
                      const fill = est
                        ? mixColor(est.investimento, est.sellOut, biasRatio)
                        : "#e5e7eb";
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth={0.8}
                          style={{
                            default: { outline: "none", opacity: 0.85 },
                            hover: { outline: "none", opacity: 1, cursor: "pointer" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {lojas.map((l) => (
                  <Marker key={l.id} coordinates={[l.lng, l.lat]} onClick={() => setSelecionada(l)}>
                    <circle
                      r={5}
                      fill={
                        l.status === "verde"
                          ? "#16a34a"
                          : l.status === "amarelo"
                            ? "#eab308"
                            : "#dc2626"
                      }
                      stroke="#fff"
                      strokeWidth={1.5}
                      style={{ cursor: "pointer" }}
                    >
                      <title>{`${l.nome}\nROI: ${l.roi}x · Score: ${l.score}\nInvest: ${formatBRL(l.investimento)} · Sell out: ${formatBRL(l.sellOut)}`}</title>
                    </circle>
                  </Marker>
                ))}
              </ComposableMap>
            </div>
          </CardContent>
        </Card>

        {/* Insights + Oportunidades */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-[#FF6B00]" />
                Insights IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border bg-white p-3 transition hover:border-neutral-300"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        ins.prioridade === "alta"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-800">{ins.texto}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider"
                        >
                          {ins.prioridade}
                        </Badge>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                          Ver detalhes →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-[#FF6B00]" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {oportunidades.map((o, i) => (
                <div key={i} className="rounded-lg border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{o.problema}</p>
                      <p className="mt-1 text-xs text-neutral-500">Impacto: {o.impacto}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        <span className="font-medium">Recomendação:</span> {o.recomendacao}
                      </p>
                    </div>
                    <Badge
                      className={
                        o.prioridade === "alta"
                          ? "bg-red-50 text-red-700 hover:bg-red-50"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-50"
                      }
                    >
                      {o.prioridade}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 h-7 text-xs">
                    Criar Plano de Ação
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Comparativo Regional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativo por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estados
              .sort((a, b) => b.sellOut - a.sellOut)
              .map((e) => {
                const maxSell = Math.max(...estados.map((x) => x.sellOut));
                const pctInvest = (e.investimento / Math.max(...estados.map((x) => x.investimento))) * 100;
                const pctSell = (e.sellOut / maxSell) * 100;
                return (
                  <div key={e.uf} className="rounded-lg border bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">
                          {e.uf}
                        </span>
                        <span className="text-sm font-medium">{e.nome}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {e.regiao}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-neutral-500">
                          ROI <span className="font-semibold text-neutral-900">{e.roi}x</span>
                        </span>
                        <span
                          className="rounded px-2 py-0.5 font-semibold text-white"
                          style={{ backgroundColor: scoreColor(e.score) }}
                        >
                          Score {e.score}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <BarRow label="Investimento" value={formatBRL(e.investimento)} pct={pctInvest} color="#0ea5e9" />
                      <BarRow label="Sell Out" value={formatBRL(e.sellOut)} pct={pctSell} color="#FF6B00" />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Painel da loja */}
      <Sheet open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <SheetContent className="w-[520px] overflow-y-auto sm:max-w-[520px]">
          {selecionada && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-lg">{selecionada.nome}</SheetTitle>
                    <p className="mt-1 text-sm text-neutral-500">
                      {selecionada.cidade} · {selecionada.estado} · {selecionada.regiao}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelecionada(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="mt-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400">
                <Store className="h-12 w-12" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat label="ROI" value={`${selecionada.roi}x`} />
                <MiniStat label="Score" value={String(selecionada.score)} />
                <MiniStat label="Cobertura" value={`${selecionada.cobertura}%`} />
                <MiniStat label="Investimento" value={formatBRL(selecionada.investimento)} />
                <MiniStat label="Sell Out" value={formatBRL(selecionada.sellOut)} />
                <MiniStat label="Responsável" value={selecionada.responsavel} />
              </div>

              <Section title="Territory Score">
                <div className="flex items-center gap-3">
                  <Progress value={selecionada.score} className="h-2" />
                  <span className="text-sm font-semibold">{selecionada.score}/100</span>
                </div>
              </Section>

              <Section title="Rede & último lançamento">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selecionada.rede}</Badge>
                  {selecionada.ultimoLancamento && (
                    <Badge className="bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                      Último: {selecionada.ultimoLancamento}
                    </Badge>
                  )}
                </div>
              </Section>

              <Section title="Produtos ativos">
                <div className="flex flex-wrap gap-1.5">
                  {selecionada.produtos.map((p) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Materiais instalados">
                <div className="flex flex-wrap gap-1.5">
                  {selecionada.materiais.map((m) => (
                    <Badge key={m} variant="outline">
                      {m}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Checklist de PDV">
                <div className="space-y-1.5">
                  {selecionada.checklistPdv.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {c.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={c.ok ? "text-neutral-700" : "text-neutral-400"}>
                        {c.item}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Histórico">
                <div className="space-y-2">
                  {selecionada.historico.map((h, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="w-24 shrink-0 text-xs text-neutral-500">{h.data}</span>
                      <span className="text-neutral-700">{h.evento}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone = "neutral",
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  delta: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Icon className="h-4 w-4 text-neutral-400" />
          <span
            className={`text-[10px] font-medium ${
              tone === "up" ? "text-green-600" : tone === "down" ? "text-red-600" : "text-neutral-400"
            }`}
          >
            {delta}
          </span>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-neutral-900">{value}</div>
        <div className="mt-1 text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-neutral-600">{label}</span>
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px] text-neutral-500">
        <span>{label}</span>
        <span className="font-medium text-neutral-700">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h4>
      {children}
    </div>
  );
}
