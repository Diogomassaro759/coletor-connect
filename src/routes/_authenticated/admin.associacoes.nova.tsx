import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/associacoes/nova")({
  beforeLoad: ({ context }: { context: any }) => {
    const allowed =
      context.isAdmin ||
      (context.isCoordenador && context.area === "social") ||
      (context.isConsultant && context.area === "social");
    if (!allowed) throw redirect({ to: "/admin/associacoes" });
  },
  head: () => ({ meta: [{ title: "Nova associação — PROCATE" }] }),
  component: NewAssociationPage,
});

function NewAssociationPage() {
  const navigate = useNavigate();
  const ctx = Route.useRouteContext() as any;
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("associacao");
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const defaultConsultor =
    (ctx?.user?.user_metadata?.full_name as string | undefined) ??
    (ctx?.user?.email as string | undefined) ??
    "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { data: association, error } = await supabase
      .from("associations")
      .insert({
        nome: String(form.get("nome") ?? "").trim(),
        tipo,
        cnpj: String(form.get("cnpj") ?? "").trim() || null,
        municipio: String(form.get("municipio") ?? "").trim(),
        inscricao_municipal: String(form.get("inscricao_municipal") ?? "").trim() || null,
        inscricao_estadual: String(form.get("inscricao_estadual") ?? "").trim() || null,
        endereco_sede: String(form.get("endereco_sede") ?? "").trim(),
        telefone: String(form.get("telefone") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        numero_associados_inicial: Number(form.get("numero_associados_inicial") ?? 0),
        numero_associados_atual: Number(form.get("numero_associados_atual") ?? 0),
        consultor_nome: String(form.get("consultor_nome") ?? "").trim() || null,
        data_visita: String(form.get("data_visita") ?? "").trim() || null,
        horario_visita: String(form.get("horario_visita") ?? "").trim() || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    toast.success("Entidade cadastrada com sucesso.");
    navigate({ to: "/admin/associacoes/$id", params: { id: association.id } });
  }

  return (
    <AdminShell>
      <Link to="/admin/associacoes">
        <Button variant="ghost" size="sm" className="mb-5">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      </Link>
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Cadastro institucional
          </p>
          <h1 className="mt-1 text-3xl font-bold">Nova associação ou cooperativa</h1>
          <p className="mt-2 text-muted-foreground">
            Esta entidade ficará disponível na lista fechada dos cadastros e diagnósticos.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="space-y-7 rounded-xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Nome do consultor">
              <Input name="consultor_nome" defaultValue={defaultConsultor} maxLength={200} />
            </Field>
            <Field label="Data da visita">
              <Input name="data_visita" type="date" defaultValue={defaultDate} />
            </Field>
            <Field label="Horário da visita">
              <Input name="horario_visita" type="time" defaultValue={defaultTime} />
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nome completo" className="md:col-span-2">
              <Input name="nome" required minLength={2} maxLength={200} />
            </Field>
            <Field label="Tipo">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="associacao">Associação</SelectItem>
                  <SelectItem value="cooperativa">Cooperativa</SelectItem>
                  <SelectItem value="coletivo">Coletivo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="CNPJ">
              <Input name="cnpj" maxLength={18} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Município">
              <Input name="municipio" required maxLength={120} />
            </Field>
            <Field label="Inscrição municipal">
              <Input name="inscricao_municipal" maxLength={60} />
            </Field>
            <Field label="Inscrição estadual">
              <Input name="inscricao_estadual" maxLength={60} />
            </Field>
            <Field label="Telefone">
              <Input name="telefone" maxLength={20} />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" maxLength={150} />
            </Field>
            <Field label="Associados no início">
              <Input
                name="numero_associados_inicial"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </Field>
            <Field label="Associados atualmente">
              <Input
                name="numero_associados_atual"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </Field>
            <Field label="Endereço completo da sede" className="md:col-span-2">
              <Textarea name="endereco_sede" required minLength={5} maxLength={500} rows={3} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Link to="/admin/associacoes">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="lg" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Cadastrar entidade
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
