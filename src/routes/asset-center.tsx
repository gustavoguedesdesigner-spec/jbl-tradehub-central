import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  FileArchive,
  FileImage,
  FileText,
  FileVideo,
  Grid3x3,
  LayoutList,
  Loader2,
  Maximize2,
  Package,
  Palette,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSET_TIPOS,
  criarAsset,
  excluirAsset,
  listarAssets,
  registrarDownload,
  type AssetTipo,
} from "@/lib/assets.functions";
import heroImg from "@/assets/hero-asset-center.jpg";

export const Route = createFileRoute("/asset-center")({
  head: () => ({
    meta: [
      { title: "Asset Center — Biblioteca Digital — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Repositório central de arquivos digitais: imagens, vídeos, PDFs, brand books, guidelines, mockups e renders reutilizáveis por produtos, materiais e campanhas.",
      },
    ],
  }),
  component: AssetCenterPage,
});

// ---------- Types (loose — types.ts regenerates async) ----------
type Asset = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: AssetTipo;
  categoria: string | null;
  tags: string[];
  autor: string | null;
  versao: string | null;
  formato: string | null;
  peso_bytes: number | null;
  largura: number | null;
  altura: number | null;
  status: string;
  storage_path: string;
  thumbnail_path: string | null;
  downloads: number;
  created_at: string;
  url: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
};

// ---------- Helpers ----------
const TIPO_META: Record<AssetTipo, { label: string; color: string; icon: typeof FileImage }> = {
  imagem:      { label: "Imagem",      color: "bg-sky-100 text-sky-700",         icon: FileImage },
  video:       { label: "Vídeo",       color: "bg-rose-100 text-rose-700",       icon: FileVideo },
  pdf:         { label: "PDF",         color: "bg-red-100 text-red-700",         icon: FileText },
  brand_book:  { label: "Brand Book",  color: "bg-amber-100 text-amber-700",     icon: Palette },
  guideline:   { label: "Guideline",   color: "bg-violet-100 text-violet-700",   icon: Palette },
  powerpoint:  { label: "PPT",         color: "bg-orange-100 text-orange-700",   icon: FileText },
  excel:       { label: "Excel",       color: "bg-emerald-100 text-emerald-700", icon: FileText },
  word:        { label: "Word",        color: "bg-blue-100 text-blue-700",       icon: FileText },
  ai:          { label: "Illustrator", color: "bg-orange-100 text-orange-700",   icon: Palette },
  psd:         { label: "Photoshop",   color: "bg-blue-100 text-blue-700",       icon: Palette },
  indd:        { label: "InDesign",    color: "bg-pink-100 text-pink-700",       icon: Palette },
  eps:         { label: "EPS",         color: "bg-neutral-100 text-neutral-700", icon: Palette },
  stl:         { label: "3D · STL",    color: "bg-cyan-100 text-cyan-700",       icon: Package },
  obj:         { label: "3D · OBJ",    color: "bg-cyan-100 text-cyan-700",       icon: Package },
  zip:         { label: "ZIP",         color: "bg-neutral-200 text-neutral-800", icon: FileArchive },
  foto_loja:   { label: "Foto Loja",   color: "bg-teal-100 text-teal-700",       icon: FileImage },
  foto_pdv:    { label: "Foto PDV",    color: "bg-teal-100 text-teal-700",       icon: FileImage },
  mockup:      { label: "Mockup",      color: "bg-indigo-100 text-indigo-700",   icon: FileImage },
  render:      { label: "Render",      color: "bg-fuchsia-100 text-fuchsia-700", icon: FileImage },
  outro:       { label: "Outro",       color: "bg-neutral-100 text-neutral-600", icon: FileText },
};

const EXT_TO_TIPO: Record<string, AssetTipo> = {
  jpg: "imagem", jpeg: "imagem", png: "imagem", webp: "imagem", heic: "imagem", svg: "imagem", gif: "imagem",
  mp4: "video", mov: "video", webm: "video",
  pdf: "pdf",
  ppt: "powerpoint", pptx: "powerpoint",
  xls: "excel", xlsx: "excel", csv: "excel",
  doc: "word", docx: "word",
  ai: "ai", psd: "psd", indd: "indd", eps: "eps",
  stl: "stl", obj: "obj",
  zip: "zip", rar: "zip", "7z": "zip",
};

function formatBytes(n?: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function isImageTipo(t: AssetTipo) {
  return t === "imagem" || t === "foto_loja" || t === "foto_pdv" || t === "mockup" || t === "render";
}

async function getImageDims(file: File): Promise<{ w: number | null; h: number | null }> {
  if (!file.type.startsWith("image/")) return { w: null, h: null };
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ w: null, h: null });
    img.src = url;
  });
}

// ---------- Main Page ----------
function AssetCenterPage() {
  const qc = useQueryClient();
  const listarFn = useServerFn(listarAssets);
  const [tipoFiltro, setTipoFiltro] = useState<AssetTipo | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [view, setView] = useState<"cards" | "lista">("cards");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = useQuery({
    queryKey: ["assets", { tipo: tipoFiltro, busca }],
    queryFn: () =>
      listarFn({
        data: {
          tipo: tipoFiltro === "todos" ? null : tipoFiltro,
          busca: busca || null,
        },
      }),
  });

  const assets = (q.data ?? []) as unknown as Asset[];

  const stats = useMemo(() => {
    const total = assets.length;
    const pesoTotal = assets.reduce((s, a) => s + (a.peso_bytes ?? 0), 0);
    const porTipo: Record<string, number> = {};
    for (const a of assets) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
    return { total, pesoTotal, porTipo };
  }, [assets]);

  const refetch = () => qc.invalidateQueries({ queryKey: ["assets"] });

  return (
    <>
      <PageHero
        eyebrow="Asset Center"
        title="Biblioteca Digital"
        description="Repositório central e único de todos os arquivos do sistema. Imagens, vídeos, brand books, guidelines, mockups, renders — cada arquivo existe uma única vez e é reutilizado por produtos, materiais, projetos e campanhas."
        image={heroImg}
        actions={
          <>
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Enviar Assets
            </Button>
            <div className="flex items-center gap-4 rounded-lg border bg-white/60 px-4 py-2 backdrop-blur">
              <div>
                <div className="text-2xl font-semibold text-neutral-900">{stats.total}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Assets</div>
              </div>
              <div className="h-8 w-px bg-neutral-200" />
              <div>
                <div className="text-2xl font-semibold text-neutral-900">{formatBytes(stats.pesoTotal)}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div>
              </div>
            </div>
          </>
        }
      />

      <div className="container-page py-10 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome…"
              className="pl-9"
            />
          </div>

          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as AssetTipo | "todos")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {ASSET_TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`flex h-9 w-9 items-center justify-center transition ${
                view === "cards" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              aria-label="Cards"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("lista")}
              className={`flex h-9 w-9 items-center justify-center transition ${
                view === "lista" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              aria-label="Lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chips por tipo */}
        {Object.keys(stats.porTipo).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ASSET_TIPOS.filter((t) => stats.porTipo[t]).map((t) => {
              const m = TIPO_META[t];
              const active = tipoFiltro === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoFiltro(active ? "todos" : t)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                    active
                      ? "bg-neutral-900 text-white ring-neutral-900"
                      : `${m.color} ring-transparent hover:ring-neutral-300`
                  }`}
                >
                  {m.label} · {stats.porTipo[t]}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {q.isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando biblioteca…
          </div>
        ) : assets.length === 0 ? (
          <EmptyState onUpload={() => setUploadOpen(true)} />
        ) : view === "cards" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {assets.map((a) => (
              <AssetCard key={a.id} asset={a} onOpen={() => setPreview(a)} onChanged={refetch} />
            ))}
          </div>
        ) : (
          <AssetList assets={assets} onOpen={setPreview} onChanged={refetch} />
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={refetch} />
      <PreviewDialog asset={preview} onClose={() => setPreview(null)} />
    </>
  );
}

// ---------- Empty state ----------
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg">
          <FileImage className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Sua biblioteca está vazia</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Envie seus primeiros arquivos. Eles ficarão disponíveis para reutilização em produtos, materiais, projetos e campanhas.
          </p>
        </div>
        <Button onClick={onUpload} className="gap-2">
          <Upload className="h-4 w-4" /> Enviar Assets
        </Button>
      </div>
    </Card>
  );
}

// ---------- Card ----------
function AssetCard({
  asset,
  onOpen,
  onChanged,
}: {
  asset: Asset;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const excluirFn = useServerFn(excluirAsset);
  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id: asset.id } }),
    onSuccess: () => {
      toast.success("Asset removido");
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  const meta = TIPO_META[asset.tipo];
  const Icon = meta.icon;
  const showImage = isImageTipo(asset.tipo) && (asset.thumbnail_url ?? asset.url);

  return (
    <Card className="group relative overflow-hidden transition hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        className="flex aspect-square w-full items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100"
      >
        {showImage ? (
          <img
            src={(asset.thumbnail_url ?? asset.url) as string}
            alt={asset.nome}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full flex-col items-center justify-center gap-2 ${meta.color}`}>
            <Icon className="h-10 w-10 opacity-80" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {asset.formato ?? meta.label}
            </span>
          </div>
        )}
      </button>

      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-md bg-white/90 p-1.5 shadow-sm hover:bg-white"
          aria-label="Preview"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remover "${asset.nome}"?`)) excluir.mutate();
          }}
          className="rounded-md bg-white/90 p-1.5 text-red-600 shadow-sm hover:bg-white"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2">
        <div className="truncate text-xs font-medium">{asset.nome}</div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{meta.label}</span>
          <span>{formatBytes(asset.peso_bytes)}</span>
        </div>
      </div>
    </Card>
  );
}

// ---------- List view ----------
function AssetList({
  assets,
  onOpen,
  onChanged,
}: {
  assets: Asset[];
  onOpen: (a: Asset) => void;
  onChanged: () => void;
}) {
  const excluirFn = useServerFn(excluirAsset);
  const excluir = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Asset removido");
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Dimensões</th>
            <th className="px-3 py-2 text-left">Peso</th>
            <th className="px-3 py-2 text-left">Versão</th>
            <th className="px-3 py-2 text-left">Downloads</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => {
            const meta = TIPO_META[a.tipo];
            return (
              <tr key={a.id} className="border-t hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <button type="button" onClick={() => onOpen(a)} className="flex items-center gap-2 text-left">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-neutral-100">
                      {isImageTipo(a.tipo) && a.thumbnail_url ? (
                        <img src={a.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <meta.icon className="h-4 w-4 text-neutral-500" />
                      )}
                    </div>
                    <span className="font-medium">{a.nome}</span>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={meta.color}>
                    {meta.label}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {a.largura && a.altura ? `${a.largura}×${a.altura}` : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatBytes(a.peso_bytes)}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.versao ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.downloads}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remover "${a.nome}"?`)) excluir.mutate(a.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Preview Dialog ----------
function PreviewDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const registrarFn = useServerFn(registrarDownload);

  async function baixar() {
    if (!asset?.url) return;
    await registrarFn({ data: { id: asset.id } });
    window.open(asset.url, "_blank");
  }

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        {asset && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{asset.nome}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <div className="flex items-center justify-center overflow-hidden rounded-lg bg-neutral-900 min-h-[380px]">
                {asset.tipo === "video" && asset.url ? (
                  <video src={asset.url} controls className="max-h-[70vh] w-full" />
                ) : isImageTipo(asset.tipo) && asset.url ? (
                  <img src={asset.url} alt={asset.nome} className="max-h-[70vh] w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 p-10 text-neutral-400">
                    <FileText className="h-16 w-16" />
                    <span className="text-sm">Preview não disponível para este tipo</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                {asset.descricao && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Descrição</div>
                    <p className="mt-1 text-neutral-700">{asset.descricao}</p>
                  </div>
                )}
                <MetaRow label="Tipo" value={TIPO_META[asset.tipo].label} />
                <MetaRow label="Formato" value={asset.formato ?? "—"} />
                <MetaRow label="Peso" value={formatBytes(asset.peso_bytes)} />
                <MetaRow
                  label="Dimensões"
                  value={asset.largura && asset.altura ? `${asset.largura}×${asset.altura}px` : "—"}
                />
                <MetaRow label="Versão" value={asset.versao ?? "—"} />
                <MetaRow label="Autor" value={asset.autor ?? "—"} />
                <MetaRow label="Downloads" value={String(asset.downloads)} />
                {asset.tags.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Tags</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {asset.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={baixar} className="w-full gap-2">
                  <Download className="h-4 w-4" /> Baixar arquivo
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-neutral-800">{value}</span>
    </div>
  );
}

// ---------- Upload Dialog ----------
type Pending = { file: File; progress: number; status: "aguardando" | "enviando" | "ok" | "erro"; error?: string };

function UploadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [drag, setDrag] = useState(false);
  const [pendentes, setPendentes] = useState<Pending[]>([]);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const criarFn = useServerFn(criarAsset);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setPendentes((prev) => [
      ...prev,
      ...Array.from(list).map((f) => ({ file: f, progress: 0, status: "aguardando" as const })),
    ]);
  }

  async function enviarTodos() {
    setEnviando(true);
    for (let i = 0; i < pendentes.length; i++) {
      const p = pendentes[i];
      if (p.status === "ok") continue;
      setPendentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "enviando" } : x)));
      try {
        const ext = (p.file.name.split(".").pop() ?? "bin").toLowerCase();
        const tipo: AssetTipo = EXT_TO_TIPO[ext] ?? "outro";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assets").upload(path, p.file, {
          contentType: p.file.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        const dims = await getImageDims(p.file);
        await criarFn({
          data: {
            nome: p.file.name,
            tipo,
            tags: [],
            formato: ext,
            peso_bytes: p.file.size,
            largura: dims.w ?? undefined,
            altura: dims.h ?? undefined,
            status: "ativo",
            storage_path: path,
            thumbnail_path: tipo === "imagem" || tipo === "foto_loja" || tipo === "foto_pdv" || tipo === "mockup" || tipo === "render" ? path : null,
          },
        });
        setPendentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "ok", progress: 100 } : x)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha no upload";
        setPendentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "erro", error: msg } : x)));
      }
    }
    setEnviando(false);
    toast.success("Upload concluído");
    onDone();
  }

  function limparEfechar() {
    setPendentes([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && limparEfechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Assets</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${
            drag ? "border-blue-500 bg-blue-50" : "border-neutral-300 hover:border-neutral-400"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">Arraste arquivos aqui ou clique para selecionar</div>
          <div className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, HEIC, SVG, PDF, MP4, MOV, AI, PSD, INDD, EPS, PPT, DOC, XLS, ZIP, OBJ, STL
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {pendentes.length > 0 && (
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {pendentes.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded border bg-neutral-50 px-3 py-2 text-sm">
                <FileImage className="h-4 w-4 shrink-0 text-neutral-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{p.file.name}</div>
                  <div className="text-[10px] text-muted-foreground">{formatBytes(p.file.size)}</div>
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    p.status === "ok"
                      ? "text-emerald-600"
                      : p.status === "erro"
                      ? "text-red-600"
                      : p.status === "enviando"
                      ? "text-blue-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.status === "enviando" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                  {p.status === "ok" ? "Enviado" : p.status === "erro" ? "Erro" : p.status === "enviando" ? "Enviando…" : "Aguardando"}
                </span>
                {p.status === "aguardando" && (
                  <button
                    type="button"
                    onClick={() => setPendentes((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={limparEfechar} disabled={enviando}>
            Fechar
          </Button>
          <Button onClick={enviarTodos} disabled={pendentes.length === 0 || enviando} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enviar {pendentes.length > 0 ? `(${pendentes.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
