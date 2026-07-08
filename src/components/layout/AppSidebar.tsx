import { Link, useRouterState } from "@tanstack/react-router";
import { Database, Rocket, LayoutGrid, Home, Package, Box, Users, FileImage } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
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

type Item = { title: string; url: string; icon: typeof Home; children?: { title: string; url: string; icon: typeof Home }[] };

const modulos: Item[] = [
  { title: "Início", url: "/", icon: Home },
  {
    title: "Base Mestre",
    url: "/base-mestre",
    icon: Database,
    children: [
      { title: "Visão geral", url: "/base-mestre", icon: LayoutGrid },
      { title: "Produtos", url: "/base-mestre/produtos", icon: Package },
      { title: "Materiais de PDV", url: "/base-mestre/materiais", icon: Box },
      { title: "Fornecedores", url: "/base-mestre/fornecedores", icon: Users },
      { title: "Arquivos", url: "/base-mestre/arquivos", icon: FileImage },
    ],
  },
  { title: "Central de Lançamentos", url: "/lancamentos", icon: Rocket },
  { title: "Menu Merchandising", url: "/merchandising", icon: LayoutGrid },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            J
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">JBL Trade Hub</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Trade Marketing
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modulos.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
