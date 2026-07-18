import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Pencil, Trash2, ChevronDown, Check, Info, History, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { GENERO_LABEL, STATUS_OPTIONS, STATUS_LABEL, STATUS_DESCRIPTION, STATUS_INATIVO_CRITERIOS } from "@/lib/catador-constants";
import {
  canViewSensitive,
  maskCPF,
  maskRG,
  maskPhone,
  maskEmail,
  maskAddress,
  maskDocument,
} from "@/lib/mask-sensitive";

export const Route = createFileRoute("/_authenticated/admin/$id/")({
  head: () => ({ meta: [{ title: "Detalhes — RecicladoresBR" }] }),
  component: CatadorDetails,
});

function CatadorDetails() {
  const { id } = Route.useParams();
  const { role, user, isAdmin, isCoordenadorRecenseador } = Route.useRouteContext() as any;
  const showFull = canViewSensitive(role);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: c, isLoading } = useQuery({
    queryKey: ["catador", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("catadores").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("catadores")
        .update({ status: status as "ativo" | "inativo" | "pendente" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["catador", id] });
      qc.invalidateQueries({ queryKey: ["catadores"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro excluído.");
      qc.invalidateQueries({ queryKey: ["catadores"] });
      navigate({ to: "/admin" });
    },
  });

  if (isLoading) {
    return <AdminShell><p className="text-muted-foreground">Carregando...</p></AdminShell>;
  }
  if (!c) {
    return <AdminShell><p>Catador não encontrado.</p></AdminShell>;
  }

  return (
    <AdminShell>
      <Link to="/admin">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{c.nome_completo}</h1>
            <StatusPill status={c.status} />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Sobre o status ${STATUS_LABEL[c.status] ?? c.status}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {STATUS_DESCRIPTION[c.status] ?? "Sem descrição."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground mt-1">
            Cadastrado em {new Date(c.data_cadastro).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <span className="text-xs text-muted-foreground">Status atual:</span>
                  <StatusPill status={c.status} />
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-start gap-2 py-3 bg-muted/40">
                  <Check className="size-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status atual
                      </span>
                      <StatusPill status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground font-normal leading-snug mt-1">
                      {STATUS_DESCRIPTION[c.status]}
                    </p>
                    {c.status === "inativo" && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground list-disc pl-4">
                        {STATUS_INATIVO_CRITERIOS.map((cr) => <li key={cr}>{cr}</li>)}
                      </ul>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground pt-2">
                  Alterar para
                </DropdownMenuLabel>
                {STATUS_OPTIONS.filter((s) => s.value !== c.status).map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => statusMutation.mutate(s.value)}
                    className="flex items-start gap-2 py-2"
                  >
                    <div className="size-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{s.label}</div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {STATUS_DESCRIPTION[s.value]}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {(isAdmin || isCoordenadorRecenseador || c.created_by === user.id) && (
            <Link to="/admin/$id/editar" params={{ id }}>
              <Button variant="outline"><Pencil className="size-4" /> Editar</Button>
            </Link>
          )}
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. O cadastro de <strong>{c.nome_completo}</strong> será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!showFull && (
          <div className="lg:col-span-2 rounded-xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
            <ShieldAlert className="size-5 text-warning-foreground shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Dados sensíveis protegidos (LGPD)</p>
              <p className="text-muted-foreground text-xs mt-1">
                CPF, RG/CIN, endereço, telefone e e-mail estão mascarados. A visualização completa
                é restrita a perfis com permissão específica (Administrador UCIP).
              </p>
            </div>
          </div>
        )}
        <Section title="Identificação">
          <Field k="CPF" v={showFull ? (c.cpf ?? "—") : maskCPF(c.cpf)} sensitive={!showFull} />
          <Field k="RG / CIN" v={showFull ? (c.rg_cin ?? "—") : maskRG(c.rg_cin)} sensitive={!showFull} />
          <Field k="Gênero" v={c.genero ? (GENERO_LABEL[c.genero] ?? c.genero) : "—"} />
          <Field k="Autodeclaração racial" v={c.autodeclaracao_racial ?? "—"} />
          <Field k="Escolaridade" v={c.escolaridade ?? "—"} />
          <Field k="Cooperativa / Grupo" v={c.nome_cooperativa ?? "—"} />
          <Field k="Recenseador" v={<RecenseadorName userId={c.created_by} />} />
        </Section>

        <Section title="Contato">
          <Field k="E-mail" v={showFull ? (c.email ?? "—") : maskEmail(c.email)} sensitive={!showFull} />
          <Field k="Telefone" v={showFull ? (c.telefone ?? "—") : maskPhone(c.telefone)} sensitive={!showFull} />
          <Field k="Endereço" v={showFull ? (c.endereco_completo ?? "—") : maskAddress(c.endereco_completo)} sensitive={!showFull} />
        </Section>

        <Section title="Documentação">
          <Field k="Título de Eleitor" v={showFull ? (c.titulo_eleitor ?? "—") : maskDocument(c.titulo_eleitor)} sensitive={!showFull} />
          <Field k="CTPS" v={showFull ? (c.ctps ?? "—") : maskDocument(c.ctps)} sensitive={!showFull} />
          <Field k="NIS" v={showFull ? (c.nis ?? "—") : maskDocument(c.nis)} sensitive={!showFull} />
        </Section>

        <Section title="Socioeconômico">
          <Field k="Renda média mensal" v={`R$ ${Number(c.renda_media_mensal).toFixed(2)}`} />
          <Field k="Contribui com INSS" v={c.contribui_inss ? "Sim" : "Não"} />
          <Field k="CadÚnico" v={c.inscrito_cadunico ? "Sim" : "Não"} />
          <Field k="Bolsa Família" v={c.possui_bolsa_familia ? "Sim" : "Não"} />
          <Field k="Conta bancária digital" v={c.conta_bancaria_digital ?? "—"} />
          <Field k="Cadastro gov.br" v={c.cadastro_gov_br ? `Sim (${c.nivel_cadastro_gov_br ?? "—"})` : "Não"} />
        </Section>

        <Section title="Coleta" className="lg:col-span-2">
          <Field k="Materiais coletados" v={
            <div className="flex flex-wrap gap-1.5">
              {(c.materiais_coletados as string[]).map((m: string) => (
                <Badge key={m} variant="secondary">{m}</Badge>
              ))}
            </div>
          } />
          <Field k="Possui carroça" v={c.possui_carroca ? `Sim (${c.tipo_carroca ?? "—"})` : "Não"} />
          <Field k="Área de atuação" v={c.area_atuacao ?? "—"} />
        </Section>

        <Section title="Documentos anexados" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DocPreview label="Comprovante de residência" path={c.comprovante_residencia_url} />
            <DocPreview label="CPF" path={c.cpf_foto_url} />
            <DocPreview label="RG / CIN" path={c.rg_cin_foto_url} />
            <DocPreview label="Título de Eleitor" path={c.titulo_eleitor_foto_url} />
            <DocPreview label="CTPS" path={c.ctps_foto_url} />
            <DocPreview label="NIS" path={c.nis_foto_url} />
          </div>
        </Section>

        <Section title="Histórico de alterações" className="lg:col-span-2">
          <AuditTrail recordId={id} />
        </Section>
      </div>
    </AdminShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-success/15 text-success border-success/30",
    pendente: "bg-warning/20 text-warning-foreground border-warning/40",
    inativo: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-xl border border-border shadow-card p-6 ${className}`}>
      <h2 className="font-semibold text-primary mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ k, v, sensitive = false }: { k: string; v: React.ReactNode; sensitive?: boolean }) {
  void sensitive;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 text-sm">
      <div className="text-muted-foreground">{k}</div>
      <div className="sm:col-span-2 font-medium break-words">{v}</div>
    </div>
  );
}

function DocPreview({ label, path }: { label: string; path: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["doc-url", path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("catadores-docs")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
  });

  const isPdf = !!path && path.toLowerCase().endsWith(".pdf");

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
      <div className="px-3 py-2 text-xs font-medium border-b border-border bg-card">{label}</div>
      {!path ? (
        <div className="aspect-[4/3] grid place-items-center text-xs text-muted-foreground">Não anexado</div>
      ) : !url ? (
        <div className="aspect-[4/3] grid place-items-center text-xs text-muted-foreground">Carregando...</div>
      ) : isPdf ? (
        <a href={url} target="_blank" rel="noreferrer" className="aspect-[4/3] grid place-items-center text-sm text-primary underline">
          Abrir PDF
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={label} className="w-full aspect-[4/3] object-cover hover:opacity-90 transition" />
        </a>
      )}
    </div>
  );
}

function AuditTrail({ recordId }: { recordId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit", "catadores", recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, actor_id, new_data, old_data")
        .eq("table_name", "catadores")
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.actor_id).filter(Boolean)));
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", ids as string[]);
        for (const p of profiles ?? []) {
          names[p.user_id] = p.full_name || p.email || p.user_id;
        }
      }
      return (data ?? []).map((r: any) => ({ ...r, actor_name: r.actor_id ? names[r.actor_id] ?? r.actor_id : "Sistema" }));
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>;

  const ACTION_LABEL: Record<string, { label: string; tone: string }> = {
    INSERT: { label: "Criado", tone: "bg-success/15 text-success border-success/30" },
    UPDATE: { label: "Editado", tone: "bg-primary/10 text-primary border-primary/30" },
    DELETE: { label: "Excluído", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  };

  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {data.map((e) => {
        const meta = ACTION_LABEL[e.action] ?? { label: e.action, tone: "" };
        const changes: string[] = [];
        if (e.action === "UPDATE" && e.old_data && e.new_data) {
          for (const k of Object.keys(e.new_data)) {
            if (["updated_at", "updated_by"].includes(k)) continue;
            const a = JSON.stringify(e.old_data[k]);
            const b = JSON.stringify(e.new_data[k]);
            if (a !== b) changes.push(k);
          }
        }
        return (
          <li key={e.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary border-2 border-background" />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className={meta.tone}>
                <History className="size-3 mr-1" /> {meta.label}
              </Badge>
              <span className="font-medium">{e.actor_name}</span>
              <span className="text-muted-foreground">
                {new Date(e.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            {changes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Campos alterados: {changes.join(", ")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

