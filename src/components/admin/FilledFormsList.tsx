import { Link, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Area = "social" | "juridico" | "contabil" | "infraestrutura" | null | undefined;

export function FilledFormsList({
  associationId,
  area: areaProp,
}: {
  associationId: string;
  area?: Area;
}) {
  const ctx = useRouteContext({ from: "/_authenticated" }) as any;
  const area: Area = areaProp ?? ctx?.area ?? null;
  const isPrivileged = !!(ctx?.isAdmin || ctx?.isCoordenador);
  // Consultores só veem o formulário da sua área.
  const showSocial = isPrivileged || !area || area === "social";
  const showInfra = isPrivileged || !area || area === "infraestrutura";

  const { data: rows = [] } = useQuery({
    queryKey: ["filled-forms", associationId, area, isPrivileged],
    queryFn: async () => {
      const [a, i] = await Promise.all([
        showSocial
          ? supabase
              .from("association_assessments")
              .select("id,data_visita,horario_visita,consultant_name,created_at")
              .eq("association_id", associationId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        showInfra
          ? supabase
              .from("infrastructure_assessments")
              .select("id,data_visita,horario_visita,consultant_name,created_at")
              .eq("association_id", associationId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
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
        String(y.created_at ?? "").localeCompare(String(x.created_at ?? "")),
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
              <th className="py-2 pr-4">Preenchido em</th>
              <th className="py-2 pr-4">Consultor</th>
              <th className="py-2 pr-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  Nenhum formulário preenchido.
                </td>
              </tr>
            ) : (
              rows.map((r: any) => {
                const created = r.created_at ? new Date(r.created_at) : null;
                return (
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
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {created
                        ? `${created.toLocaleDateString("pt-BR")} ${created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        : "—"}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
