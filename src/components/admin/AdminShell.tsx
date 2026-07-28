import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  BarChart3,
  ClipboardPenLine,
  UserCog,
  UserCircle2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import procateLogo from "@/assets/procate-logo.png";


export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, isConsultant, isCoordenador, isCoordenadorRecenseador, isRecenseador, area, user } = useRouteContext({
    from: "/_authenticated",
  }) as any;
  const isViewer = isConsultant || isCoordenador;
  const AREA_LABEL: Record<string, string> = {
    social: "Social",
    juridico: "Jurídico",
    contabil: "Contábil",
    infraestrutura: "Infraestrutura",
  };




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
            to={isAdmin || isCoordenador || isRecenseador || isCoordenadorRecenseador ? "/admin" : "/admin/associacoes"}
            className="flex items-center gap-2"
            aria-label="PROCATE — Painel"
          >
            <img
              src={procateLogo}
              alt="PROCATE — Projeto Catador Empreendedor"
              className="h-10 w-auto sm:h-11"
            />
            <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-wider text-muted-foreground ml-2 px-2 py-0.5 rounded bg-muted">
              {(() => {
                const areaLabel: Record<string, string> = {
                  social: "Social",
                  juridico: "Jurídico",
                  contabil: "Contábil",
                  infraestrutura: "Infraestrutura",
                };
                const suffix = area ? ` ${areaLabel[area] ?? area}` : "";
                if (isAdmin) return "Administrador do Sistema";
                if (isRecenseador) return "Recenseador";
                if (isCoordenadorRecenseador) return "Coordenador do Recenseamento";
                if (isCoordenador) return `Coordenador${suffix}`;
                return `Consultor${suffix}`;
              })()}
            </span>

          </Link>
          <nav className="flex items-center gap-1">
            {(isAdmin || isCoordenadorRecenseador) && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" search={{ view: "catadores" as const }}>
                  <LayoutDashboard className="size-4" />{" "}
                  <span className="hidden sm:inline">Catadores</span>
                </Link>
              </Button>
            )}
            {(isAdmin || isViewer) && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/associacoes">
                  <Building2 className="size-4" />{" "}
                  <span className="hidden md:inline">Entidades</span>
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/diagnosticos">
                  <BarChart3 className="size-4" />{" "}
                  <span className="hidden lg:inline">Regularidade</span>
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/usuarios">
                  <UserCog className="size-4" />{" "}
                  <span className="hidden lg:inline">Usuários</span>
                </Link>
              </Button>
            )}



            <Button variant="ghost" size="sm" title="Meu perfil" asChild>
              <Link to="/admin/perfil">
                <UserCircle2 className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} title="Sair">
              <LogOut className="size-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-3 py-5 sm:px-4 sm:py-8 md:py-10">{children}</main>
    </div>
  );
}
