import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function FilledFormsList({ associationId }: { associationId: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["filled-forms", associationId],
    queryFn: async () => {
      const [a, i] = await Promise.all([
        supabase
          .from("association_assessments")
          .select("id,data_visita,horario_visita,consultant_name,created_at")
          .eq("association_id", associationId)
          .order("data_visita", { ascending: false }),
        supabase
          .from("infrastructure_assessments")
          .select("id,data_visita,horario_visita,consultant_name,created_at")
          .eq("association_id", associationId)
          .order("data_visita", { ascending: false }),
      ]);
      const list = [
        ...((a.data ?? []) as any[]).map((r) => ({
          ...r,
          formulario: "Social",
          kind: "assessment" as const,
        })),
        ...((i.data ?? []) as any[]).map((r) => ({
          ...r,
          formulario: "Infraestrutura",
          kind: "infra" as const,
        })),
      ];
      list.sort((x, y) =>
        String(y.data_visita ?? "").localeCompare(String(x.data_visita ?? "")),
      );
      return list;
    },
  });

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
      <h2 className="text-xl font-bold">Formulários preenchidos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Histórico de formulários vinculados a esta entidade.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4">Formulário</th>
              <th className="py-2 pr-4">Data</th>
              <th className="py-2 pr-4">Hora</th>
              <th className="py-2 pr-4">Consultor</th>
              <th className="py-2 pr-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Nenhum formulário preenchido.
                </td>
              </tr>
            ) : (
              rows.map((r: any) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{r.formulario}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {r.data_visita
                      ? new Date(`${r.data_visita}T12:00:00`).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {r.horario_visita ? String(r.horario_visita).slice(0, 5) : "—"}
                  </td>
                  <td className="py-3 pr-4">{r.consultant_name ?? "—"}</td>
                  <td className="py-3 pr-4 text-right">
                    {r.kind === "assessment" ? (
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/admin/associacoes/$id/diagnostico/$assessmentId"
                          params={{ id: associationId, assessmentId: r.id }}
                        >
                          <Button size="sm" variant="outline">Visualizar</Button>
                        </Link>
                        <Link
                          to="/admin/associacoes/$id/diagnostico/$assessmentId"
                          params={{ id: associationId, assessmentId: r.id }}
                        >
                          <Button size="sm">Editar</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled>
                          Visualizar
                        </Button>
                        <Button size="sm" disabled>
                          Editar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
