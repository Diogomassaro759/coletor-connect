import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertCircle, KeyRound } from "lucide-react";
import procateLogo from "@/assets/procate-logo.png";

export const Route = createFileRoute("/_authenticated/admin/trocar-senha")({
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState({ next: "", confirm: "" });

  const changePwd = useMutation({
    mutationFn: async () => {
      if (pwd.next.length < 8) throw new Error("Mínimo 8 caracteres.");
      if (!/[A-Z]/.test(pwd.next) || !/[a-z]/.test(pwd.next) || !/\d/.test(pwd.next)) {
        throw new Error("Use letras maiúsculas, minúsculas e números.");
      }
      if (pwd.next !== pwd.confirm) throw new Error("As senhas não coincidem.");
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw new Error(error.message);
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("user_id", user.id);
    },
    onSuccess: async () => {
      toast.success("Senha alterada. Entre novamente com a nova senha.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-3">
          <img src={procateLogo} alt="PROCATE" className="h-14 mx-auto" />
          <h1 className="text-2xl font-bold">Defina uma nova senha</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Primeiro acesso</AlertTitle>
          <AlertDescription>
            Sua senha atual foi definida por um administrador. Crie uma nova senha para continuar.
            Após confirmar, você será desconectado e deverá entrar com a nova senha.
          </AlertDescription>
        </Alert>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changePwd.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              required
              value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo 8 caracteres, com maiúsculas, minúsculas e números.
            </p>
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              required
              value={pwd.confirm}
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={changePwd.isPending}>
            <KeyRound className="size-4 mr-2" />
            {changePwd.isPending ? "Alterando…" : "Alterar senha e sair"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
