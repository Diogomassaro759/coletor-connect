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
  assessment: z.object({
    livros: z.array(
      z.object({
        tipo: z.string(),
        implantado: z.boolean(),
        atualizado: z.boolean(),
        nao_possui: z.boolean(),
        observacao: z.string().nullable(),
      }),
    ),
  }).catchall(z.any()),
});

const normalizeCnpj = (v: string | null | undefined) => (v ? v.replace(/\D/g, "") : "");
const normalizeName = (v: string | null | undefined) => (v ? v.trim().toLowerCase() : "");

export type ImportContabilResult = {
  rowNumber: number;
  status: "created" | "skipped_duplicate" | "association_not_found" | "error";
  message?: string;
  associationName: string;
};

export const importContabilAssessments = createServerFn({ method: "POST" })
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
      .eq("area", "contabil");
    const hasAssessment = new Set((existingAssessments ?? []).map((r: any) => r.association_id as string));

    const results: ImportContabilResult[] = [];

    for (const row of data.rows) {
      try {
        const { livros, ...assessmentFields } = row.assessment as any;
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

        const { data: assessment, error: insertErr } = await supabaseAdmin
          .from("association_assessments")
          .insert({
            ...assessmentFields,
            association_id: associationId,
            area: "contabil",
            consultant_id: consultantId,
            consentimento_dados: true,
            declaracao_veracidade: true,
          })
          .select("id")
          .single();
        if (insertErr || !assessment) {
          results.push({
            rowNumber: row.rowNumber,
            status: "error",
            message: insertErr?.message ?? "desconhecida",
            associationName: row.nome,
          });
          continue;
        }
        hasAssessment.add(associationId);

        if (Array.isArray(livros) && livros.length > 0) {
          const bookRows = livros.map((l: any) => ({ ...l, assessment_id: assessment.id }));
          const { error: booksErr } = await supabaseAdmin.from("accounting_books").insert(bookRows);
          if (booksErr) {
            results.push({
              rowNumber: row.rowNumber,
              status: "created",
              message: `Diagnóstico criado, mas falha ao salvar livros contábeis: ${booksErr.message}`,
              associationName: row.nome,
            });
            continue;
          }
        }

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
