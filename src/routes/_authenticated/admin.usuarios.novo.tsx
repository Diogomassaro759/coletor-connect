import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Copy, Check } from "lucide-react";
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
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { createOperationalUser } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios/novo")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/admin" });
  },
  component: NovoUsuarioPage,
});

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += chars[n % chars.length];
  return out + "@1";
}

function NovoUsuarioPage() {
  const navigate = useNavigate();
  const create = useServerFn(createOperationalUser);

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    birth_date: "",
    email: "",
    password: genPassword(),
    role: "recenseador" as "recenseador" | "consultor" | "admin",
    municipio_referencia: "",
    identificacao_profissional: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          ...form,
          cpf: form.cpf.replace(/\D/g, ""),
          birth_date: form.birth_date || null,
          municipio_referencia: form.municipio_referencia || null,
          identificacao_profissional: form.identificacao_profissional || null,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado. Compartilhe a senha inicial.");
      navigate({ to: "/admin/usuarios" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <AdminShell>
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold mb-1">Novo usuário operacional</h1>
      <p className="text-sm text-muted-foreground mb-6">
        O usuário será criado com a senha inicial abaixo e deverá redefini-la no primeiro acesso.
      </p>

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
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>
            <div>
              <Label>CPF * (somente números)</Label>
              <Input
                required
                inputMode="numeric"
                maxLength={14}
                value={form.cpf}
                onChange={(e) => set("cpf", e.target.value)}
              />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </div>
            <div>
              <Label>E-mail (login) *</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de perfil *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => set("role", v as "recenseador" | "consultor" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recenseador">Recenseador (cadastra catadores)</SelectItem>
                  <SelectItem value="consultor">Consultor de Campo (diagnósticos)</SelectItem>
                  <SelectItem value="admin">Administrador UCIP (acesso total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Município de referência</Label>
              <Input
                value={form.municipio_referencia}
                onChange={(e) => set("municipio_referencia", e.target.value)}
              />
            </div>
            <div>
              <Label>Identificação profissional</Label>
              <Input
                value={form.identificacao_profissional}
                onChange={(e) => set("identificacao_profissional", e.target.value)}
                placeholder="CRESS, OAB, registro etc."
              />
            </div>
            <div className="md:col-span-2">
              <Label>Senha inicial *</Label>
              <div className="flex gap-2">
                <Input
                  required
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => set("password", genPassword())}>
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O usuário será obrigado a redefinir no primeiro acesso.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/usuarios" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </Card>
      </form>
    </AdminShell>
  );
}
