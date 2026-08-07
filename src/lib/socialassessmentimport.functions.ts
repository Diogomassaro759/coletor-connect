import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (error) throw new Error(`Falha ao verificar permissões: ${error.message}`);
  if (!data?.some((r: { role: string }) => r.role === "admin"))
    throw new Error("Apenas administradores podem executar esta ação.");
}

const rowSchema = z.object({
  rowNumber: z.number(),
  association: z.object({
    nome: z.string(),
    cnpj: z.string().nullable(),
    municipio: z.string(),
    inscricao_municipal: z.string().nullable(),
    inscricao_estadual: z.string().nullable(),
    endereco_sede: z.string(),
    telefone: z.string().nullable(),
    email: z.string().nullable(),
    numero_associados_inicial: z.number(),
    numero_associados_atual: z.number(),
  }),
  assessment: z.record(z.string(), z.any()),
  materialPrices: z.array(
    z.object({
      material: z.string(),
      comprador: z.string().nullable(),
      preco_por_kg: z.number().nullable(),
    }),
  ),
});

const normalizeCnpj = (v: string | null | undefined) => (v ? v.replace(/\D/g, "") : "");
const normalizeName = (v: string | null | undefined) => (v ? v.trim().toLowerCase() : "");

export type ImportSocialResult = {
  rowNumber: number;
  status: "created" | "skipped_duplicate" | "error";
  message?: string;
  associationName: string;
  associationCreated: boolean;
};

export const importSocialAssessments = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rows: z.array(rowSchema) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const consultantId = (context as any).userId as string;

    const { data: existingAssociations, error: assocErr } = await supabaseAdmin
      .from("associations")
      .select("id, nome, cnpj");
    if (assocErr) throw new Error(`Erro ao carregar associações: ${assocErr.message}`);

    const byCnpj = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const a of existingAssociations ?? []) {
      const cnpj = normalizeCnpj((a as any).cnpj);
      if (cnpj) byCnpj.set(cnpj, (a as any).id);
      byName.set(normalizeName((a as any).nome), (a as any).id);
    }

    const { data: existingSocialAssessments } = await supabaseAdmin
      .from("association_assessments")
      .select("association_id")
      .eq("area", "social");
    const hasSocialAssessment = new Set(
      (existingSocialAssessments ?? []).map((r: any) => r.association_id as string),
    );

    const results: ImportSocialResult[] = [];

    for (const row of data.rows) {
      try {
        const cnpjKey = normalizeCnpj(row.association.cnpj);
        const nameKey = normalizeName(row.association.nome);
        let associationId = (cnpjKey && byCnpj.get(cnpjKey)) || byName.get(nameKey) || null;
        let associationCreated = false;

        if (!associationId) {
          const { data: created, error: createErr } = await supabaseAdmin
            .from("associations")
            .insert({
              nome: row.association.nome,
              cnpj: row.association.cnpj,
              municipio: row.association.municipio,
              inscricao_municipal: row.association.inscricao_municipal,
              inscricao_estadual: row.association.inscricao_estadual,
              endereco_sede: row.association.endereco_sede,
              telefone: row.association.telefone,
              email: row.association.email,
              numero_associados_inicial: row.association.numero_associados_inicial,
              numero_associados_atual: row.association.numero_associados_atual,
            })
            .select("id")
            .single();
          if (createErr || !created) {
            results.push({
              rowNumber: row.rowNumber,
              status: "error",
              message: `Falha ao criar associação: ${createErr?.message ?? "desconhecida"}`,
              associationName: row.association.nome,
              associationCreated: false,
            });
            continue;
          }
          associationId = created.id;
          associationCreated = true;
          if (cnpjKey) byCnpj.set(cnpjKey, associationId);
          byName.set(nameKey, associationId);
        }

        if (hasSocialAssessment.has(associationId)) {
          results.push({
            rowNumber: row.rowNumber,
            status: "skipped_duplicate",
            message: "Já existe um formulário social para esta associação — linha ignorada.",
            associationName: row.association.nome,
            associationCreated,
          });
          continue;
        }

        const { data: assessment, error: assessErr } = await supabaseAdmin
          .from("association_assessments")
          .insert({
            ...row.assessment,
            association_id: associationId,
            area: "social",
            consultant_id: consultantId,
          })
          .select("id")
          .single();
        if (assessErr || !assessment) {
          results.push({
            rowNumber: row.rowNumber,
            status: "error",
            message: `Falha ao criar diagnóstico: ${assessErr?.message ?? "desconhecida"}`,
            associationName: row.association.nome,
            associationCreated,
          });
          continue;
        }
        hasSocialAssessment.add(associationId);

        if (row.materialPrices.length > 0) {
          const priceRows = row.materialPrices.map((p) => ({
            assessment_id: assessment.id,
            material: p.material,
            comprador: p.comprador,
            preco_por_kg: p.preco_por_kg ?? undefined,
          }));
          const { error: priceErr } = await supabaseAdmin.from("material_prices").insert(priceRows);
          if (priceErr) {
            results.push({
              rowNumber: row.rowNumber,
              status: "created",
              message: `Diagnóstico criado, mas falha ao salvar preços de materiais: ${priceErr.message}`,
              associationName: row.association.nome,
              associationCreated,
            });
            continue;
          }
        }

        results.push({
          rowNumber: row.rowNumber,
          status: "created",
          associationName: row.association.nome,
          associationCreated,
        });
      } catch (e) {
        results.push({
          rowNumber: row.rowNumber,
          status: "error",
          message: (e as Error).message,
          associationName: row.association.nome,
          associationCreated: false,
        });
      }
    }

    return { results };
  });
