import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CatadorForm } from "@/components/admin/CatadorForm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/associacoes/$id/catadores/novo")({
  beforeLoad: ({ context }) => {
    if (!context.isRecenseador) throw redirect({ to: "/admin/associacoes" });
  },
  head: () => ({ meta: [{ title: "Cadastrar catador — PROCATE" }] }),
  component: NewAssociationCollector,
});

function NewAssociationCollector() {
  const { id } = Route.useParams();
  const { data: association, isLoading } = useQuery({
    queryKey: ["association", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id,nome")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AdminShell>
        <p className="text-muted-foreground">Carregando entidade...</p>
      </AdminShell>
    );
  }

  if (!association) {
    return (
      <AdminShell>
        <p>Entidade não encontrada.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Link to="/admin/associacoes/$id" params={{ id }}>
        <Button variant="ghost" size="sm" className="mb-5">
          <ArrowLeft className="size-4" /> Voltar para a entidade
        </Button>
      </Link>
      <div className="mx-auto mb-8 max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {association.nome}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Cadastrar catador</h1>
        <p className="mt-2 text-muted-foreground">
          O novo cadastro será vinculado automaticamente a esta entidade.
        </p>
      </div>
      <CatadorForm
        mode="create"
        associationId={association.id}
        associationName={association.nome}
      />
    </AdminShell>
  );
}
