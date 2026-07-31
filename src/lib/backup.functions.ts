import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Ordem importa: pais antes dos filhos (restauração respeita esta sequência).
export const BACKUP_TABLES = [
  "profiles",
  "user_roles",
  "associations",
  "catadores",
  "association_assessments",
  "accounting_books",
  "association_equipment",
  "material_prices",
  "association_documents",
  "association_evidence",
  "infrastructure_assessments",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

const CONFLICT_KEY: Record<BackupTable, string> = {
  profiles: "user_id",
  user_roles: "id",
  associations: "id",
  catadores: "id",
  association_assessments: "id",
  accounting_books: "id",
  association_equipment: "id",
  material_prices: "id",
  association_documents: "id",
  association_evidence: "id",
  infrastructure_assessments: "id",
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error("Falha ao verificar permissões.");
  if (!data?.some((r: { role: string }) => r.role === "admin"))
    throw new Error("Apenas administradores podem executar esta ação.");
}

export const createBackup = createServerFn({ method: "POST" }).handler(async ({ context }) => {
  await assertAdmin(context as any);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const tables: Record<string, any[]> = {};
  for (const table of BACKUP_TABLES) {
    const rows: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    tables[table] = rows;
  }

  return {
    version: 1 as const,
    created_at: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    tables,
  };
});

export const restoreBackup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      backup: z.object({
        version: z.number(),
        tables: z.record(z.string(), z.array(z.record(z.string(), z.any()))),
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: { table: string; restored: number; skipped: number; error?: string }[] = [];

    for (const table of BACKUP_TABLES) {
      const rows = data.backup.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results.push({ table, restored: 0, skipped: 0 });
        continue;
      }
      let restored = 0;
      let skipped = 0;
      let firstError: string | undefined;
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin
          .from(table)
          .upsert(chunk as any, { onConflict: CONFLICT_KEY[table] });
        if (error) {
          // tenta linha a linha para salvar o máximo possível
          for (const row of chunk) {
            const { error: rowErr } = await supabaseAdmin
              .from(table)
              .upsert(row as any, { onConflict: CONFLICT_KEY[table] });
            if (rowErr) {
              skipped += 1;
              firstError ??= rowErr.message;
            } else restored += 1;
          }
        } else {
          restored += chunk.length;
        }
      }
      results.push({ table, restored, skipped, error: firstError });
    }

    return { results };
  });
