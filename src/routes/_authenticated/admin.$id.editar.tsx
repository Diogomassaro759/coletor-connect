import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { CatadorForm, type CatadorFormData } from "@/components/admin/CatadorForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$id/editar")({
  beforeLoad: async ({ context, params }) => {
    const ctx = context as any;
    if (!ctx.isRecenseador && !ctx.isCoordenadorRecenseador && !ctx.isAdmin) {
      throw redirect({ to: "/admin/$id", params: { id: params.id } });
    }
    // Recenseador: only own catadores. Coordenador recenseador / admin: any.
    if (ctx.isRecenseador && !ctx.isCoordenadorRecenseador && !ctx.isAdmin) {
      const { data } = await supabase
        .from("catadores")
        .select("created_by")
        .eq("id", params.id)
        .maybeSingle();
      if (!data || data.created_by !== ctx.user.id) {
        throw redirect({ to: "/admin/$id", params: { id: params.id } });
      }
    }
  },
  head: () => ({ meta: [{ title: "Editar catador — RecicladoresBR" }] }),
  component: EditarCatador,
});

function EditarCatador() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["catador", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("catadores").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminShell>
      <BackButton label="Voltar aos detalhes" />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Editar cadastro</h1>
        <p className="text-muted-foreground mt-1">Atualize os dados do(a) catador(a).</p>
      </div>
      {isLoading || !data ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : (
        <CatadorForm
          mode="edit"
          catadorId={id}
          defaultValues={data as unknown as Partial<CatadorFormData>}
        />
      )}
    </AdminShell>
  );
}
