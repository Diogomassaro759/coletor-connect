import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserDisplayNames } from "@/lib/users.functions";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserCheck,
  UserCog,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Filter,
  Plus,
  Building2,
  ArrowRight,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  MATERIAIS_OPTIONS,
  GENERO_LABEL,
  RENDA_REFERENCIA,
} from "@/lib/catador-constants";


export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin && !context.isRecenseador && !context.isCoordenador && !context.isCoordenadorRecenseador)
      throw redirect({ to: "/admin/associacoes" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "catadores" ? "catadores" : undefined,
  }),
  head: () => ({ meta: [{ title: "Painel — RecicladoresBR" }] }),
  component: AdminDashboard,
});

type Catador = {
  id: string;
  nome_completo: string;
  cpf: string;
  genero: string;
  escolaridade: string;
  renda_media_mensal: number;
  materiais_coletados: string[];
  status: string;
  data_cadastro: string;
  nome_cooperativa: string | null;
  contribui_inss: boolean;
  inscrito_cadunico: boolean;
  possui_bolsa_familia: boolean;
  created_by: string | null;
};

function AdminDashboard() {
  const qc = useQueryClient();
  const { isAdmin, isRecenseador, isCoordenador, isCoordenadorRecenseador, user } = Route.useRouteContext() as any;
  const isAdminLike = isAdmin || isCoordenador;
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const showCatadoresScreen = routeSearch.view === "catadores";
  const setShowCatadoresScreen = (v: boolean) =>
    navigate({ to: "/admin", search: v ? { view: "catadores" as const } : {} });
  const isCatadoresScreen = !isAdminLike || showCatadoresScreen;
  const readOnlyCatadores = isCoordenador && !isAdmin;
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("todos");
  const [rendaFilter, setRendaFilter] = useState<string>("todos");


  const { data: catadores, isLoading } = useQuery({
    queryKey: ["catadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catadores")
        .select(
          "id,nome_completo,cpf,genero,escolaridade,renda_media_mensal,materiais_coletados,status,data_cadastro,nome_cooperativa,contribui_inss,inscrito_cadunico,possui_bolsa_familia,created_by,association_id,associations(tipo)",
        )
        .order("data_cadastro", { ascending: false });
      if (error) throw error;
      return data as unknown as (Catador & { associations: { tipo: string | null } | null })[];
    },
  });

  const creatorIds = useMemo(
    () => Array.from(new Set((catadores ?? []).map((c) => c.created_by).filter(Boolean) as string[])),
    [catadores],
  );

  const fetchDisplayNames = useServerFn(getUserDisplayNames);
  const { data: creatorNames } = useQuery({
    queryKey: ["catador-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      return (await fetchDisplayNames({ data: { ids: creatorIds } })) as Record<string, string>;
    },
  });


  const { data: assocStats } = useQuery({
    queryKey: ["assoc-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("associations").select("id");
      if (error) throw error;
      return { total: data.length };
    },
    enabled: isAdminLike,
  });


  const RENDA_THRESHOLD = RENDA_REFERENCIA; // salário mínimo de referência


  const filtered = useMemo(() => {
    if (!catadores) return [];
    return catadores.filter((c) => {
      if (materialFilter !== "todos" && !c.materiais_coletados.includes(materialFilter))
        return false;
      if (rendaFilter === "menor" && !(c.renda_media_mensal < RENDA_THRESHOLD)) return false;
      if (rendaFilter === "maior" && !(c.renda_media_mensal >= RENDA_THRESHOLD)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${c.nome_completo} ${c.cpf} ${c.nome_cooperativa ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [catadores, materialFilter, rendaFilter, search]);

  const stats = useMemo(() => {
    const total = catadores?.length ?? 0;
    return { total };
  }, [catadores]);


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catador excluído.");
      qc.invalidateQueries({ queryKey: ["catadores"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });




  async function exportXLSX() {
    if (!filtered.length) return toast.info("Nada para exportar.");
    const ids = filtered.map((c) => c.id);
    const { data: full, error: fetchErr } = await supabase
      .from("catadores")
      .select("*")
      .in("id", ids);
    if (fetchErr) {
      toast.error("Erro ao buscar dados completos", { description: fetchErr.message });
      return;
    }
    const rows = (full ?? []).sort(
      (a, b) => new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime(),
    );

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "RecicladoresBR";
    wb.created = new Date();
    const ws = wb.addWorksheet("Catadores", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const columns: Array<{ header: string; key: string; numFmt?: string }> = [
      { header: "Nome completo", key: "nome_completo" },
      { header: "CPF", key: "cpf" },
      { header: "RG / CIN", key: "rg_cin" },
      { header: "Gênero", key: "genero" },
      { header: "Autodeclaração racial", key: "autodeclaracao_racial" },
      { header: "Escolaridade", key: "escolaridade" },
      { header: "E-mail", key: "email" },
      { header: "Telefone", key: "telefone" },
      { header: "Endereço completo", key: "endereco_completo" },
      { header: "Cooperativa / Grupo", key: "nome_cooperativa" },
      { header: "Área de atuação", key: "area_atuacao" },
      { header: "Materiais coletados", key: "materiais_coletados" },
      { header: "Possui carroça", key: "possui_carroca" },
      { header: "Tipo de carroça", key: "tipo_carroca" },
      { header: "Título de eleitor", key: "titulo_eleitor" },
      { header: "CTPS", key: "ctps" },
      { header: "NIS", key: "nis" },
      { header: "Renda média mensal (R$)", key: "renda_media_mensal", numFmt: '"R$" #,##0.00' },
      { header: "Contribui INSS", key: "contribui_inss" },
      { header: "Inscrito CadÚnico", key: "inscrito_cadunico" },
      { header: "Bolsa Família", key: "possui_bolsa_familia" },
      { header: "Conta bancária digital", key: "conta_bancaria_digital" },
      { header: "Cadastro gov.br", key: "cadastro_gov_br" },
      { header: "Nível gov.br", key: "nivel_cadastro_gov_br" },
      { header: "Data de cadastro", key: "data_cadastro", numFmt: "dd/mm/yyyy hh:mm" },
      { header: "Última atualização", key: "updated_at", numFmt: "dd/mm/yyyy hh:mm" },
    ];

    ws.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      style: c.numFmt ? { numFmt: c.numFmt } : undefined,
    }));

    rows.forEach((c: any) => {
      ws.addRow({
        nome_completo: c.nome_completo,
        cpf: c.cpf,
        rg_cin: c.rg_cin ?? "",
        genero: GENERO_LABEL[c.genero] ?? c.genero,
        autodeclaracao_racial: c.autodeclaracao_racial ?? "",
        escolaridade: c.escolaridade ?? "",
        email: c.email ?? "",
        telefone: c.telefone ?? "",
        endereco_completo: c.endereco_completo ?? "",
        nome_cooperativa: c.nome_cooperativa ?? "",
        area_atuacao: c.area_atuacao ?? "",
        materiais_coletados: (c.materiais_coletados ?? []).join(", "),
        possui_carroca: c.possui_carroca ? "Sim" : "Não",
        tipo_carroca: c.tipo_carroca ?? "",
        titulo_eleitor: c.titulo_eleitor ?? "",
        ctps: c.ctps ?? "",
        nis: c.nis ?? "",
        renda_media_mensal: Number(c.renda_media_mensal) || 0,
        contribui_inss: c.contribui_inss ? "Sim" : "Não",
        inscrito_cadunico: c.inscrito_cadunico ? "Sim" : "Não",
        possui_bolsa_familia: c.possui_bolsa_familia ? "Sim" : "Não",
        conta_bancaria_digital: c.conta_bancaria_digital ?? "",
        cadastro_gov_br: c.cadastro_gov_br ? "Sim" : "Não",
        nivel_cadastro_gov_br: c.nivel_cadastro_gov_br ?? "",
        data_cadastro: new Date(c.data_cadastro),

        updated_at: c.updated_at ? new Date(c.updated_at) : null,
      });
    });

    // Header styling
    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF15803D" } },
        bottom: { style: "thin", color: { argb: "FF15803D" } },
        left: { style: "thin", color: { argb: "FF15803D" } },
        right: { style: "thin", color: { argb: "FF15803D" } },
      };
    });

    // Body styling: zebra + borders
    const thin = { style: "thin" as const, color: { argb: "FFE5E7EB" } };
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const isEven = r % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: "middle", wrapText: true };
        if (isEven) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        }
      });
    }

    // Auto-fit column widths
    ws.columns.forEach((col) => {
      let max = col.header ? String(col.header).length : 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        let len = 0;
        if (v instanceof Date) len = 16;
        else if (v != null) len = String(v).length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 12), 60);
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catadores-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} registros exportados.`);
  }

  return (
    <AdminShell>
      {isAdminLike && !showCatadoresScreen && (
        <div className="mb-8 space-y-5">
          <LauncherCard
            eyebrow="Painel principal"
            title="Entidades"
            description="Gerencie cadastros, filtre e exporte dados."
            primaryHref="/admin/associacoes"
            primaryLabel="ACESSAR"
            stats={[
              { icon: Users, label: "Total", value: assocStats?.total ?? 0, tone: "primary" },
            ]}

            actions={
              <>
                <Link to="/admin/associacoes">
                  <Button variant="outline" size="sm">
                    <Download className="size-4" /> Exportar planilha
                  </Button>
                </Link>
                <Link to="/admin/associacoes">
                  <Button variant="outline" size="sm">
                    <Upload className="size-4" /> Importar planilha
                  </Button>
                </Link>
              </>
            }
          />

          <LauncherCard
            eyebrow="Painel principal"
            title="Catadores"
            description="Gerencie cadastros, filtre e exporte dados."
            primaryHref={null}
            primaryLabel="ACESSAR"
            onPrimaryClick={() => setShowCatadoresScreen(true)}
            stats={[
              { icon: Users, label: "Total", value: stats.total, tone: "primary" },
            ]}

            actions={
              <>
                <Button variant="outline" size="sm" onClick={exportXLSX}>
                  <Download className="size-4" /> Exportar planilha
                </Button>
                <Link to="/admin/importar">
                  <Button variant="outline" size="sm">
                    <Upload className="size-4" /> Importar planilha
                  </Button>
                </Link>
              </>
            }
          />
        </div>
      )}

      {isCatadoresScreen && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Catadores</h1>
              <p className="text-muted-foreground">Gerencie cadastros, filtre e exporte dados.</p>
            </div>
            {!readOnlyCatadores && (
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={exportXLSX}>
                    <Download className="size-4" /> Exportar planilha
                  </Button>
                  <Link to="/admin/importar">
                    <Button variant="outline">
                      <Upload className="size-4" /> Importar planilha
                    </Button>
                  </Link>
                </>
              )}
              {(isRecenseador || isAdmin) && (
                <Link to="/admin/novo">
                  <Button>
                    <Plus className="size-4" /> Novo catador
                  </Button>
                </Link>
              )}
            </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-1 mb-6">
            <StatCard icon={Users} label="Total" value={stats.total} tone="primary" />
          </div>

        </>
      )}

      {isCatadoresScreen && (
      <div id="catadores-tabela" className="scroll-mt-20">

      {/* Filters */}
      {!readOnlyCatadores && (
      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">

        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou cooperativa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />

          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos materiais</SelectItem>
              {MATERIAIS_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rendaFilter} onValueChange={setRendaFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Renda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as rendas</SelectItem>
              <SelectItem value="menor">Menor que R$ {RENDA_THRESHOLD.toLocaleString("pt-BR")}</SelectItem>
              <SelectItem value="maior">Maior ou igual a R$ {RENDA_THRESHOLD.toLocaleString("pt-BR")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">CPF</TableHead>
              <TableHead className="hidden lg:table-cell">Cooperativa</TableHead>
              <TableHead className="hidden md:table-cell">Materiais</TableHead>
              <TableHead>Recenseador</TableHead>
              
              {!readOnlyCatadores && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={readOnlyCatadores ? 6 : 7} className="text-center py-12 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnlyCatadores ? 6 : 7} className="text-center py-16">
                  <p className="text-muted-foreground">Nenhum catador encontrado.</p>
                  {isRecenseador && (
                    <Link to="/admin/novo" className="inline-block mt-4">
                      <Button size="sm">
                        <Plus className="size-4" /> Novo catador
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/40">
                <TableCell>
                  {readOnlyCatadores ? (
                    <span className="font-medium">{c.nome_completo}</span>
                  ) : (
                    <Link
                      to="/admin/$id"
                      params={{ id: c.id }}
                      className="font-medium hover:underline"
                    >
                      {c.nome_completo}
                    </Link>
                  )}
                  <div className="md:hidden text-xs text-muted-foreground mt-0.5">{c.cpf}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm tabular-nums">{c.cpf}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {c.nome_cooperativa ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-[280px]">
                    {c.materiais_coletados.slice(0, 3).map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                    {c.materiais_coletados.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{c.materiais_coletados.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {c.created_by ? (creatorNames?.[c.created_by] ?? "—") : "—"}
                </TableCell>


                {!readOnlyCatadores && (
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {((isRecenseador && c.created_by === user.id) || isCoordenadorRecenseador || isAdmin) && (
                      <Link to="/admin/$id/editar" params={{ id: c.id }}>
                        <Button variant="ghost" size="icon" title="Editar cadastro">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <Link to="/admin/$id" params={{ id: c.id }}>
                          <DropdownMenuItem>
                            <Eye className="size-4" /> Ver detalhes
                          </DropdownMenuItem>
                        </Link>
                        {((isRecenseador && c.created_by === user.id) || isCoordenadorRecenseador || isAdmin) && (
                          <Link to="/admin/$id/editar" params={{ id: c.id }}>
                            <DropdownMenuItem>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                          </Link>
                        )}


                      {isAdminLike && (
                        <>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" /> Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível. O cadastro de{" "}
                                  <strong>{c.nome_completo}</strong> será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(c.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
      </div>
      )}
    </AdminShell>
  );
}

function LauncherCard({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  onPrimaryClick,
  stats,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string | null;
  primaryLabel: string;
  onPrimaryClick?: () => void;
  stats: Array<{ icon: typeof Users; label: string; value: number; tone: "primary" | "success" | "warning" }>;
  actions?: React.ReactNode;
}) {
  const primary = primaryHref ? (
    <Link to={primaryHref}>
      <Button
        size="lg"
        className="bg-gradient-to-r from-[hsl(24_95%_53%)] to-[hsl(18_95%_48%)] text-white shadow-md hover:brightness-110 rounded-full px-8 font-bold tracking-wide"
      >
        {primaryLabel} <ArrowRight className="size-4" />
      </Button>
    </Link>
  ) : (
    <Button
      size="lg"
      onClick={onPrimaryClick}
      className="bg-gradient-to-r from-[hsl(24_95%_53%)] to-[hsl(18_95%_48%)] text-white shadow-md hover:brightness-110 rounded-full px-8 font-bold tracking-wide"
    >
      {primaryLabel} <ArrowRight className="size-4" />
    </Button>
  );

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary}
          {actions}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>
    </section>
  );
}


function StatCard({
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



