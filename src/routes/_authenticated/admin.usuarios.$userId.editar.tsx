import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getOperationalUser,
  updateOperationalUser,
  resetOperationalUserPassword,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios/$userId/editar")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/admin" });
  },
  component: EditarUsuarioPage,
});

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += chars[n % chars.length];
  return out + "@1";
}

function EditarUsuarioPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const getUser = useServerFn(getOperationalUser);
  const update = useServerFn(updateOperationalUser);
  const resetPwd = useServerFn(resetOperationalUserPassword);

  const { data, isLoading } = useQuery({
    queryKey: ["operational-user", userId],
    queryFn: () => getUser({ data: { user_id: userId } }),
  });

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    municipio_referencia: "",
    identificacao_profissional: "",
    role: "recenseador" as "recenseador" | "consultor" | "coordenador" | "coordenador_recenseador" | "admin",
    area: "" as "" | "social" | "juridico" | "contabil" | "infraestrutura",
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: (data as any).full_name ?? "",
        email: (data as any).email ?? "",
        municipio_referencia: (data as any).municipio_referencia ?? "",
        identificacao_profissional: (data as any).identificacao_profissional ?? "",
        role: ((data as any).roles?.[0] ?? "recenseador") as any,
        area: ((data as any).area ?? "") as any,
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      update({ data: { user_id: userId, ...form, area: form.area || null } as any }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      navigate({ to: "/admin/usuarios" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newPwd, setNewPwd] = useState(genPassword());
  const [lastAppliedPwd, setLastAppliedPwd] = useState<string | null>(null);
  const resetMut = useMutation({
    mutationFn: (pwd: string) => resetPwd({ data: { user_id: userId, new_password: pwd } }),
    onSuccess: (_data, pwd) => {
      setLastAppliedPwd(pwd);
      toast.success("Senha redefinida. Compartilhe exatamente a senha exibida abaixo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold mb-6">Editar usuário</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <Card className="p-6 space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome completo *</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={(data as any)?.cpf ?? ""} disabled />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Perfil *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recenseador">Recenseador (cadastra catadores)</SelectItem>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="admin">Administrador UCPI (acesso total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.role === "consultor" || form.role === "coordenador") && (
                <div>
                  <Label>Tipo de perfil *</Label>
                  <Select
                    value={form.area}
                    onValueChange={(v) => setForm((f) => ({ ...f, area: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Município de referência</Label>
                <Input
                  value={form.municipio_referencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, municipio_referencia: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Identificação profissional</Label>
                <Input
                  value={form.identificacao_profissional}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, identificacao_profissional: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/usuarios" })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-3 max-w-2xl mt-6">
            <h2 className="font-semibold flex items-center gap-2">
              <KeyRound className="size-4" /> Redefinir senha
            </h2>
            <p className="text-sm text-muted-foreground">
              Gere uma senha temporária. O usuário será obrigado a trocá-la no próximo login.
            </p>
            <div className="flex gap-2">
              <Input
                value={newPwd}
                onChange={(e) => {
                  setNewPwd(e.target.value);
                  setLastAppliedPwd(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewPwd(genPassword());
                  setLastAppliedPwd(null);
                }}
              >
                Gerar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => resetMut.mutate(newPwd)}
                disabled={resetMut.isPending || newPwd.length < 8}
              >
                {resetMut.isPending ? "Redefinindo…" : "Redefinir"}
              </Button>
            </div>
            {lastAppliedPwd && (
              <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                <p className="font-medium">Senha aplicada com sucesso.</p>
                <p className="mt-1">
                  Compartilhe exatamente esta senha com o usuário:{" "}
                  <code className="rounded bg-background px-2 py-0.5 font-mono">
                    {lastAppliedPwd}
                  </code>
                </p>
              </div>
            )}
          </Card>
        </form>
      )}
    </AdminShell>
  );
}
