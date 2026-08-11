import { useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseImportFile } from "@/lib/catador-import";

const BATCH_SIZE = 15;

export type ParsedAreaRow<TAssessment> = {
  rowNumber: number;
  raw: Record<string, unknown>;
  nome: string;
  cnpj: string | null;
  assessment: TAssessment;
  errors: string[];
  warnings: string[];
};

export type AreaImportRowResult = {
  rowNumber: number;
  status: "created" | "skipped_duplicate" | "association_not_found" | "error";
  message?: string;
  associationName: string;
};

export function AreaAssessmentImport<TAssessment>({
  description,
  templateFileName,
  buildTemplate,
  parseRow,
  importFn,
  createdLabel,
}: {
  description: string;
  templateFileName: string;
  buildTemplate: () => Promise<Blob>;
  parseRow: (raw: Record<string, unknown>, rowNumber: number) => ParsedAreaRow<TAssessment>;
  importFn: (
    rows: { rowNumber: number; nome: string; cnpj: string | null; assessment: TAssessment }[],
  ) => Promise<{ results: AreaImportRowResult[] }>;
  createdLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedAreaRow<TAssessment>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<AreaImportRowResult[] | null>(null);

  const summary = useMemo(() => {
    if (!rows) return null;
    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  async function downloadTemplate() {
    const blob = await buildTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setParsing(true);
    setResults(null);
    try {
      const parsed = await parseImportFile(file);
      if (!parsed.length) {
        toast.error("Planilha vazia.");
        setRows(null);
        return;
      }
      const parsedRows = parsed.map((raw, i) => parseRow(raw, i + 2));
      setRows(parsedRows);
      setFileName(file.name);
    } catch (e) {
      toast.error("Falha ao ler arquivo", { description: (e as Error).message });
    } finally {
      setParsing(false);
    }
  }

  async function commitImport() {
    if (!rows) return;
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (!validRows.length) return toast.error("Nenhuma linha válida para importar.");

    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    const allResults: AreaImportRowResult[] = [];

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const slice = validRows.slice(i, i + BATCH_SIZE).map((r) => ({
        rowNumber: r.rowNumber,
        nome: r.nome,
        cnpj: r.cnpj,
        assessment: r.assessment,
      }));
      try {
        const res = await importFn(slice);
        allResults.push(...res.results);
      } catch (e) {
        for (const r of slice) {
          allResults.push({
            rowNumber: r.rowNumber,
            status: "error",
            message: (e as Error).message,
            associationName: r.nome,
          });
        }
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, validRows.length), total: validRows.length });
    }

    setImporting(false);
    setResults(allResults);
    const created = allResults.filter((r) => r.status === "created").length;
    const skipped = allResults.filter((r) => r.status === "skipped_duplicate").length;
    const notFound = allResults.filter((r) => r.status === "association_not_found").length;
    const errored = allResults.filter((r) => r.status === "error").length;
    if (errored === 0 && notFound === 0) {
      toast.success(`${created} ${createdLabel} importados${skipped ? `, ${skipped} ignorados (já existiam)` : ""}.`);
      setRows(null);
      setFileName("");
    } else {
      toast.warning(`${created} importados, ${skipped} ignorados, ${notFound} sem entidade, ${errored} com erro.`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
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
          <h2 className="font-semibold mb-1">2. Enviar planilha</h2>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
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
          <Button onClick={() => fileRef.current?.click()} disabled={parsing} className="w-full">
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
          {fileName && <p className="text-xs text-muted-foreground mt-2 truncate">📄 {fileName}</p>}
        </div>
      </div>

      <div className="space-y-4">
        {!rows && !results && (
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
                      <TableHead>Entidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.rowNumber} className={r.errors.length ? "bg-destructive/5" : ""}>
                        <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{r.nome || "—"}</TableCell>
                        <TableCell>
                          {r.errors.length === 0 ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                                <CheckCircle2 className="size-3" /> OK
                              </Badge>
                              {r.warnings.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {r.warnings.length} aviso(s) — dados parciais, revise depois.
                                </div>
                              )}
                            </div>
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
                    <Loader2 className="size-4 animate-spin" />
                    Importando... {progress ? `${progress.done}/${progress.total}` : ""}
                  </>
                ) : (
                  <>Importar {summary.valid} válidas</>
                )}
              </Button>
            </div>
          </>
        )}

        {results && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" /> Resultado da importação
            </h3>
            <p className="text-sm">
              <strong>{results.filter((r) => r.status === "created").length}</strong> {createdLabel} criados.
            </p>
            {results.some((r) => r.status === "skipped_duplicate") && (
              <p className="text-sm text-muted-foreground mt-1">
                {results.filter((r) => r.status === "skipped_duplicate").length} linhas ignoradas — a entidade já
                tinha esse formulário preenchido.
              </p>
            )}
            {results.some((r) => r.status === "association_not_found") && (
              <>
                <p className="text-sm text-warning-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="size-3.5" />
                  {results.filter((r) => r.status === "association_not_found").length} linhas sem entidade
                  correspondente:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 max-h-32 overflow-auto">
                  {results
                    .filter((r) => r.status === "association_not_found")
                    .map((f, i) => (
                      <li key={i}>
                        Linha {f.rowNumber} ({f.associationName}): entidade não cadastrada ainda — cadastre-a antes de
                        reimportar essa linha.
                      </li>
                    ))}
                </ul>
              </>
            )}
            {results.some((r) => r.status === "error") && (
              <>
                <p className="text-sm text-destructive mt-2">
                  {results.filter((r) => r.status === "error").length} linhas falharam:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 max-h-48 overflow-auto">
                  {results
                    .filter((r) => r.status === "error")
                    .map((f, i) => (
                      <li key={i}>
                        Linha {f.rowNumber} ({f.associationName}): {f.message}
                      </li>
                    ))}
                </ul>
              </>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setResults(null)}>
              Nova importação
            </Button>
          </div>
        )}
      </div>
    </div>
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
