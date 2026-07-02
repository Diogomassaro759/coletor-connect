import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// All server functions inherit requireSupabaseAuth (see src/start.ts), so
// context.supabase / context.userId are always present.

const ROLE_VALUES = ["admin", "recenseador", "consultor"] as const;

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error("Falha ao verificar permissões.");
  const isAdmin = !!data?.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Apenas administradores podem executar esta ação.");
}

const cpfRegex = /^\d{11}$/;

export const createOperationalUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      full_name: z.string().min(3),
      cpf: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v ? v.replace(/\D/g, "") : ""))
        .refine((v) => v === "" || cpfRegex.test(v), "CPF deve ter 11 dígitos numéricos"),
      birth_date: z.string().optional().nullable(),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["recenseador", "consultor", "admin"]),
      municipio_referencia: z.string().optional().nullable(),
      identificacao_profissional: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário.");
    }

    const newUserId = created.user.id;

    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      user_id: newUserId,
      full_name: data.full_name,
      cpf: data.cpf,
      birth_date: data.birth_date || null,
      email: data.email,
      municipio_referencia: data.municipio_referencia || null,
      identificacao_profissional: data.identificacao_profissional || null,
      must_change_password: true,
      created_by: (context as any).userId,
    });
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(`Erro ao criar perfil: ${profileErr.message}`);
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(`Erro ao atribuir papel: ${roleErr.message}`);
    }

    return { ok: true, user_id: newUserId };
  });

export const listOperationalUsers = createServerFn({ method: "GET" }).handler(
  async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "user_id, full_name, cpf, email, municipio_referencia, identificacao_profissional, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.user_id);
    let roleMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      for (const r of roles ?? []) {
        (roleMap[r.user_id] ??= []).push(r.role);
      }
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: roleMap[p.user_id] ?? [] }));
  },
);

export const deleteOperationalUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.user_id === (context as any).userId) {
      throw new Error("Você não pode excluir sua própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const VALID_ROLES = ROLE_VALUES;
