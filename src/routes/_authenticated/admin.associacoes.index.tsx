import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardPlus, Download, Eye, Lock, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/associacoes/")({
  head: () => ({ meta: [{ title: "Associações — PROCATE" }] }),
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
  const { isAdmin, isConsultant, isCoordenador, area } = Route.useRouteContext() as any;
  const isViewer = isConsultant || isCoordenador;
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [pendingModulo, setPendingModulo] = useState<"social" | "juridico" | "contabil" | "infraestrutura" | null>(null);
  const [tipoFilter, setTipoFilter] = useState<"todas" | "cooperativa" | "associacao" | "coletivo">("todas");
  const [municipioFilter, setMunicipioFilter] = useState<string>("todos");
  const navigate = useNavigate();

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
    queryFn: async () => {
      const { data, error } = await supabase.rpc("associations_with_social_ids");
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });

  const socialSet = useMemo(() => new Set(socialAssocIds), [socialAssocIds]);

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
      { header: "Status", key: "status" },
    ];
    filtered.forEach((item) => {
      const latest = latestByAssoc.get(item.id);
      const situacao = latest?.status ? SITUACAO_LABEL[latest.status] : "Sem diagnóstico";
      const status = item.ativa ? "Ativa" : "Inativa";
      sheet.addRow({
        nome: item.nome,
        tipo: TIPO_LABEL[item.tipo] ?? item.tipo,
        cnpj: item.cnpj ?? "",
        municipio: item.municipio,
        atuais: item.numero_associados_atual,
        situacao,
        status,
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
    social: "Cadastro Social",
    juridico: "Cadastro Jurídico",
    contabil: "Cadastro Contábil",
    infraestrutura: "Cadastro de Infraestrutura",
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
      {!isAdminLike && (
        <section className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Formulário de campo
              </p>
              <h1 className="mt-1 text-2xl font-bold">{moduloLabel[areaForForm]}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione uma entidade na lista abaixo para abrir o formulário da sua área.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setSelectedEntity("");
                setPendingModulo(areaForForm);
              }}
            >
              <ClipboardPlus className="size-4 mr-1" /> Abrir formulário
            </Button>
          </div>
        </section>
      )}

      {isAdminLike && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="mt-1 text-muted-foreground">
              Base oficial de entidades vinculadas ao PROCATE.
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
        <section className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-card">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Formulários de campo
            </p>
            <h2 className="mt-1 text-xl font-bold">Cadastros por área</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o módulo do diagnóstico. A entidade será selecionada em seguida.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { key: "social", titulo: "Cadastro Social", descricao: "Perfil socioeconômico e organizacional." },
              { key: "juridico", titulo: "Cadastro Jurídico", descricao: "Documentação, estatuto e regularidade jurídica." },
              { key: "contabil", titulo: "Cadastro Contábil", descricao: "Escrituração, tributos e obrigações fiscais." },
              { key: "infraestrutura", titulo: "Cadastro de Infraestrutura", descricao: "Sede, equipamentos e condições operacionais." },
            ] as const).map((m) => (
              <div
                key={m.key}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div>
                  <h3 className="text-base font-semibold">{m.titulo}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{m.descricao}</p>
                </div>
                <Button
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => {
                    if (m.key === "social") {
                      navigate({ to: "/admin/associacoes/nova" });
                      return;
                    }
                    setSelectedEntity("");
                    setPendingModulo(m.key);
                  }}
                >
                  <ClipboardPlus className="size-4 mr-1" /> Abrir formulário
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog
        open={!!pendingModulo}
        onOpenChange={(open) => {
          if (!open) {
            setPendingModulo(null);
            setSelectedEntity("");
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
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha entidade" className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-h-72 max-w-[calc(100vw-3rem)]">
              {associations.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="block truncate max-w-[420px]">
                    {a.nome} — {a.municipio}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingModulo(null);
                setSelectedEntity("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedEntity || !pendingModulo}
              onClick={() => {
                if (!selectedEntity || !pendingModulo) return;
                const modulo = pendingModulo;
                const id = selectedEntity;
                setPendingModulo(null);
                setSelectedEntity("");
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
              <TableHead>Situação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Carregando entidades...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <Building2 className="mx-auto mb-3 size-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma entidade encontrada.</p>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((item) => {
              const latest = latestByAssoc.get(item.id);
              const situacao = latest?.status ?? null;
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
                  <TableCell>
                    {situacao ? (
                      <Badge variant="outline" className={SITUACAO_TONE[situacao] ?? ""}>
                        {SITUACAO_LABEL[situacao]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem diagnóstico</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativa ? "secondary" : "outline"}>
                      {item.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isConsultant ? (
                      (() => {
                        const requiresSocial = areaForForm !== "social";
                        const hasSocial = socialSet.has(item.id);
                        const blocked = requiresSocial && !hasSocial;
                        if (blocked) {
                          return (
                            <Button size="sm" variant="outline" disabled>
                              <Lock className="size-4 mr-1" /> Aguardando Social
                            </Button>
                          );
                        }
                        return (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/admin/associacoes/$id/diagnostico/novo",
                                params: { id: item.id },
                                search: { modulo: areaForForm },
                              })
                            }
                          >
                            <ClipboardPlus className="size-4 mr-1" /> Abrir formulário
                          </Button>
                        );
                      })()
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Ações</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/admin/associacoes/$id" params={{ id: item.id }}>
                              <Eye className="size-4 mr-2" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem asChild>
                              <Link to="/admin/associacoes/$id/editar" params={{ id: item.id }}>
                                <Pencil className="size-4 mr-2" /> Editar
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {isCoordenador && (
                            (() => {
                              const requiresSocial = areaForForm !== "social";
                              const hasSocial = socialSet.has(item.id);
                              const blocked = requiresSocial && !hasSocial;
                              if (blocked) {
                                return (
                                  <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                                    <Lock className="size-4 mr-2" /> Aguardando cadastro Social
                                  </DropdownMenuItem>
                                );
                              }
                              return (
                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/admin/associacoes/$id/diagnostico/novo"
                                    params={{ id: item.id }}
                                  >
                                    <ClipboardPlus className="size-4 mr-2" /> Abrir formulário
                                  </Link>
                                </DropdownMenuItem>
                              );
                            })()
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
