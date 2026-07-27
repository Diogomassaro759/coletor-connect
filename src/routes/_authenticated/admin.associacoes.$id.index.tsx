import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CalendarDays,
  ClipboardPlus,
  FileCheck2,
  FileDown,
  FolderOpen,
  HardHat,
  MapPin,
  Pencil,
  Scale,
  UserPlus,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { buildAssociationReportPDF } from "@/lib/association-report";
import { FilledFormsList } from "@/components/admin/FilledFormsList";

export const Route = createFileRoute("/_authenticated/admin/associacoes/$id/")({
  head: () => ({ meta: [{ title: "Detalhes da associação — PROCATE" }] }),
  component: AssociationDetails,
});


const STATUS_LABEL = {
  regular: "Regular",
  parcialmente_regular: "Parcialmente regular",
  irregular: "Irregular",
} as const;

function AssociationDetails() {
  const { id } = Route.useParams();
  const { isAdmin, isConsultant, isCoordenador, isRecenseador, area } = Route.useRouteContext() as any;
  const isAdminLike = isAdmin || isCoordenador; // for edit/documents buttons
  const showAllModules = isAdmin; // only Admin sees 4 cards
  const navigate = useNavigate();
  const [existingPrompt, setExistingPrompt] = useState<
    | { modulo: "social" | "juridico" | "contabil" | "infraestrutura"; assessmentId: string | null }
    | null
  >(null);
  const { data: association, isLoading } = useQuery({

    queryKey: ["association", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("associations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: assessments = [] } = useQuery({
    queryKey: ["association-assessments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_assessments")
        .select(
          "id,data_visita,horario_visita,consultant_name,status,regularity_index,evidence_validated,created_at",
        )
        .eq("association_id", id)
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: existingByArea = {} } = useQuery({
    queryKey: ["association-existing-forms", id],
    queryFn: async () => {
      const [{ data: rows }, { data: infra }] = await Promise.all([
        supabase
          .from("association_assessments")
          .select("id, area")
          .eq("association_id", id),
        supabase
          .from("infrastructure_assessments")
          .select("id")
          .eq("association_id", id)
          .maybeSingle(),
      ]);
      const map: Record<string, string | null> = {};
      (rows ?? []).forEach((r: any) => {
        if (r.area) map[r.area] = r.id;
      });
      if (infra?.id) map.infraestrutura = infra.id;
      return map;
    },
  });


  if (isLoading)
    return (
      <AdminShell>
        <p className="text-muted-foreground">Carregando...</p>
      </AdminShell>
    );
  if (!association)
    return (
      <AdminShell>
        <p>Entidade não encontrada.</p>
      </AdminShell>
    );

  return (
    <AdminShell>
      <BackButton label="Voltar às entidades" fallbackTo="/admin/associacoes" forceTo="/admin/associacoes" className="mb-5" />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 border-b border-border pb-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary">
              {association.tipo === "formal" ? "Formal" : "Informal"}
            </Badge>


          </div>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight">{association.nome}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4" /> {association.municipio}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isAdminLike || isConsultant) && (
            <>
              <Link to="/admin/associacoes/$id/documentos" params={{ id }}>
                <Button size="lg" variant="outline">
                  <FolderOpen className="size-4" /> Documentos
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={async () => {
                  try {
                    const [{ data: catadores }, { data: documents }] = await Promise.all([
                      supabase.from("catadores").select("id, genero").eq("association_id", id),
                      supabase
                        .from("association_documents")
                        .select("category, title, issued_at, expires_at")
                        .eq("association_id", id),
                    ]);
                    buildAssociationReportPDF({
                      association,
                      assessments,
                      catadores: catadores ?? [],
                      documents: documents ?? [],
                    });
                  } catch (err: any) {
                    toast.error(err.message ?? "Falha ao gerar relatório");
                  }
                }}
              >
                <FileDown className="size-4" /> Relatório PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {(isConsultant || isAdmin || isCoordenador) && (() => {
        const MODULE_STYLES = {
          social: {
            titulo: "Social",
            descricao: "Perfil socioeconômico, composição e vulnerabilidades da entidade.",
            Icon: Users2,
            accent: "bg-[hsl(217_91%_55%)]",
            iconBg: "bg-[hsl(217_91%_96%)]",
            iconText: "text-[hsl(217_91%_45%)]",
            iconHover: "group-hover:bg-[hsl(217_91%_55%)] group-hover:text-white",
            button: "bg-[hsl(217_91%_50%)] hover:bg-[hsl(217_91%_42%)] focus-visible:ring-[hsl(217_91%_85%)]",
          },
          juridico: {
            titulo: "Jurídico",
            descricao: "Documentação legal, estatutos e regularidade institucional.",
            Icon: Scale,
            accent: "bg-[hsl(243_75%_60%)]",
            iconBg: "bg-[hsl(243_75%_96%)]",
            iconText: "text-[hsl(243_75%_50%)]",
            iconHover: "group-hover:bg-[hsl(243_75%_60%)] group-hover:text-white",
            button: "bg-[hsl(243_75%_58%)] hover:bg-[hsl(243_75%_50%)] focus-visible:ring-[hsl(243_75%_88%)]",
          },
          contabil: {
            titulo: "Contábil",
            descricao: "Escrituração, tributos, fluxo financeiro e obrigações fiscais.",
            Icon: Wallet,
            accent: "bg-[hsl(173_68%_39%)]",
            iconBg: "bg-[hsl(173_68%_94%)]",
            iconText: "text-[hsl(173_68%_32%)]",
            iconHover: "group-hover:bg-[hsl(173_68%_39%)] group-hover:text-white",
            button: "bg-[hsl(173_68%_36%)] hover:bg-[hsl(173_68%_30%)] focus-visible:ring-[hsl(173_60%_85%)]",
          },
          infraestrutura: {
            titulo: "Infraestrutura",
            descricao: "Sede, equipamentos, veículos e condições operacionais.",
            Icon: HardHat,
            accent: "bg-[hsl(38_92%_50%)]",
            iconBg: "bg-[hsl(38_92%_95%)]",
            iconText: "text-[hsl(32_95%_44%)]",
            iconHover: "group-hover:bg-[hsl(38_92%_50%)] group-hover:text-white",
            button: "bg-[hsl(32_95%_48%)] hover:bg-[hsl(28_92%_42%)] focus-visible:ring-[hsl(38_92%_85%)]",
          },
        } as const;
        const chaves: Array<"social" | "juridico" | "contabil" | "infraestrutura"> = isAdmin
          ? ["social", "juridico", "contabil", "infraestrutura"]
          : [((area ?? "social") as any)];
        return (
          <section className="mb-8">
            <div className="mb-6 flex flex-col gap-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Formulários de campo
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {isAdmin ? "Formulários por área" : "Formulário da sua área"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Abra o formulário de qualquer área desta entidade."
                  : "Abre diretamente o formulário da sua área de atuação."}
              </p>
            </div>
            <div className={isAdmin ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"}>
              {chaves.map((k) => {
                const m = MODULE_STYLES[k];
                const Icon = m.Icon;
                return (
                  <div
                    key={k}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <span className={`absolute inset-x-0 top-0 h-1 ${m.accent}`} aria-hidden />
                    <div className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-colors ${m.iconBg} ${m.iconText} ${m.iconHover}`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{m.titulo}</h3>
                    <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{m.descricao}</p>
                    <div className="mt-auto">
                      {(() => {
                        // Social é criado junto com a entidade — sempre considerado preenchido
                        const jaExiste = k === "social" || existingByArea[k] !== undefined;
                        return (
                          <button
                            type="button"
                            disabled={jaExiste}
                            onClick={() => {
                              if (jaExiste) return;
                              navigate({
                                to: "/admin/associacoes/$id/diagnostico/novo",
                                params: { id },
                                search: { modulo: k },
                              });
                            }}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                              jaExiste
                                ? "cursor-not-allowed bg-muted text-muted-foreground opacity-70"
                                : `hover:shadow-md ${m.button}`
                            }`}
                          >
                            {jaExiste ? "Formulário já preenchido" : (
                              <>
                                Abrir formulário <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      <AlertDialog
        open={!!existingPrompt}
        onOpenChange={(open) => {
          if (!open) setExistingPrompt(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-center text-lg">
              Formulário já preenchido
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Já existe um formulário{" "}
              <span className="font-medium text-foreground">
                {existingPrompt
                  ? existingPrompt.modulo === "infraestrutura"
                    ? "de Infraestrutura"
                    : existingPrompt.modulo === "social"
                      ? "Social"
                      : existingPrompt.modulo === "juridico"
                        ? "Jurídico"
                        : "Contábil"
                  : ""}
              </span>{" "}
              para esta entidade. Deseja editar o formulário existente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="mt-0">Não, voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!existingPrompt) return;
                const { modulo, assessmentId } = existingPrompt;
                setExistingPrompt(null);
                if (modulo === "infraestrutura") {
                  navigate({
                    to: "/admin/associacoes/$id/diagnostico/novo",
                    params: { id },
                    search: { modulo },
                  });
                } else if (assessmentId) {
                  navigate({
                    to: "/admin/associacoes/$id/diagnostico/$assessmentId",
                    params: { id, assessmentId },
                    search: { mode: "edit" },
                  });
                }
              }}
            >
              Sim, editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <FilledFormsList associationId={id} />
    </AdminShell>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function DiagnosticModule({
  id,
  module,
  icon: Icon,
  title,
  description,
  tone,
}: {
  id: string;
  module: "social" | "juridico" | "contabil";
  icon: typeof Users;
  title: string;
  description: string;
  tone: "secondary" | "primary" | "warning";
}) {
  const toneClass =
    tone === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : tone === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-primary text-primary-foreground";
  return (
    <Link
      to="/admin/associacoes/$id/diagnostico/novo"
      params={{ id }}
      search={{ modulo: module }}
      className="group rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
    >
      <div className={`mb-3 grid size-10 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" />
      </div>
      <h3 className="font-display font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">
        Abrir formulário →
      </p>
    </Link>
  );
}
