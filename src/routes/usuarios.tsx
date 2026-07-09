import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Shield,
  UserPlus,
  Mail,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Ban,
  Crown,
  Settings2,
  Eye,
  Pencil,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários & Permissões — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Gerencie usuários, papéis e permissões da equipe de Trade Marketing JBL.",
      },
    ],
  }),
  component: UsuariosPage,
});

type Role = "admin" | "gerente" | "trade" | "marketing" | "fornecedor" | "visualizador";
type Status = "ativo" | "convite_pendente" | "inativo";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  area: string;
  role: Role;
  status: Status;
  ultimoAcesso: string;
  projetos: number;
}

const roleMeta: Record<Role, { label: string; description: string; color: string; icon: typeof Crown }> = {
  admin: {
    label: "Administrador",
    description: "Acesso total à plataforma, permissões e configurações.",
    color: "bg-neutral-900 text-white",
    icon: Crown,
  },
  gerente: {
    label: "Gerente",
    description: "Aprovações, relatórios executivos e visão consolidada.",
    color: "bg-blue-100 text-blue-800",
    icon: Shield,
  },
  trade: {
    label: "Trade Marketing",
    description: "Gerencia lançamentos, materiais de PDV e execução.",
    color: "bg-emerald-100 text-emerald-800",
    icon: Settings2,
  },
  marketing: {
    label: "Marketing",
    description: "Cria briefings, campanhas e conteúdo de marca.",
    color: "bg-violet-100 text-violet-800",
    icon: Settings2,
  },
  fornecedor: {
    label: "Fornecedor",
    description: "Acesso restrito aos projetos e materiais atribuídos.",
    color: "bg-amber-100 text-amber-800",
    icon: Users,
  },
  visualizador: {
    label: "Visualizador",
    description: "Somente leitura em produtos, materiais e relatórios.",
    color: "bg-neutral-100 text-neutral-700",
    icon: Eye,
  },
};

const statusMeta: Record<Status, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  convite_pendente: { label: "Convite pendente", className: "bg-amber-100 text-amber-800", icon: Clock },
  inativo: { label: "Inativo", className: "bg-neutral-200 text-neutral-600", icon: Ban },
};

const usuariosMock: Usuario[] = [
  { id: "1", nome: "Marina Alves", email: "marina.alves@jbl.com", cargo: "Head de Trade Marketing", area: "Trade Marketing", role: "admin", status: "ativo", ultimoAcesso: "há 3 min", projetos: 18 },
  { id: "2", nome: "Ricardo Souza", email: "ricardo.souza@jbl.com", cargo: "Gerente de Marketing", area: "Marketing", role: "gerente", status: "ativo", ultimoAcesso: "há 12 min", projetos: 11 },
  { id: "3", nome: "Camila Fernandes", email: "camila.fernandes@jbl.com", cargo: "Coordenadora de Trade", area: "Trade Marketing", role: "trade", status: "ativo", ultimoAcesso: "há 1 h", projetos: 9 },
  { id: "4", nome: "Bruno Tanaka", email: "bruno.tanaka@jbl.com", cargo: "Analista de PDV", area: "Trade Marketing", role: "trade", status: "ativo", ultimoAcesso: "há 2 h", projetos: 6 },
  { id: "5", nome: "Larissa Duarte", email: "larissa.duarte@jbl.com", cargo: "Product Marketing", area: "Marketing", role: "marketing", status: "ativo", ultimoAcesso: "ontem", projetos: 5 },
  { id: "6", nome: "Diego Ramos", email: "diego@grafikapdv.com.br", cargo: "Fornecedor — Gráfica PDV", area: "Externo", role: "fornecedor", status: "ativo", ultimoAcesso: "há 4 h", projetos: 3 },
  { id: "7", nome: "Patrícia Nogueira", email: "patricia@displayone.com.br", cargo: "Fornecedor — Displays", area: "Externo", role: "fornecedor", status: "convite_pendente", ultimoAcesso: "—", projetos: 0 },
  { id: "8", nome: "Felipe Costa", email: "felipe.costa@jbl.com", cargo: "Diretor Comercial", area: "Comercial", role: "visualizador", status: "ativo", ultimoAcesso: "há 2 dias", projetos: 0 },
  { id: "9", nome: "Aline Prado", email: "aline.prado@jbl.com", cargo: "Estagiária de Trade", area: "Trade Marketing", role: "visualizador", status: "convite_pendente", ultimoAcesso: "—", projetos: 0 },
  { id: "10", nome: "Rodrigo Melo", email: "rodrigo.melo@jbl.com", cargo: "Ex-analista", area: "Trade Marketing", role: "trade", status: "inativo", ultimoAcesso: "há 3 meses", projetos: 0 },
];

const permissoesPorRole: { modulo: string; admin: string; gerente: string; trade: string; marketing: string; fornecedor: string; visualizador: string }[] = [
  { modulo: "Base Mestre — Produtos", admin: "total", gerente: "editar", trade: "editar", marketing: "ler", fornecedor: "—", visualizador: "ler" },
  { modulo: "Base Mestre — Materiais PDV", admin: "total", gerente: "editar", trade: "editar", marketing: "ler", fornecedor: "ler", visualizador: "ler" },
  { modulo: "Central de Lançamentos", admin: "total", gerente: "aprovar", trade: "editar", marketing: "editar", fornecedor: "atribuídos", visualizador: "ler" },
  { modulo: "Launch Control Center", admin: "total", gerente: "total", trade: "ler", marketing: "ler", fornecedor: "—", visualizador: "ler" },
  { modulo: "Asset Center", admin: "total", gerente: "editar", trade: "editar", marketing: "editar", fornecedor: "atribuídos", visualizador: "ler" },
  { modulo: "Territory Intelligence", admin: "total", gerente: "total", trade: "ler", marketing: "ler", fornecedor: "—", visualizador: "ler" },
  { modulo: "Relatórios", admin: "total", gerente: "total", trade: "ler", marketing: "ler", fornecedor: "—", visualizador: "ler" },
  { modulo: "Configurações & Usuários", admin: "total", gerente: "—", trade: "—", marketing: "—", fornecedor: "—", visualizador: "—" },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function PermCell({ value }: { value: string }) {
  if (value === "—")
    return <span className="text-neutral-300">—</span>;
  const map: Record<string, string> = {
    total: "bg-neutral-900 text-white",
    aprovar: "bg-blue-100 text-blue-800",
    editar: "bg-emerald-100 text-emerald-800",
    ler: "bg-neutral-100 text-neutral-700",
    atribuídos: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${map[value] ?? "bg-neutral-100 text-neutral-700"}`}>
      {value}
    </span>
  );
}

function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<Status | "todos">("todos");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo(() => {
    return usuariosMock.filter((u) => {
      const q = search.toLowerCase();
      const okSearch =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cargo.toLowerCase().includes(q);
      const okRole = roleFilter === "todos" || u.role === roleFilter;
      const okStatus = statusFilter === "todos" || u.status === statusFilter;
      return okSearch && okRole && okStatus;
    });
  }, [search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: usuariosMock.length,
      ativos: usuariosMock.filter((u) => u.status === "ativo").length,
      pendentes: usuariosMock.filter((u) => u.status === "convite_pendente").length,
      fornecedores: usuariosMock.filter((u) => u.role === "fornecedor").length,
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Usuários & Permissões"
        description="Convide sua equipe, defina papéis e controle o que cada pessoa pode ver e editar na plataforma."
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar novo usuário</DialogTitle>
                <DialogDescription>
                  Enviaremos um convite por e-mail. O usuário definirá a própria senha no primeiro acesso.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" placeholder="Ex.: Ana Ribeiro" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input id="email" type="email" placeholder="ana.ribeiro@jbl.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Papel</Label>
                  <Select defaultValue="trade">
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleMeta) as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleMeta[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setInviteOpen(false)} className="gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container-page py-10 space-y-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total de usuários" value={stats.total} icon={Users} />
          <StatCard label="Ativos" value={stats.ativos} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Convites pendentes" value={stats.pendentes} icon={Clock} tone="amber" />
          <StatCard label="Fornecedores" value={stats.fornecedores} icon={Shield} tone="blue" />
        </div>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="papeis">Papéis</TabsTrigger>
            <TabsTrigger value="permissoes">Matriz de permissões</TabsTrigger>
          </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome, e-mail ou cargo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "todos")}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os papéis</SelectItem>
                  {(Object.keys(roleMeta) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleMeta[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "todos")}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="convite_pendente">Convites pendentes</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo / Área</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Projetos</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const RoleIcon = roleMeta[u.role].icon;
                    const StatusIcon = statusMeta[u.status].icon;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-neutral-100 text-xs font-medium text-neutral-700">
                                {iniciais(u.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">{u.nome}</div>
                              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{u.cargo}</div>
                          <div className="text-xs text-muted-foreground">{u.area}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${roleMeta[u.role].color}`}>
                            <RoleIcon className="h-3 w-3" />
                            {roleMeta[u.role].label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`gap-1 ${statusMeta[u.status].className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusMeta[u.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground">{u.projetos}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.ultimoAcesso}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" /> Reenviar convite
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" /> Alterar papel
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Ban className="mr-2 h-4 w-4" /> Desativar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum usuário encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Papéis */}
          <TabsContent value="papeis" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(roleMeta) as Role[]).map((r) => {
                const meta = roleMeta[r];
                const Icon = meta.icon;
                const qtd = usuariosMock.filter((u) => u.role === r).length;
                return (
                  <Card key={r}>
                    <CardHeader>
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      <CardDescription>{meta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{qtd} usuário(s)</span>
                      <Button variant="ghost" size="sm">
                        Configurar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Permissões */}
          <TabsContent value="permissoes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matriz de permissões por módulo</CardTitle>
                <CardDescription>
                  Visão consolidada do que cada papel pode fazer em cada módulo da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Módulo</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Gerente</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Marketing</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Visualizador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissoesPorRole.map((row) => (
                      <TableRow key={row.modulo}>
                        <TableCell className="font-medium text-foreground">{row.modulo}</TableCell>
                        <TableCell><PermCell value={row.admin} /></TableCell>
                        <TableCell><PermCell value={row.gerente} /></TableCell>
                        <TableCell><PermCell value={row.trade} /></TableCell>
                        <TableCell><PermCell value={row.marketing} /></TableCell>
                        <TableCell><PermCell value={row.fornecedor} /></TableCell>
                        <TableCell><PermCell value={row.visualizador} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: "neutral" | "emerald" | "amber" | "blue";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
