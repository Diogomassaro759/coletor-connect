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
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = !!roles?.some((item) => item.role === "admin");
    const isConsultant = !!roles?.some(
      (item) => item.role === "consultor" || item.role === "atendente",
    );
    const isRecenseador = !!roles?.some((item) => item.role === "recenseador");
    const role = isAdmin
      ? "admin"
      : isConsultant
        ? "consultor"
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
    if (mustChangePassword && location.pathname !== "/admin/trocar-senha") {
      throw redirect({ to: "/admin/trocar-senha" });
    }
    return { user: data.user, role, isAdmin, isConsultant, isRecenseador, mustChangePassword };
  },
  component: () => <Outlet />,
});
