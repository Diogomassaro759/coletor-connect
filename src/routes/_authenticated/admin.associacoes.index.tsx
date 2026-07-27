import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, ClipboardPlus, Download, Eye, HardHat, Lock, MoreHorizontal, Pencil, Plus, Scale, Search, Trash2, Users, Users2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listAssociationsWithSocial } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/associacoes/")({
  head: () => ({ meta: [{ title: "Associações — PROCATE" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    abrir: s.abrir === "1" ? ("1" as const) : undefined,
  }),
  component: AssociationsPage,
});

const TIPO_LABEL: Record<string, string> = {
  associacao: "Associação",
  cooperativa: "Cooperativa",
  coletivo: "Coletivo",
  formal: "Associação",
  informal: "Coletivo",
};

const SITUACAO_LABEL: Record<string, string> = {
  regular: "Regular",
  parcialmente_regular: "Parcialmente regular",
  irregular: "Irregular",
};

const SITUACAO_TONE: Record<string, string> = {
  regular: "border-success/40 text-success",
  parcialmente_regular: "border-warning/50 text-warning-foreground",
  irregular: "border-destructive/40 text-destructive",
};

function AssociationsPage() {
  const { isAdmin, isConsultant, isCoordenador, area, user } = Route.useRouteContext() as any;
  const searchParams = Route.useSearch() as { abrir?: "1" };
  const currentUserId: string | undefined = user?.id;
  const isViewer = isConsultant || isCoordenador;
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [entitySearch, setEntitySearch] = useState("");
  const [pendingModulo, setPendingModulo] = useState<"social" | "juridico" | "contabil" | "infraestrutura" | null>(null);
  const [existingPrompt, setExistingPrompt] = useState<
    | { modulo: "social" | "juridico" | "contabil" | "infraestrutura"; associationId: string; assessmentId: string | null; ownerId: string | null }
    | null
  >(null);
  const canEditExistingPrompt =
    !!existingPrompt &&
    (isAdmin ||
      isCoordenador ||
      (isConsultant &&
        existingPrompt.modulo !== "social" &&
        (!existingPrompt.ownerId || existingPrompt.ownerId === currentUserId)));

  const [tipoFilter, setTipoFilter] = useState<"todas" | "cooperativa" | "associacao" | "coletivo">("todas");
  const [municipioFilter, setMunicipioFilter] = useState<string>("todos");
  const navigate = useNavigate();
  const listSocialAssociations = useServerFn(listAssociationsWithSocial);

  useEffect(() => {
    if (
      searchParams.abrir === "1" &&
      isConsultant &&
      area &&
      area !== "social" &&
      !pendingModulo
    ) {
      setSelectedEntity("");
      setPendingModulo(area as "juridico" | "contabil" | "infraestrutura");
      navigate({ to: "/admin/associacoes", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.abrir, isConsultant, area]);

  const qc = useQueryClient();
  const deleteAssociationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("associations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entidade excluída.");
      qc.invalidateQueries({ queryKey: ["associations"] });
      qc.invalidateQueries({ queryKey: ["associations-latest-assessment"] });
      qc.invalidateQueries({ queryKey: ["associations-with-social"] });
      qc.invalidateQueries({ queryKey: ["area-forms-by-association"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const { data: associations = [], isLoading } = useQuery({
    queryKey: ["associations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("associations").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: latestAssessments = [] } = useQuery({
    queryKey: ["associations-latest-assessment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_assessments")
        .select("association_id,status,data_visita,created_at")
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: socialAssocIds = [] } = useQuery({
    queryKey: ["associations-with-social"],
    queryFn: () => listSocialAssociations(),
  });

  const socialSet = useMemo(() => new Set((socialAssocIds ?? []) as string[]), [socialAssocIds]);

  // Existing forms for the current user's area, so "Editar formulário" can be offered.
  const areaKey = ((area ?? "social") as string);
  const { data: areaForms = [] } = useQuery({
    queryKey: ["area-forms-by-association", areaKey],
    queryFn: async () => {
      if (areaKey === "infraestrutura") {
        const { data, error } = await supabase
          .from("infrastructure_assessments")
          .select("id,association_id,consultant_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as any[];
      }
      const { data, error } = await supabase
        .from("association_assessments")
        .select("id,association_id,area,consultant_id,created_by")
        .eq("area", areaKey as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const areaFormByAssoc = useMemo(() => {
    const map = new Map<string, { id: string; ownerId: string | null }>();
    for (const f of areaForms as any[]) {
      if (!map.has(f.association_id))
        map.set(f.association_id, { id: f.id, ownerId: f.consultant_id ?? f.created_by ?? null });
    }
    return map;
  }, [areaForms]);

  const latestByAssoc = useMemo(() => {
    const map = new Map<string, { status: string | null; data_visita: string | null }>();
    for (const a of latestAssessments as any[]) {
      if (!map.has(a.association_id))
        map.set(a.association_id, { status: a.status, data_visita: a.data_visita });
    }
    return map;
  }, [latestAssessments]);

  const municipios = useMemo(() => {
    const set = new Set<string>();
    for (const a of associations as any[]) if (a.municipio) set.add(a.municipio);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [associations]);

  const tipoMatches = (item: any, f: string) => {
    if (f === "todas") return true;
    if (f === "cooperativa") return item.tipo === "cooperativa";
    if (f === "associacao") return item.tipo === "associacao" || item.tipo === "formal";
    if (f === "coletivo") return item.tipo === "coletivo" || item.tipo === "informal";
    return true;
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (associations as any[]).filter((item) => {
      if (!tipoMatches(item, tipoFilter)) return false;
      if (municipioFilter !== "todos" && item.municipio !== municipioFilter) return false;
      if (!term) return true;
      return `${item.nome} ${item.municipio} ${item.cnpj ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [associations, search, tipoFilter, municipioFilter]);

  const entityStats = useMemo(() => {
    const all = associations as any[];
    return {
      total: all.length,
      cooperativa: all.filter((a) => tipoMatches(a, "cooperativa")).length,
      associacao: all.filter((a) => tipoMatches(a, "associacao")).length,
      coletivo: all.filter((a) => tipoMatches(a, "coletivo")).length,
    };
  }, [associations]);


  async function exportAssociations() {
    if (!filtered.length) return toast.info("Nenhuma entidade para exportar.");
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Entidades", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Nome", key: "nome" },
      { header: "Tipo", key: "tipo" },
      { header: "CNPJ", key: "cnpj" },
      { header: "Município", key: "municipio" },
      { header: "Associados", key: "atuais" },
      { header: "Situação", key: "situacao" },
    ];
    filtered.forEach((item) => {
      const latest = latestByAssoc.get(item.id);
      const situacao = latest?.status ? SITUACAO_LABEL[latest.status] : "Sem diagnóstico";
      sheet.addRow({
        nome: item.nome,
        tipo: TIPO_LABEL[item.tipo] ?? item.tipo,
        cnpj: item.cnpj ?? "",
        municipio: item.municipio,
        atuais: item.numero_associados_atual,
        situacao,
      });
    });

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    sheet.columns.forEach((column) => {
      let width = 12;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        width = Math.max(width, String(cell.value ?? "").length + 2);
      });
      column.width = Math.min(width, 60);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `entidades-procate-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const areaForForm = (area ?? "social") as "social" | "juridico" | "contabil" | "infraestrutura";

  const moduloLabel: Record<string, string> = {
    social: "Formulário Social",
    juridico: "Formulário Jurídico",
    contabil: "Formulário Contábil",
    infraestrutura: "Formulário de Infraestrutura",
  };

  const areaSuffix: Record<string, string> = {
    social: "SOCIAL",
    juridico: "JURÍDICO",
    contabil: "CONTÁBIL",
    infraestrutura: "INFRAESTRUTURA",
  };

  const isAdminLike = isAdmin || isCoordenador;
  const profileSuffix = isAdmin
    ? "ADMINISTRADOR"
    : isCoordenador
      ? "COORDENADOR"
      : isConsultant
        ? (areaSuffix[areaForForm] ?? "SOCIAL")
        : "RECENSEADOR";

  const pageTitle = isAdminLike ? "Entidades" : `ASSOC./COOP./COLETIVOS – ${profileSuffix}`;

  return (
    <AdminShell>
      <BackButton className="mb-4" />

      
      {!isAdminLike && (() => {
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
        const m = MODULE_STYLES[areaForForm];
        const Icon = m.Icon;
        return (
          <section className="mb-8">
            <div className="mb-6 flex flex-col gap-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Formulário de campo
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{moduloLabel[areaForForm]}</h2>
              <p className="text-sm text-muted-foreground">
                {areaForForm === "social"
                  ? "Abra um cadastro vazio para registrar uma nova entidade."
                  : "Selecione uma entidade na lista abaixo para abrir o formulário da sua área."}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <span className={`absolute inset-x-0 top-0 h-1 ${m.accent}`} aria-hidden />
                <div className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-colors ${m.iconBg} ${m.iconText} ${m.iconHover}`}>
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{m.titulo}</h3>
                <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{m.descricao}</p>
                <div className="mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (areaForForm === "social") {
                        navigate({ to: "/admin/associacoes/nova" });
                        return;
                      }
                      setSelectedEntity("");
                      setPendingModulo(areaForForm);
                    }}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${m.button}`}
                  >
                    Abrir formulário <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {isAdminLike && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie cadastros, filtre e exporte dados.
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="lg" onClick={exportAssociations}>
                <Download className="size-4" /> Exportar planilha
              </Button>
              <Link to="/admin/associacoes/nova">
                <Button size="lg">
                  <Plus className="size-4" /> Nova entidade
                </Button>
              </Link>
            </div>
          )}
          {isCoordenador && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="lg" onClick={exportAssociations}>
                <Download className="size-4" /> Exportar planilha
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <EntityStatCard icon={Building2} label="Total" value={entityStats.total} tone="primary" />
        <EntityStatCard icon={Users} label="Cooperativa" value={entityStats.cooperativa} tone="success" />
        <EntityStatCard icon={Users} label="Associação" value={entityStats.associacao} tone="success" />
        <EntityStatCard icon={Users} label="Coletivo" value={entityStats.coletivo} tone="warning" />
      </div>

      <div className="mb-3 flex items-center gap-3">

        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, município ou CNPJ"
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} entidades</Badge>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          { key: "todas", label: "TODAS" },
          { key: "cooperativa", label: "COOPERATIVA" },
          { key: "associacao", label: "ASSOCIAÇÃO" },
          { key: "coletivo", label: "COLETIVO" },
        ] as const).map((c) => {
          const active = tipoFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setTipoFilter(c.key)}
              className={
                "rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide transition-colors " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted")
              }
            >
              {c.label}
            </button>
          );
        })}
        <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
          <SelectTrigger className="h-8 w-[220px] rounded-full border-primary/40 text-xs font-bold uppercase tracking-wide text-primary">
            <SelectValue placeholder="SELECIONE O MUNICÍPIO" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os municípios</SelectItem>
            {municipios.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      {isAdminLike && (
        <section className="mb-8">
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Formulários de campo
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Formulários por área</h2>
            <p className="text-sm text-muted-foreground">
              Selecione o módulo para preenchimento dos diagnósticos institucionais.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(([
              {
                key: "social",
                titulo: "Social",
                descricao: "Perfil socioeconômico, composição e vulnerabilidades da entidade.",
                Icon: Users2,
                accent: "bg-[hsl(217_91%_55%)]",
                iconBg: "bg-[hsl(217_91%_96%)]",
                iconText: "text-[hsl(217_91%_45%)]",
                iconHover: "group-hover:bg-[hsl(217_91%_55%)] group-hover:text-white",
                button: "bg-[hsl(217_91%_50%)] hover:bg-[hsl(217_91%_42%)] focus-visible:ring-[hsl(217_91%_85%)]",
              },
              {
                key: "juridico",
                titulo: "Jurídico",
                descricao: "Documentação legal, estatutos e regularidade institucional.",
                Icon: Scale,
                accent: "bg-[hsl(243_75%_60%)]",
                iconBg: "bg-[hsl(243_75%_96%)]",
                iconText: "text-[hsl(243_75%_50%)]",
                iconHover: "group-hover:bg-[hsl(243_75%_60%)] group-hover:text-white",
                button: "bg-[hsl(243_75%_58%)] hover:bg-[hsl(243_75%_50%)] focus-visible:ring-[hsl(243_75%_88%)]",
              },
              {
                key: "contabil",
                titulo: "Contábil",
                descricao: "Escrituração, tributos, fluxo financeiro e obrigações fiscais.",
                Icon: Wallet,
                accent: "bg-[hsl(173_68%_39%)]",
                iconBg: "bg-[hsl(173_68%_94%)]",
                iconText: "text-[hsl(173_68%_32%)]",
                iconHover: "group-hover:bg-[hsl(173_68%_39%)] group-hover:text-white",
                button: "bg-[hsl(173_68%_36%)] hover:bg-[hsl(173_68%_30%)] focus-visible:ring-[hsl(173_60%_85%)]",
              },
              {
                key: "infraestrutura",
                titulo: "Infraestrutura",
                descricao: "Sede, equipamentos, veículos e condições operacionais.",
                Icon: HardHat,
                accent: "bg-[hsl(38_92%_50%)]",
                iconBg: "bg-[hsl(38_92%_95%)]",
                iconText: "text-[hsl(32_95%_44%)]",
                iconHover: "group-hover:bg-[hsl(38_92%_50%)] group-hover:text-white",
                button: "bg-[hsl(32_95%_48%)] hover:bg-[hsl(28_92%_42%)] focus-visible:ring-[hsl(38_92%_85%)]",
              },
            ] as const).filter((m) => isAdmin || !isCoordenador || m.key === areaForForm)).map((m) => {
              const Icon = m.Icon;
              return (
                <div
                  key={m.key}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${m.accent}`} aria-hidden />
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-colors ${m.iconBg} ${m.iconText} ${m.iconHover}`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">{m.titulo}</h3>
                  <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{m.descricao}</p>
                  <div className="mt-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (m.key === "social") {
                          navigate({ to: "/admin/associacoes/nova" });
                          return;
                        }
                        setSelectedEntity("");
                        setPendingModulo(m.key);
                      }}
                      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus-visible:ring-4 active:scale-[0.98] ${m.button}`}
                    >
                      Abrir formulário
                      <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Dialog
        open={!!pendingModulo}
        onOpenChange={(open) => {
          if (!open) {
            setPendingModulo(null);
            setSelectedEntity("");
            setEntitySearch("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Escolha a entidade
              {pendingModulo ? ` — ${moduloLabel[pendingModulo]}` : ""}
            </DialogTitle>
            <DialogDescription>
              Selecione a entidade para abrir o formulário correspondente.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Buscar por nome ou município"
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {(associations as any[])
              .filter((a) => {
                const term = entitySearch.trim().toLocaleLowerCase("pt-BR");
                if (!term) return true;
                return `${a.nome} ${a.municipio}`.toLocaleLowerCase("pt-BR").includes(term);
              })
              .map((a: any) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedEntity(a.id)}
                  className={
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted " +
                    (selectedEntity === a.id ? "bg-primary/10 font-medium" : "")
                  }
                >
                  <span className="truncate">{a.nome}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.municipio}</span>
                </button>
              ))}
            {(associations as any[]).filter((a) => {
              const term = entitySearch.trim().toLocaleLowerCase("pt-BR");
              if (!term) return true;
              return `${a.nome} ${a.municipio}`.toLocaleLowerCase("pt-BR").includes(term);
            }).length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma entidade encontrada.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingModulo(null);
                setSelectedEntity("");
                setEntitySearch("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedEntity || !pendingModulo}
              onClick={async () => {
                if (!selectedEntity || !pendingModulo) return;
                const modulo = pendingModulo;
                const id = selectedEntity;

                if (modulo === "infraestrutura") {
                  const { data: existing } = await supabase
                    .from("infrastructure_assessments")
                    .select("id,consultant_id")
                    .eq("association_id", id)
                    .maybeSingle();
                  if (existing?.id) {
                    setPendingModulo(null);
                    setSelectedEntity("");
                    setEntitySearch("");
                    setExistingPrompt({
                      modulo,
                      associationId: id,
                      assessmentId: null,
                      ownerId: (existing as any).consultant_id ?? null,
                    });
                    return;
                  }
                } else {
                  const { data: existing } = await supabase
                    .from("association_assessments")
                    .select("id,consultant_id,created_by")
                    .eq("association_id", id)
                    .eq("area", modulo)
                    .maybeSingle();
                  if (existing?.id) {
                    setPendingModulo(null);
                    setSelectedEntity("");
                    setEntitySearch("");
                    setExistingPrompt({
                      modulo,
                      associationId: id,
                      assessmentId: existing.id,
                      ownerId: (existing as any).consultant_id ?? (existing as any).created_by ?? null,
                    });
                    return;
                  }
                }


                setPendingModulo(null);
                setSelectedEntity("");
                setEntitySearch("");
                navigate({
                  to: "/admin/associacoes/$id/diagnostico/novo",
                  params: { id },
                  search: { modulo },
                });
              }}
            >
              Abrir formulário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                {existingPrompt ? moduloLabel[existingPrompt.modulo] : ""}
              </span>{" "}
              para esta entidade.{" "}
              {canEditExistingPrompt
                ? "Deseja editar o formulário existente?"
                : "Ele foi preenchido por outro usuário e não pode ser editado por você."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="mt-0">
              {canEditExistingPrompt ? "Não, voltar" : "Voltar"}
            </AlertDialogCancel>
            {canEditExistingPrompt && (
              <AlertDialogAction
                onClick={() => {
                  if (!existingPrompt) return;
                  const { modulo, associationId, assessmentId } = existingPrompt;
                  setExistingPrompt(null);
                  if (modulo === "infraestrutura") {
                    navigate({
                      to: "/admin/associacoes/$id",
                      params: { id: associationId },
                    });
                  } else if (assessmentId) {
                    navigate({
                      to: "/admin/associacoes/$id/diagnostico/$assessmentId",
                      params: { id: associationId, assessmentId },
                      search: { mode: "edit" },
                    });
                  }
                }}
              >
                Sim, editar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>







      <div
        id="entidades-table"
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">CNPJ</TableHead>
              <TableHead>Município</TableHead>
              <TableHead className="hidden sm:table-cell">Associados</TableHead>
              <TableHead>Usuário</TableHead>
              
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Carregando entidades...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Building2 className="mx-auto mb-3 size-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma entidade encontrada.</p>
                </TableCell>
              </TableRow>
            )}

            {filtered.map((item) => {
              return (
                <TableRow key={item.id} className="hover:bg-muted/40">
                  <TableCell>
                    <span className="font-medium">{item.nome}</span>
                    <div className="text-xs text-muted-foreground">
                      {TIPO_LABEL[item.tipo] ?? item.tipo}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {item.cnpj ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{item.municipio}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {item.numero_associados_atual ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.consultor_nome ? (
                      <span>{item.consultor_nome}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>


                  <TableCell className="text-right">
                    {(() => {
                      const form = areaFormByAssoc.get(item.id);
                      const requiresSocial = areaForForm !== "social";
                      const blocked = requiresSocial && !socialSet.has(item.id);
                      // Consultor social is view-only on filled forms.
                      const canEditForm =
                        !!form &&
                        (isAdmin ||
                          isCoordenador ||
                          (isConsultant &&
                            areaForForm !== "social" &&
                            (!form.ownerId || form.ownerId === currentUserId)));
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>

                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!form}
                              onSelect={(e) => {
                                if (!form) {
                                  e.preventDefault();
                                  return;
                                }
                                navigate({
                                  to: "/admin/associacoes/$id/diagnostico/novo",
                                  params: { id: item.id },
                                  search: {
                                    modulo: areaForForm,
                                    assessmentId: form.id,
                                    mode: "view",
                                  } as any,
                                });
                              }}
                            >
                              <Eye className="size-4 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canEditForm}
                              onSelect={(e) => {
                                if (!canEditForm || !form) {
                                  e.preventDefault();
                                  return;
                                }
                                navigate({
                                  to: "/admin/associacoes/$id/diagnostico/novo",
                                  params: { id: item.id },
                                  search: {
                                    modulo: areaForForm,
                                    assessmentId: form.id,
                                    mode: "edit",
                                  } as any,
                                });
                              }}
                            >
                              <Pencil className="size-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="size-4 mr-2" /> Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir entidade?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação é irreversível. O cadastro de{" "}
                                        <strong>{item.nome}</strong> será removido permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAssociationMutation.mutate(item.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            {!form && blocked && (
                              <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                                <Lock className="size-4 mr-2" /> Aguardando Social
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </TableCell>

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>
    </AdminShell>
  );
}

function EntityStatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
  };
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card flex items-center gap-4">
      <div className={`grid place-items-center size-12 rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
