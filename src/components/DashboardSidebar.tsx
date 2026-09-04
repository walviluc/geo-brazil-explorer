import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Layers,
  Crown,
  User,
  CreditCard,
  Receipt,
  Shield,
  Users,
  Globe,
  LogOut,
  MapPin,
  ExternalLink,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  external?: boolean;
}

const mainItems: NavItem[] = [
  { title: "Visão geral", url: "/dashboard", icon: Home },
  { title: "Geodados por UF", url: "/dashboard#geodados", icon: Layers },
  { title: "Catálogo Premium", url: "/subscription", icon: Crown },
];

const accountItems: NavItem[] = [
  { title: "Meu perfil", url: "/profile", icon: User },
  { title: "Gerenciar plano", url: "/subscription", icon: CreditCard },
  { title: "Histórico e recibos", url: "/subscription/history", icon: Receipt },
];

const adminItems: NavItem[] = [
  { title: "Painel administrativo", url: "/admin/data-sources", icon: Shield },
  { title: "Fontes públicas", url: "/admin/public-sources", icon: Globe },
  { title: "Usuários e assinantes", url: "/admin/users", icon: Users },
  { title: "Gerenciar planos", url: "/admin/plans", icon: Crown },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname, hash } = useLocation();
  const { isAdmin } = useUserRole();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (url: string) => {
    const [path, frag] = url.split("#");
    if (pathname !== path) return false;
    return frag ? hash === `#${frag}` : !hash;
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <NavLink to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <NavLink to="/" className="flex items-center gap-3 px-2 py-3">
          <span className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-bold leading-tight truncate">GeoData Brasil</span>
              <span className="block text-xs text-muted-foreground truncate">
                Portal de dados geoespaciais
              </span>
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Área do usuário", mainItems)}
        {renderGroup("Conta", accountItems)}
        {isAdmin && renderGroup("Administração", adminItems)}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ajuda</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Site do portal">
                  <NavLink to="/" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Site do portal</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
