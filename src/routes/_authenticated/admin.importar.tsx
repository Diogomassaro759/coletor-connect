import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { ArrowLeft, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildTemplateXLSX,
  parseImportFile,
  validateRow,
  type ImportRow,
} from "@/lib/catador-import";

export const Route = createFileRoute("/_authenticated/admin/importar")({
  beforeLoad: ({ context }) => {
    if (!context.isRecenseador) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Importar catadores — RecicladoresBR" }] }),
  component: ImportarCatadoresPage,
});

function ImportarCatadoresPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [associationId, setAssociationId] = useState<string>("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: { row: number; msg: string }[] } | null>(null);

  const { data: associations } = useQuery({
    queryKey: ["associations-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const summary = useMemo(() => {
    if (!rows) return null;
    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  async function downloadTemplate() {
    const blob = await buildTemplateXLSX();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-catadores.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    if (!associationId) {
      toast.error("Selecione a entidade antes de enviar o arquivo.");
      return;
    }
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseImportFile(file);
      if (!parsed.length) {
        toast.error("Planilha vazia.");
        setRows(null);
        return;
      }
      const cpfsSeen = new Set<string>();
      const validated = parsed.map((raw, i) => {
        const r = validateRow(raw, i + 2, associationId);
        if (r.data) {
          const key = r.data.cpf.replace(/\D/g, "");
          if (cpfsSeen.has(key)) {
            r.errors.push("CPF duplicado na planilha");
            r.data = undefined;
          } else cpfsSeen.add(key);
        }
        return r;
      });
      setRows(validated);
      setFileName(file.name);
    } catch (e) {
      toast.error("Falha ao ler arquivo", { description: (e as Error).message });
    } finally {
      setParsing(false);
    }
  }

  async function commitImport() {
    if (!rows) return;
    const validRows = rows.filter((r) => r.data);
    if (!validRows.length) return toast.error("Nenhuma linha válida para importar.");

    setImporting(true);
    const failed: { row: number; msg: string }[] = [];
    let ok = 0;
    const batchSize = 50;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const slice = validRows.slice(i, i + batchSize);
      const payload = slice.map((r) => r.data!);
      const { error, data } = await supabase.from("catadores").insert(payload).select("id");
      if (error) {
        // try one-by-one to surface per-row errors
        for (const r of slice) {
          const { error: e2 } = await supabase.from("catadores").insert(r.data!);
          if (e2) failed.push({ row: r.rowNumber, msg: e2.message });
          else ok++;
        }
      } else {
        ok += data?.length ?? slice.length;
      }
    }
    setImporting(false);
    setResult({ ok, failed });
    qc.invalidateQueries({ queryKey: ["catadores"] });
    if (failed.length === 0) {
      toast.success(`${ok} catadores importados com sucesso.`);
      setRows(null);
      setFileName("");
    } else {
      toast.warning(`${ok} importados, ${failed.length} com erro.`);
    }
  }

  return (
    <AdminShell>
      <BackButton label="Voltar à lista" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Importação em massa de catadores</h1>
        <p className="text-muted-foreground mt-1">
          Envie planilha CSV ou XLSX. Validamos linha a linha antes de gravar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Step controls */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" /> 1. Modelo
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Baixe o modelo XLSX com cabeçalhos e instruções por campo.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
              <Download className="size-4" /> Baixar modelo
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold mb-1">2. Entidade</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Todos os catadores serão vinculados a esta associação.
            </p>
            <Select value={associationId} onValueChange={setAssociationId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(associations ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold mb-1">3. Enviar planilha</h2>
            <p className="text-sm text-muted-foreground mb-3">CSV ou XLSX, até 5 MB.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!associationId || parsing}
              className="w-full"
            >
              {parsing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Lendo...
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Escolher arquivo
                </>
              )}
            </Button>
            {fileName && (
              <p className="text-xs text-muted-foreground mt-2 truncate">📄 {fileName}</p>
            )}
          </div>
        </div>

        {/* Preview / result */}
        <div className="space-y-4">
          {!rows && !result && (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
              <FileSpreadsheet className="size-12 mx-auto mb-3 opacity-50" />
              <p>Pré-visualização aparecerá aqui após o envio do arquivo.</p>
            </div>
          )}

          {summary && rows && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Total" value={summary.total} tone="muted" />
                <SummaryCard label="Válidas" value={summary.valid} tone="success" />
                <SummaryCard label="Com erros" value={summary.invalid} tone="warning" />
              </div>

              <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                <div className="max-h-[480px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.rowNumber} className={r.errors.length ? "bg-destructive/5" : ""}>
                          <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                          <TableCell>{String(r.raw["nome_completo"] ?? "—")}</TableCell>
                          <TableCell className="tabular-nums text-xs">
                            {String(r.raw["cpf"] ?? "—")}
                          </TableCell>
                          <TableCell>
                            {r.errors.length === 0 ? (
                              <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                                <CheckCircle2 className="size-3" /> OK
                              </Badge>
                            ) : (
                              <div className="space-y-1">
                                {r.errors.map((e, i) => (
                                  <div key={i} className="flex items-start gap-1 text-xs text-destructive">
                                    <AlertCircle className="size-3 mt-0.5 shrink-0" /> {e}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setRows(null)}>
                  Cancelar
                </Button>
                <Button onClick={commitImport} disabled={importing || summary.valid === 0}>
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Importando...
                    </>
                  ) : (
                    <>Importar {summary.valid} válidas</>
                  )}
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" /> Resultado da importação
              </h3>
              <p className="text-sm">
                <strong>{result.ok}</strong> catadores criados com sucesso.
              </p>
              {result.failed.length > 0 && (
                <>
                  <p className="text-sm text-destructive mt-2">
                    {result.failed.length} linhas falharam ao gravar:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1 max-h-48 overflow-auto">
                    {result.failed.map((f, i) => (
                      <li key={i}>
                        Linha {f.row}: {f.msg}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setResult(null)}>
                Nova importação
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "success" | "warning";
}) {
  const tones = {
    muted: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}
