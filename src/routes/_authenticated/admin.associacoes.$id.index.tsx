import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  ClipboardPlus,
  FileDown,
  FolderOpen,
  MapPin,
  Pencil,
  Scale,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildAssociationReportPDF } from "@/lib/association-report";

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
      <Link to="/admin/associacoes">
        <Button variant="ghost" size="sm" className="mb-5">
          <ArrowLeft className="size-4" /> Voltar às entidades
        </Button>
      </Link>
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
          {isAdminLike && (
            <Link to="/admin/associacoes/$id/editar" params={{ id }}>
              <Button size="lg" variant="outline">
                <Pencil className="size-4" /> Editar entidade
              </Button>
            </Link>
          )}
          {isRecenseador && (
            <Link to="/admin/associacoes/$id/catadores/novo" params={{ id }}>
              <Button size="lg">
                <UserPlus className="size-4" /> Cadastrar catador
              </Button>
            </Link>
          )}
          {isConsultant && area !== "infraestrutura" && (
            <Link
              to="/admin/associacoes/$id/diagnostico/novo"
              params={{ id }}
              search={{ modulo: (area ?? "social") as "social" | "juridico" | "contabil" }}
            >
              <Button size="lg" variant="outline">
                <ClipboardPlus className="size-4" /> Novo cadastro de campo
              </Button>
            </Link>
          )}
        </div>
      </div>

      {(isConsultant || isAdmin) && (() => {
        const modulos: Array<{
          key: "social" | "juridico" | "contabil" | "infraestrutura";
          titulo: string;
          descricao: string;
        }> = [
          { key: "social", titulo: "Cadastro Social", descricao: "Perfil socioeconômico e organizacional." },
          { key: "juridico", titulo: "Cadastro Jurídico", descricao: "Documentação, estatuto e regularidade jurídica." },
          { key: "contabil", titulo: "Cadastro Contábil", descricao: "Escrituração, tributos e obrigações fiscais." },
          { key: "infraestrutura", titulo: "Cadastro de Infraestrutura", descricao: "Sede, equipamentos e condições operacionais." },
        ];
        const visiveis = isAdmin ? modulos : modulos.filter((m) => m.key === (area ?? "social"));
        return (
          <section className="mb-8">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Formulários de campo
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {isAdmin ? "Cadastros por área" : "Cadastro da sua área"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? "Abra o formulário de qualquer área desta entidade."
                  : "Abre diretamente o formulário da sua área de atuação."}
              </p>
            </div>
            <div className={isAdmin ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-4"}>
              {visiveis.map((m) => (
                <div
                  key={m.key}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <div>
                    <h3 className="text-base font-semibold">{m.titulo}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{m.descricao}</p>
                  </div>
                  <Link
                    to="/admin/associacoes/$id/diagnostico/novo"
                    params={{ id }}
                    search={{ modulo: m.key }}
                    className="mt-4"
                  >
                    <Button size="sm" className="w-full">
                      <ClipboardPlus className="size-4" /> Abrir formulário
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Info
          label="Associados no início"
          value={association.numero_associados_inicial}
          icon={Users}
        />
        <Info
          label="Associados atualmente"
          value={association.numero_associados_atual}
          icon={Users}
        />
        <Info label="Diagnósticos realizados" value={assessments.length} icon={CalendarDays} />
      </div>

      <section>
        <h2 className="text-xl font-semibold">Histórico de diagnósticos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada visita mantém seu próprio retrato institucional.
        </p>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {assessments.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Nenhum diagnóstico realizado.</p>
          ) : (
            assessments.map((item) => (
              <Link
                key={item.id}
                to="/admin/associacoes/$id/diagnostico/$assessmentId"
                params={{ id, assessmentId: item.id }}
                className="flex flex-wrap items-center justify-between gap-4 py-4 transition hover:bg-muted/40"
              >
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Nome do consultor</p>
                    <p className="font-medium">{item.consultant_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Data da visita</p>
                    <p className="font-medium tabular-nums">
                      {new Date(`${item.data_visita}T12:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Horário da visita</p>
                    <p className="font-medium tabular-nums">
                      {item.horario_visita ? String(item.horario_visita).slice(0, 5) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <strong className="tabular-nums">
                    {Number(item.regularity_index).toLocaleString("pt-BR")}%
                  </strong>
                  <Badge
                    variant="outline"
                    className={
                      item.status === "regular"
                        ? "border-success/40 text-success"
                        : item.status === "irregular"
                          ? "border-destructive/40 text-destructive"
                          : "border-warning/50 text-warning-foreground"
                    }
                  >
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <Badge variant={item.evidence_validated ? "secondary" : "outline"}>
                    {item.evidence_validated ? "Concluído" : "Evidências pendentes"}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
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
