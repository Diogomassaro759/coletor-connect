import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// All server functions inherit requireSupabaseAuth (see src/start.ts), so
// context.supabase / context.userId are always present.

const ROLE_VALUES = ["admin", "recenseador", "consultor", "coordenador"] as const;
const AREA_VALUES = ["social", "juridico", "contabil", "infraestrutura"] as const;
const roleEnum = z.enum(ROLE_VALUES);
const areaEnum = z.enum(AREA_VALUES).optional().nullable();

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
      role: roleEnum,
      area: areaEnum,
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
      cpf: data.cpf || null,
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

    const areaValue =
      data.role === "consultor" || data.role === "coordenador" ? (data.area ?? null) : null;
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role, area: areaValue });
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
        .select("user_id, role, area")
        .in("user_id", ids);
      for (const r of roles ?? []) {
        (roleMap[r.user_id] ??= []).push(r.role);
      }
      var areaMap: Record<string, string | null> = {};
      for (const r of roles ?? []) {
        if ((r as any).area) areaMap[r.user_id] = (r as any).area;
      }
    }
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap[p.user_id] ?? [],
      area: (typeof areaMap !== "undefined" && areaMap[p.user_id]) || null,
    }));
  },
);

export const updateOperationalUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().min(3),
      email: z.string().email(),
      municipio_referencia: z.string().optional().nullable(),
      identificacao_profissional: z.string().optional().nullable(),
      role: roleEnum.optional(),
      area: areaEnum,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        municipio_referencia: data.municipio_referencia || null,
        identificacao_profissional: data.identificacao_profissional || null,
      })
      .eq("user_id", data.user_id);
    if (pErr) throw new Error(pErr.message);

    const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      email: data.email,
    });
    if (aErr) throw new Error(aErr.message);

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const areaValue =
        data.role === "consultor" || data.role === "coordenador" ? (data.area ?? null) : null;
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role, area: areaValue });
      if (rErr) throw new Error(rErr.message);
    }
    return { ok: true };
  });

export const getOperationalUser = createServerFn({ method: "GET" })
  .inputValidator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, cpf, email, municipio_referencia, identificacao_profissional")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    return { ...(p ?? {}), roles: (roles ?? []).map((r) => r.role) };
  });

export const resetOperationalUserPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ user_id: z.string().uuid(), new_password: z.string().min(8) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("user_id", data.user_id);
    return { ok: true };
  });

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
