import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/associacoes/$id/editar")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "view" ? ("view" as const) : ("edit" as const),
  }),
  beforeLoad: ({ context, search }) => {
    if (search.mode === "view") return;
    const canEdit =
      context.isAdmin ||
      context.isCoordenador ||
      (context.isConsultant && context.area === "social");
    if (!canEdit)
      throw redirect({ to: "/admin/associacoes" });
  },
  head: () => ({ meta: [{ title: "Entidade — PROCATE" }] }),
  component: EditAssociationPage,
});

function EditAssociationPage() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const readOnly = mode === "view";
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<string>("associacao");
  const [ativa, setAtiva] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["association", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setTipo(data.tipo ?? "associacao");
      setAtiva(!!data.ativa);
    }
  }, [data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { error } = await supabase
      .from("associations")
      .update({
        nome: String(form.get("nome") ?? "").trim(),
        tipo,
        ativa,
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
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Entidade atualizada.");
    navigate({ to: "/admin/associacoes/$id", params: { id } });
  }

  if (isLoading || !data) {
    return (
      <AdminShell>
        <p className="text-muted-foreground">Carregando...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <BackButton label="Voltar aos detalhes" className="mb-5" />
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold">
          {readOnly ? "Visualizar entidade" : "Editar entidade"}
        </h1>
        {readOnly && (
          <p className="mb-6 text-sm text-muted-foreground">
            Dados preenchidos do cadastro Social desta entidade (somente leitura).
          </p>
        )}
        <form
          onSubmit={submit}
          className="space-y-7 rounded-xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <fieldset disabled={readOnly} className="contents">
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Nome do consultor">
              <Input name="consultor_nome" defaultValue={(data as any).consultor_nome ?? ""} maxLength={200} />
            </Field>
            <Field label="Data da visita">
              <Input name="data_visita" type="date" defaultValue={(data as any).data_visita ?? ""} />
            </Field>
            <Field label="Horário da visita">
              <Input name="horario_visita" type="time" defaultValue={((data as any).horario_visita ?? "").toString().slice(0,5)} />
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nome completo" className="md:col-span-2">
              <Input name="nome" defaultValue={data.nome} required minLength={2} maxLength={200} />
            </Field>
            <Field label="Tipo">
              <Select value={tipo} onValueChange={(v) => setTipo(v)} disabled={readOnly}>
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
            <Field label="Situação">
              <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                <Switch checked={ativa} onCheckedChange={setAtiva} disabled={readOnly} />
                <span className="text-sm">{ativa ? "Ativa" : "Inativa"}</span>
              </div>
            </Field>
            <Field label="CNPJ">
              <Input name="cnpj" defaultValue={data.cnpj ?? ""} maxLength={18} />
            </Field>
            <Field label="Município">
              <Input name="municipio" defaultValue={data.municipio} required maxLength={120} />
            </Field>
            <Field label="Inscrição municipal">
              <Input
                name="inscricao_municipal"
                defaultValue={data.inscricao_municipal ?? ""}
                maxLength={60}
              />
            </Field>
            <Field label="Inscrição estadual">
              <Input
                name="inscricao_estadual"
                defaultValue={data.inscricao_estadual ?? ""}
                maxLength={60}
              />
            </Field>
            <Field label="Telefone">
              <Input name="telefone" defaultValue={data.telefone ?? ""} maxLength={20} />
            </Field>
            <Field label="E-mail">
              <Input
                name="email"
                type="email"
                defaultValue={data.email ?? ""}
                maxLength={150}
              />
            </Field>
            <Field label="Associados no início">
              <Input
                name="numero_associados_inicial"
                type="number"
                min="0"
                defaultValue={data.numero_associados_inicial ?? 0}
                required
              />
            </Field>
            <Field label="Associados atualmente">
              <Input
                name="numero_associados_atual"
                type="number"
                min="0"
                defaultValue={data.numero_associados_atual ?? 0}
                required
              />
            </Field>
            <Field label="Endereço completo da sede" className="md:col-span-2">
              <Textarea
                name="endereco_sede"
                defaultValue={data.endereco_sede ?? ""}
                required
                minLength={5}
                maxLength={500}
                rows={3}
              />
            </Field>
          </div>
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Link to="/admin/associacoes/$id" params={{ id }}>
              <Button type="button" variant="ghost">
                {readOnly ? "Voltar" : "Cancelar"}
              </Button>
            </Link>
            {!readOnly && (
              <Button type="submit" size="lg" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Salvar alterações
              </Button>
            )}
          </div>
        </form>
        <FilledFormsList associationId={id} />
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
