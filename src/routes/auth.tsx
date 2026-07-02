import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import procateLogo from "@/assets/procate-logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Entrar — RecicladoresBR" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function goPostLogin(userId: string) {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("must_change_password").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (profile?.must_change_password) {
      navigate({ to: "/admin/perfil" });
      return;
    }
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    const isRecenseador = !!roles?.some((r) => r.role === "recenseador");
    if (isAdmin || isRecenseador) {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/admin/associacoes" });
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goPostLogin(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error || !data.user) {
      toast.error("Falha no login", { description: error?.message ?? "Erro desconhecido" });
      return;
    }
    toast.success("Bem-vindo!");
    await goPostLogin(data.user.id);
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left visual */}
      <div className="hidden md:flex relative bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <Link
          to="/"
          className="w-fit rounded-2xl bg-card/95 px-5 py-3 shadow-soft"
          aria-label="PROCATE — Página inicial"
        >
          <img
            src={procateLogo}
            alt="PROCATE — Projeto Catador Empreendedor"
            className="h-14 w-auto"
          />
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            "Reciclar é dignidade. Catalogar é poder."
          </h2>
          <p className="mt-4 text-white/85">
            Gerencie cadastros com segurança e dê visibilidade às pessoas que sustentam a reciclagem
            no Brasil.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 block w-fit md:hidden" aria-label="PROCATE — Página inicial">
            <img
              src={procateLogo}
              alt="PROCATE — Projeto Catador Empreendedor"
              className="h-14 w-auto max-w-full"
            />
          </Link>
          <h1 className="text-2xl font-bold">Acessar painel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acesso restrito para administradores da UCIP e consultores de campo.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Entrar
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Cooperativas e catadores fornecem os dados, mas não acessam o sistema diretamente.
          </p>
        </div>
      </div>
    </div>
  );
}
