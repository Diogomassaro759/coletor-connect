import { Link, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function FilledFormsList({ associationId }: { associationId: string }) {
  const ctx = useRouteContext({ from: "/_authenticated" }) as any;
  const area = ctx?.area as "social" | "juridico" | "contabil" | "infraestrutura" | null;
  const isAdmin = !!ctx?.isAdmin;
  const isConsultant = !!ctx?.isConsultant;
  const canEdit = !isConsultant;
  const areaLabels: Record<string, string> = {
    social: "Social",
    juridico: "Jurídico",
    contabil: "Contábil",
    infraestrutura: "Infraestrutura",
  };
  // Admins see all forms. Everyone else (coordenador/consultor) is filtered by their area.
  const showAssessment = isAdmin || !area || area === "social" || area === "juridico" || area === "contabil";
  const showInfra = isAdmin || area === "infraestrutura";

  const { data: rows = [] } = useQuery({
    queryKey: ["filled-forms", associationId, area, isAdmin],
    queryFn: async () => {
      const showSocial = isAdmin || !area || area === "social";
      const [a, i, assoc] = await Promise.all([
        showAssessment
          ? supabase
              .from("association_assessments")
              .select("id,data_visita,horario_visita,consultant_name,created_at,created_by")
              .eq("association_id", associationId)
              .order("data_visita", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        showInfra
          ? supabase
              .from("infrastructure_assessments")
              .select("id,data_visita,horario_visita,consultant_name,created_at,created_by")
              .eq("association_id", associationId)
              .order("data_visita", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),

        showSocial
          ? supabase
              .from("associations")
              .select("id,data_visita,horario_visita,created_at,created_by")
              .eq("id", associationId)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
      ]);
      const assessmentRows = (((a as any).data ?? []) as any[]);
      const assocRow = (assoc as any).data as any;
      const infraRows = (((i as any).data ?? []) as any[]);
      const creatorIds = [
        ...new Set(
          [
            ...assessmentRows.map((r) => r.created_by),
            ...infraRows.map((r: any) => r.created_by),
            assocRow?.created_by,
          ].filter(Boolean),
        ),
      ];
      let creatorAreas: Record<string, string> = {};
      let creatorNames: Record<string, string> = {};


      if (creatorIds.length > 0) {
        const [{ data: roleRows }, { data: profileRows }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("user_id,area")
            .in("user_id", creatorIds)
            .not("area", "is", null),
          supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", creatorIds),
        ]);

        creatorAreas = ((roleRows ?? []) as any[]).reduce((acc, role) => {
          if (!acc[role.user_id]) acc[role.user_id] = role.area;
          return acc;
        }, {} as Record<string, string>);
        creatorNames = ((profileRows ?? []) as any[]).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const visibleAssessmentRows = assessmentRows.filter((r) => {
        const formArea = creatorAreas[r.created_by] ?? "social";
        return isAdmin || !area || formArea === area;
      });

      const list = [
        ...(showSocial && assocRow
          ? [{
              id: assocRow.id,
              data_visita: assocRow.data_visita,
              horario_visita: assocRow.horario_visita,
              consultant_name: creatorNames[assocRow.created_by] ?? null,
              created_at: assocRow.created_at,
              created_by: assocRow.created_by,
              formulario: "Social",
              kind: "social-entity" as const,
            }]
          : []),
        ...visibleAssessmentRows.map((r) => {
          const formArea = creatorAreas[r.created_by] ?? "social";
          return {
          ...r,
          consultant_name: r.consultant_name ?? creatorNames[r.created_by] ?? null,
          formulario: areaLabels[formArea] ?? "Social",
          kind: "assessment" as const,
          };
        }),
        ...infraRows.map((r: any) => ({
          ...r,
          consultant_name: r.consultant_name ?? creatorNames[r.created_by] ?? null,
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
                          search={{ mode: "view" as const }}
                        >
                          <Button size="sm" variant="outline">Visualizar</Button>
                        </Link>
                        {canEdit && (
                          <Link
                            to="/admin/associacoes/$id/diagnostico/$assessmentId"
                            params={{ id: associationId, assessmentId: r.id }}
                            search={{ mode: "edit" as const }}
                          >
                            <Button size="sm">Editar</Button>
                          </Link>
                        )}
                      </div>
                    ) : r.kind === "social-entity" ? (
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/admin/associacoes/$id/editar"
                          params={{ id: associationId }}
                          search={{ mode: "view" as const }}
                        >
                          <Button size="sm" variant="outline">Visualizar</Button>
                        </Link>
                        {canEdit && (
                          <Link
                            to="/admin/associacoes/$id/editar"
                            params={{ id: associationId }}
                          >
                            <Button size="sm">Editar</Button>
                          </Link>
                        )}
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
