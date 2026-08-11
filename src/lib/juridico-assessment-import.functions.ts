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
  nome: z.string(),
  cnpj: z.string().nullable(),
  assessment: z.record(z.string(), z.any()),
});

const normalizeCnpj = (v: string | null | undefined) => (v ? v.replace(/\D/g, "") : "");
const normalizeName = (v: string | null | undefined) => (v ? v.trim().toLowerCase() : "");

export type ImportJuridicoResult = {
  rowNumber: number;
  status: "created" | "skipped_duplicate" | "association_not_found" | "error";
  message?: string;
  associationName: string;
};

export const importJuridicoAssessments = createServerFn({ method: "POST" })
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

    const { data: existingAssessments } = await supabaseAdmin
      .from("association_assessments")
      .select("association_id")
      .eq("area", "juridico");
    const hasAssessment = new Set((existingAssessments ?? []).map((r: any) => r.association_id as string));

    const results: ImportJuridicoResult[] = [];

    for (const row of data.rows) {
      try {
        const cnpjKey = normalizeCnpj(row.cnpj);
        const nameKey = normalizeName(row.nome);
        const associationId = (cnpjKey && byCnpj.get(cnpjKey)) || byName.get(nameKey) || null;

        if (!associationId) {
          results.push({
            rowNumber: row.rowNumber,
            status: "association_not_found",
            associationName: row.nome,
          });
          continue;
        }

        if (hasAssessment.has(associationId)) {
          results.push({
            rowNumber: row.rowNumber,
            status: "skipped_duplicate",
            associationName: row.nome,
          });
          continue;
        }

        const { error: insertErr } = await supabaseAdmin.from("association_assessments").insert({
          ...row.assessment,
          association_id: associationId,
          area: "juridico",
          consultant_id: consultantId,
          consentimento_dados: true,
          declaracao_veracidade: true,
        });
        if (insertErr) {
          results.push({
            rowNumber: row.rowNumber,
            status: "error",
            message: insertErr.message,
            associationName: row.nome,
          });
          continue;
        }
        hasAssessment.add(associationId);

        results.push({ rowNumber: row.rowNumber, status: "created", associationName: row.nome });
      } catch (e) {
        results.push({
          rowNumber: row.rowNumber,
          status: "error",
          message: (e as Error).message,
          associationName: row.nome,
        });
      }
    }

    return { results };
  });
