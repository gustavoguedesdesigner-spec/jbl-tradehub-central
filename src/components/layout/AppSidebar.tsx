import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Database,
  Rocket,
  LayoutGrid,
  BarChart3,
  Settings,
  Package,
  Box,
  Users,
  FileImage,
  Tags,
  Layers,
  Link2,
  FolderOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Child = { title: string; url: string; icon: typeof Home };
type Item = { title: string; url: string; icon: typeof Home; children?: Child[] };

const principais: Item[] = [
  { title: "Dashboard", url: "/", icon: Home },
  {
    title: "Base Mestre",
    url: "/base-mestre",
    icon: Database,
    children: [
      { title: "Visão geral", url: "/base-mestre", icon: LayoutGrid },
      { title: "Produtos", url: "/base-mestre/produtos", icon: Package },
      { title: "Materiais", url: "/base-mestre/materiais", icon: Box },
      { title: "Categorias", url: "/base-mestre/categorias", icon: Tags },
      { title: "Famílias", url: "/base-mestre/familias", icon: Layers },
      { title: "Fornecedores", url: "/base-mestre/fornecedores", icon: Users },
      { title: "Arquivos", url: "/base-mestre/arquivos", icon: FileImage },
      { title: "Compatibilidades", url: "/base-mestre/compatibilidades", icon: Link2 },
    ],
  },
  { title: "Central de Lançamentos", url: "/lancamentos", icon: Rocket },
  { title: "Menu Merchandising", url: "/merchandising", icon: LayoutGrid },
];

const sistema: Item[] = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  const renderItem = (item: Item) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
          <Link to={item.url} className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4" />
            <span className="text-[13px]">{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {item.children && active && !collapsed && (
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                  <Link to={child.url} className="flex items-center gap-2">
                    <child.icon className="h-3.5 w-3.5" />
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-neutral-50 font-bold">
            J
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                JBL Trade Hub
              </span>
              <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                Trade Marketing
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{principais.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{sistema.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 text-[10px] text-muted-foreground">
            v0.1 · Fundação
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
