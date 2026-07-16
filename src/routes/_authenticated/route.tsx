import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveFirstLoginRedirect } from "@/lib/auth-flow";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role, area")
      .eq("user_id", data.user.id);
    const isAdmin = !!roles?.some((item) => item.role === "admin");
    const isConsultant = !!roles?.some(
      (item) => item.role === "consultor" || item.role === "atendente",
    );
    const isCoordenador = !!roles?.some((item) => item.role === "coordenador");
    const isCoordenadorRecenseador = !!roles?.some(
      (item) => item.role === "coordenador_recenseador",
    );
    const isRecenseador = !!roles?.some((item) => item.role === "recenseador");
    const areaRow =
      roles?.find((item: any) => item.area && (item.role === "consultor" || item.role === "coordenador"));
    const area = ((areaRow as any)?.area ?? null) as
      | "social"
      | "juridico"
      | "contabil"
      | "infraestrutura"
      | null;
    const role = isAdmin
      ? "admin"
      : isConsultant
        ? "consultor"
        : isCoordenador
          ? "coordenador"
          : isCoordenadorRecenseador
            ? "coordenador_recenseador"
            : isRecenseador
              ? "recenseador"
              : null;
    if (roleError || !role) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const mustChangePassword = !!profile?.must_change_password;
    const redirectTo = resolveFirstLoginRedirect({
      mustChangePassword,
      pathname: location.pathname,
    });
    if (redirectTo) throw redirect({ to: redirectTo });
    return {
      user: data.user,
      role,
      isAdmin,
      isConsultant,
      isCoordenador,
      isCoordenadorRecenseador,
      isRecenseador,
      area,
      mustChangePassword,
    };

  },
  component: () => <Outlet />,
});
