import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, Download, Loader2, RotateCcw, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createBackup, restoreBackup } from "@/lib/backup.functions";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  beforeLoad: ({ context }) => {
    if (!(context as any).isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Backup e restauração — PROCATE" },
      {
        name: "description",
        content: "Gere backups completos dos dados do PROCATE e restaure quando necessário.",
      },
      { property: "og:title", content: "Backup e restauração — PROCATE" },
      {
        property: "og:description",
        content: "Exporte e restaure os dados do sistema PROCATE com segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BackupPage,
});

type RestoreResult = { table: string; restored: number; skipped: number; error?: string };

function BackupPage() {
  const doBackup = useServerFn(createBackup);
  const doRestore = useServerFn(restoreBackup);
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pending, setPending] = useState<{ name: string; backup: any } | null>(null);
  const [results, setResults] = useState<RestoreResult[] | null>(null);

  async function handleBackup() {
    setExporting(true);
    try {
      const backup: any = await doBackup({} as any);
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `procate-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = Object.values(backup.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      toast.success(`Backup gerado com ${total} registros.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar backup.");
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed?.tables) throw new Error("Arquivo inválido.");
      setPending({ name: file.name, backup: parsed });
    } catch {
      toast.error("Arquivo de backup inválido.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setRestoring(true);
    setResults(null);
    try {
      const res: any = await doRestore({ data: { backup: pending.backup } });
      setResults(res.results);
      const restored = res.results.reduce((a: number, r: RestoreResult) => a + r.restored, 0);
      const skipped = res.results.reduce((a: number, r: RestoreResult) => a + r.skipped, 0);
      toast.success(`Restauração concluída: ${restored} registros${skipped ? `, ${skipped} ignorados` : ""}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao restaurar backup.");
    } finally {
      setRestoring(false);
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Backup e restauração</h1>
        <p className="text-muted-foreground">
          Disponível apenas para administradores. Gere uma cópia completa dos dados e restaure quando necessário.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" /> Gerar backup
            </CardTitle>
            <CardDescription>
              Exporta entidades, catadores, formulários, documentos, perfis e papéis em um arquivo .json.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-5" /> Restaurar backup
            </CardTitle>
            <CardDescription>
              Envie um arquivo gerado aqui. Registros existentes são atualizados e os ausentes recriados; nada é
              excluído.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={restoring}>
              {restoring ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Selecionar arquivo
            </Button>
          </CardContent>
        </Card>
      </div>

      {results && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado da restauração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {results.map((r) => (
              <div key={r.table} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 last:border-0">
                <span className="font-medium">{r.table}</span>
                <span className="text-muted-foreground">
                  {r.restored} restaurados{r.skipped ? ` · ${r.skipped} ignorados` : ""}
                  {r.error ? ` · ${r.error}` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Confirmar restauração
            </AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{pending?.name}</strong> vai sobrescrever registros existentes com os dados do backup.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
