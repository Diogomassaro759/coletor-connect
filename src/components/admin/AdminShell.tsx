import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  BarChart3,
  Bell,
  ClipboardPenLine,
  UserCog,
  UserCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import procateLogo from "@/assets/procate-logo.png";
import { loadNotifications } from "@/lib/notifications";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, isConsultant, isCoordenador, isRecenseador, area, user } = useRouteContext({
    from: "/_authenticated",
  }) as any;
  const isViewer = isConsultant || isCoordenador;
  const AREA_LABEL: Record<string, string> = {
    social: "Social",
    juridico: "Jurídico",
    contabil: "Contábil",
    infraestrutura: "Infraestrutura",
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: () => loadNotifications({ isAdmin, isConsultant: isViewer, userId: user.id }),
    enabled: isAdmin || isViewer,
    refetchInterval: 60_000,
  });
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/95 backdrop-blur border-b border-border sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to={isAdmin || isRecenseador ? "/admin" : "/admin/associacoes"}
            className="flex items-center gap-2"
            aria-label="PROCATE — Painel administrativo"
          >
            <img
              src={procateLogo}
              alt="PROCATE — Projeto Catador Empreendedor"
              className="h-10 w-auto sm:h-11"
            />
            <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-wider text-muted-foreground ml-2 px-2 py-0.5 rounded bg-muted">
              {isAdmin
                ? "Administrador UCIP"
                : isRecenseador
                  ? "Recenseador"
                  : "Consultor"}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="size-4" />{" "}
                  <span className="hidden sm:inline">Catadores</span>
                </Button>
              </Link>
            )}
            {(isAdmin || isConsultant) && (
              <Link to="/admin/associacoes">
                <Button variant="ghost" size="sm">
                  {isAdmin ? (
                    <Building2 className="size-4" />
                  ) : (
                    <ClipboardPenLine className="size-4" />
                  )}{" "}
                  <span className="hidden md:inline">
                    {isAdmin ? "Associações" : "Cadastros de campo"}
                  </span>
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/diagnosticos">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="size-4" />{" "}
                  <span className="hidden lg:inline">Regularidade</span>
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin/usuarios">
                <Button variant="ghost" size="sm">
                  <UserCog className="size-4" />{" "}
                  <span className="hidden lg:inline">Usuários</span>
                </Button>
              </Link>
            )}
            {(isAdmin || isConsultant) && (
              <Link to="/admin/notificacoes" className="relative">
                <Button variant="ghost" size="sm" title="Notificações">
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            <Link to="/admin/perfil">
              <Button variant="ghost" size="sm" title="Meu perfil">
                <UserCircle2 className="size-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} title="Sair">
              <LogOut className="size-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 md:py-10">{children}</main>
    </div>
  );
}
