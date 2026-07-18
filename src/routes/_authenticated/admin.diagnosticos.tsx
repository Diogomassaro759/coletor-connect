import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  FileDown,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/diagnosticos")({
  beforeLoad: ({ context }) => {
    if (
      context.role !== "admin" &&
      context.role !== "consultor" &&
      context.role !== "coordenador"
    ) {
      throw redirect({ to: "/admin/associacoes" });
    }
  },

  head: () => ({ meta: [{ title: "Regularidade institucional — PROCATE" }] }),
  component: DiagnosticsDashboard,
});

const STATUS_LABEL = {
  regular: "Regular",
  parcialmente_regular: "Parcialmente regular",
  irregular: "Irregular",
} as const;

type StatusKey = keyof typeof STATUS_LABEL;

type Category = "regulares" | "atencao" | "prioritaria" | "sem_diagnostico";

const CATEGORY_META: Record<
  Category,
  { label: string; description: string; color: string; badge: string }
> = {
  regulares: {
    label: "Regulares",
    description: "Índice ≥ 80%",
    color: "hsl(var(--success, 142 71% 45%))",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  atencao: {
    label: "Atenção parcial",
    description: "Índice 50–79%",
    color: "hsl(var(--warning, 38 92% 50%))",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  prioritaria: {
    label: "Ação prioritária",
    description: "Índice < 50%",
    color: "hsl(var(--destructive))",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  sem_diagnostico: {
    label: "Sem diagnóstico",
    description: "Nunca avaliada",
    color: "hsl(var(--muted-foreground))",
    badge: "bg-muted text-muted-foreground border-border",
  },
};

function classify(index: number | null | undefined): Exclude<Category, "sem_diagnostico"> {
  const value = Number(index ?? 0);
  if (value >= 80) return "regulares";
  if (value >= 50) return "atencao";
  return "prioritaria";
}

function DiagnosticsDashboard() {
  const [periodDays, setPeriodDays] = useState<string>("365");
  const [municipality, setMunicipality] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [categoryFilter, setCategoryFilter] = useState<Category | "__all__">("__all__");
  const [search, setSearch] = useState("");

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["diagnostics-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_assessments")
        .select(
          "id,association_id,data_visita,status,regularity_index,regularity_compliant_count,regularity_total_count,evidence_validated,created_at,associations(nome,municipio)",
        )
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allAssociations = [] } = useQuery({
    queryKey: ["associations-for-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id,nome,municipio");
      if (error) throw error;
      return data ?? [];
    },
  });

  const municipalities = useMemo(() => {
    const set = new Set<string>();
    allAssociations.forEach((a) => a.municipio && set.add(a.municipio));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allAssociations]);

  const periodCutoff = useMemo(() => {
    if (periodDays === "all") return null;
    const days = Number(periodDays);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [periodDays]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      if (periodCutoff && new Date(`${item.data_visita}T12:00:00`) < periodCutoff) return false;
      if (municipality !== "__all__" && item.associations?.municipio !== municipality) return false;
      if (statusFilter !== "__all__" && item.status !== statusFilter) return false;
      return true;
    });
  }, [assessments, periodCutoff, municipality, statusFilter]);

  // Latest assessment per association
  const latestByAssoc = useMemo(() => {
    const map = new Map<string, (typeof assessments)[number]>();
    filteredAssessments.forEach((a) => {
      const current = map.get(a.association_id);
      if (!current || new Date(a.data_visita) > new Date(current.data_visita)) {
        map.set(a.association_id, a);
      }
    });
    return map;
  }, [filteredAssessments]);

  // Per-association rows including "sem diagnóstico"
  const associationRows = useMemo(() => {
    const filteredAssociations = allAssociations.filter(
      (a) => municipality === "__all__" || a.municipio === municipality,
    );
    return filteredAssociations.map((a) => {
      const latest = latestByAssoc.get(a.id);
      const category: Category = latest ? classify(latest.regularity_index) : "sem_diagnostico";
      return {
        id: a.id,
        nome: a.nome,
        municipio: a.municipio,
        latest,
        category,
      };
    });
  }, [allAssociations, latestByAssoc, municipality]);

  const validated = filteredAssessments.filter((a) => a.evidence_validated);
  const averageIndex = validated.length
    ? validated.reduce((s, a) => s + Number(a.regularity_index), 0) / validated.length
    : 0;
  const pendingEvidence = filteredAssessments.filter((a) => !a.evidence_validated).length;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const staleAssociations = associationRows.filter((row) => {
    if (!row.latest) return true;
    return new Date(row.latest.data_visita) < ninetyDaysAgo;
  }).length;

  const categoryCounts: Record<Category, number> = {
    regulares: 0,
    atencao: 0,
    prioritaria: 0,
    sem_diagnostico: 0,
  };
  associationRows.forEach((r) => {
    categoryCounts[r.category] += 1;
  });

  const pieData = (Object.keys(CATEGORY_META) as Category[]).map((key) => ({
    name: CATEGORY_META[key].label,
    value: categoryCounts[key],
    color: CATEGORY_META[key].color,
    key,
  }));

  // Evolution (last 12 months)
  const evolutionData = useMemo(() => {
    const now = new Date();
    const months: Array<{ key: string; label: string; sum: number; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        sum: 0,
        count: 0,
      });
    }
    assessments
      .filter((a) => a.evidence_validated)
      .forEach((a) => {
        const d = new Date(`${a.data_visita}T12:00:00`);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const slot = months.find((m) => m.key === key);
        if (slot) {
          slot.sum += Number(a.regularity_index);
          slot.count += 1;
        }
      });
    return months.map((m) => ({
      month: m.label,
      indice: m.count ? Math.round((m.sum / m.count) * 10) / 10 : null,
    }));
  }, [assessments]);

  // Top municípios com pior média
  const worstMunicipalities = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();
    associationRows.forEach((row) => {
      if (!row.latest || !row.municipio) return;
      const g = grouped.get(row.municipio) ?? { sum: 0, count: 0 };
      g.sum += Number(row.latest.regularity_index);
      g.count += 1;
      grouped.set(row.municipio, g);
    });
    return Array.from(grouped.entries())
      .map(([municipio, g]) => ({
        municipio,
        indice: Math.round((g.sum / g.count) * 10) / 10,
        total: g.count,
      }))
      .sort((a, b) => a.indice - b.indice)
      .slice(0, 6);
  }, [associationRows]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return associationRows
      .filter((r) => categoryFilter === "__all__" || r.category === categoryFilter)
      .filter(
        (r) =>
          !term ||
          r.nome?.toLowerCase().includes(term) ||
          r.municipio?.toLowerCase().includes(term),
      )
      .sort((a, b) => {
        // sem diagnóstico fica por último; depois pior índice primeiro
        if (a.category === "sem_diagnostico" && b.category !== "sem_diagnostico") return 1;
        if (b.category === "sem_diagnostico" && a.category !== "sem_diagnostico") return -1;
        const ai = a.latest ? Number(a.latest.regularity_index) : 0;
        const bi = b.latest ? Number(b.latest.regularity_index) : 0;
        return ai - bi;
      });
  }, [associationRows, categoryFilter, search]);

  async function exportDashboard() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Regularidade");
    sheet.columns = [
      { header: "Associação", key: "entity", width: 40 },
      { header: "Município", key: "city", width: 24 },
      { header: "Categoria", key: "category", width: 22 },
      { header: "Índice (%)", key: "index", width: 14 },
      { header: "Critérios", key: "criteria", width: 14 },
      { header: "Status", key: "status", width: 22 },
      { header: "Última visita", key: "date", width: 16 },
      { header: "Evidências", key: "evidence", width: 16 },
    ];
    visibleRows.forEach((row) =>
      sheet.addRow({
        entity: row.nome ?? "—",
        city: row.municipio ?? "—",
        category: CATEGORY_META[row.category].label,
        index: row.latest ? Number(row.latest.regularity_index) : "",
        criteria: row.latest
          ? `${row.latest.regularity_compliant_count}/${row.latest.regularity_total_count}`
          : "",
        status: row.latest ? STATUS_LABEL[row.latest.status as StatusKey] : "Sem diagnóstico",
        date: row.latest
          ? new Date(`${row.latest.data_visita}T12:00:00`).toLocaleDateString("pt-BR")
          : "—",
        evidence: row.latest ? (row.latest.evidence_validated ? "Validadas" : "Pendentes") : "—",
      }),
    );
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `regularidade-procate-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Painel de regularidade
          </p>
          <h1 className="mt-1 text-3xl font-bold">Acompanhamento institucional</h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe o índice de regularidade das associações e priorize visitas técnicas.
          </p>
        </div>
        <Button variant="outline" onClick={exportDashboard} disabled={!visibleRows.length}>
          <FileDown className="size-4" /> Exportar consolidado
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Município</label>
          <Select value={municipality} onValueChange={setMunicipality}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os municípios</SelectItem>
              {municipalities.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Status do diagnóstico
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="parcialmente_regular">Parcialmente regular</SelectItem>
              <SelectItem value="irregular">Irregular</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Buscar associação
          </label>
          <Input
            placeholder="Nome ou município"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cards resumo */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={BarChart3}
          label="Índice médio de regularidade"
          value={`${averageIndex.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          hint={`${validated.length} diagnósticos validados`}
        />
        <Metric
          icon={Building2}
          label="Diagnósticos no período"
          value={filteredAssessments.length}
        />
        <Metric icon={Clock3} label="Evidências pendentes" value={pendingEvidence} />
        <Metric
          icon={ShieldAlert}
          label="Sem diagnóstico há 90+ dias"
          value={staleAssociations}
        />
      </div>

      {/* Categorias clicáveis */}
      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(CATEGORY_META) as Category[]).map((key) => {
          const meta = CATEGORY_META[key];
          const active = categoryFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(active ? "__all__" : key)}
              className={`rounded-xl border bg-card p-4 text-left transition ${
                active
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="text-2xl font-bold tabular-nums">{categoryCounts[key]}</span>
              </div>
              <p className="mt-2 font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </button>
          );
        })}
      </div>

      {/* Gráficos */}
      <section className="mb-8 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Distribuição por categoria">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {pieData.map((d) => (
              <span key={d.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                {d.name} · <strong>{d.value}</strong>
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Evolução do índice médio (12 meses)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip formatter={(v) => (v == null ? "—" : `${v}%`)} />
              <Line
                type="monotone"
                dataKey="indice"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mb-8">
        <ChartCard
          title="Municípios com índice mais baixo"
          subtitle="Ordene visitas técnicas a partir das médias mais críticas."
          icon={TrendingDown}
        >
          {worstMunicipalities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem dados suficientes para o ranking.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, worstMunicipalities.length * 38)}>
              <BarChart data={worstMunicipalities} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="municipio"
                  width={140}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RechartsTooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="indice" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Lista detalhada */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Associações</h2>
            <p className="text-sm text-muted-foreground">
              {visibleRows.length} resultado{visibleRows.length === 1 ? "" : "s"}
              {categoryFilter !== "__all__"
                ? ` na categoria “${CATEGORY_META[categoryFilter].label}”`
                : ""}
              .
            </p>
          </div>
          <Link to="/admin/associacoes">
            <Button variant="ghost">Ver associações</Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-muted-foreground">Carregando indicadores...</p>
        ) : visibleRows.length === 0 ? (
          <div className="py-14 text-center">
            <ShieldAlert className="mx-auto mb-3 size-9 text-muted-foreground" />
            <p className="font-medium">Nenhuma associação encontrada</p>
            <p className="text-sm text-muted-foreground">
              Ajuste os filtros ou aguarde a primeira visita.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {visibleRows.map((row) => {
              const meta = CATEGORY_META[row.category];
              const content = (
                <div className="grid gap-3 py-4 transition hover:bg-muted/40 sm:grid-cols-[1fr_120px_180px_140px_120px] sm:items-center">
                  <div>
                    <p className="font-medium">{row.nome ?? "Associação"}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.municipio ?? "—"}
                      {row.latest
                        ? ` · ${new Date(`${row.latest.data_visita}T12:00:00`).toLocaleDateString("pt-BR")}`
                        : " · sem visita registrada"}
                    </p>
                  </div>
                  <strong className="text-xl tabular-nums">
                    {row.latest
                      ? `${Number(row.latest.regularity_index).toLocaleString("pt-BR")}%`
                      : "—"}
                  </strong>
                  <Badge variant="outline" className={meta.badge}>
                    {meta.label}
                  </Badge>
                  <Badge variant="outline">
                    {row.latest
                      ? STATUS_LABEL[row.latest.status as StatusKey]
                      : "Sem diagnóstico"}
                  </Badge>
                  <Badge variant={row.latest?.evidence_validated ? "secondary" : "outline"}>
                    {row.latest
                      ? row.latest.evidence_validated
                        ? "Evidências OK"
                        : "Evidências pendentes"
                      : "—"}
                  </Badge>
                </div>
              );
              return row.latest ? (
                <Link
                  key={row.id}
                  to="/admin/associacoes/$id/diagnostico/$assessmentId"
                  params={{ id: row.id, assessmentId: row.latest.id }}
                >
                  {content}
                </Link>
              ) : (
                <Link
                  key={row.id}
                  to="/admin/associacoes/$id"
                  params={{ id: row.id }}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 size-4 text-muted-foreground" /> : null}
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
