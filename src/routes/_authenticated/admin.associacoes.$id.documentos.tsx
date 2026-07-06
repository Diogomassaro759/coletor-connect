import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/associacoes/$id/documentos")({
  head: () => ({ meta: [{ title: "Documentos da associação — PROCATE" }] }),
  beforeLoad: ({ context }) => {
    if (!context.isAdmin && !context.isConsultant && !context.isCoordenador) {
      throw redirect({ to: "/admin" });
    }
  },
  component: DocumentsPage,
});

const CATEGORIES = [
  { value: "estatuto", label: "Estatuto" },
  { value: "ata", label: "Ata" },
  { value: "alvara", label: "Alvará" },
  { value: "licenca_ambiental", label: "Licença ambiental" },
  { value: "balanco", label: "Balanço" },
  { value: "comprovante", label: "Comprovante" },
  { value: "outros", label: "Outros" },
] as const;

function DocumentsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "outros" as (typeof CATEGORIES)[number]["value"],
    issued_at: "",
    expires_at: "",
    file: null as File | null,
  });

  const { data: association } = useQuery({
    queryKey: ["association", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id, nome, municipio")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["association-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_documents")
        .select("*")
        .eq("association_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file) throw new Error("Selecione um arquivo");
      if (!form.title.trim()) throw new Error("Informe um título");
      const ext = form.file.name.split(".").pop() ?? "bin";
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("association-docs")
        .upload(path, form.file, { contentType: form.file.type });
      if (upErr) throw upErr;
      const { data: user } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("association_documents").insert({
        association_id: id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        issued_at: form.issued_at || null,
        expires_at: form.expires_at || null,
        file_path: path,
        file_name: form.file.name,
        file_size: form.file.size,
        mime_type: form.file.type,
        uploaded_by: user.user?.id ?? null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Documento enviado");
      setForm({
        title: "",
        description: "",
        category: "outros",
        issued_at: "",
        expires_at: "",
        file: null,
      });
      qc.invalidateQueries({ queryKey: ["association-documents", id] });
    },
    onError: (err: any) => toast.error(err.message ?? "Falha ao enviar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("association-docs").remove([doc.file_path]);
      const { error } = await supabase
        .from("association_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido");
      qc.invalidateQueries({ queryKey: ["association-documents", id] });
    },
    onError: (err: any) => toast.error(err.message ?? "Falha ao remover"),
  });

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from("association-docs")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error("Falha ao gerar link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <AdminShell>
      <Link to="/admin/associacoes/$id" params={{ id }}>
        <Button variant="ghost" size="sm" className="mb-5">
          <ArrowLeft className="size-4" /> Voltar à entidade
        </Button>
      </Link>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Documentos institucionais
        </p>
        <h1 className="mt-1 text-3xl font-bold">{association?.nome ?? "Associação"}</h1>
        <p className="text-muted-foreground">{association?.municipio}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="text-xl font-semibold">Arquivos enviados</h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {isLoading ? (
              <p className="py-10 text-center text-muted-foreground">Carregando…</p>
            ) : documents.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                Nenhum documento enviado ainda.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_name}
                        {doc.file_size
                          ? ` • ${(doc.file_size / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                      {doc.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                        </Badge>
                        {doc.expires_at && (
                          <Badge variant="outline">
                            Vence em{" "}
                            {new Date(`${doc.expires_at}T12:00:00`).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                      <Download className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Remover "${doc.title}"?`)) deleteMutation.mutate(doc);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-bold">Enviar novo documento</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              uploadMutation.mutate();
            }}
          >
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Emitido em</Label>
                <Input
                  type="date"
                  value={form.issued_at}
                  onChange={(e) => setForm({ ...form, issued_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Arquivo</Label>
              <Input
                type="file"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Enviar documento
            </Button>
          </form>
        </aside>
      </div>
    </AdminShell>
  );
}
