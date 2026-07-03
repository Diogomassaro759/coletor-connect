import { describe, it, expect, vi } from "vitest";
import {
  resolveFirstLoginRedirect,
  performPasswordChangeAndLogout,
  TROCAR_SENHA_PATH,
  AUTH_PATH,
} from "./auth-flow";

describe("resolveFirstLoginRedirect (first-login guard)", () => {
  it("redireciona para /admin/trocar-senha quando must_change_password é true", () => {
    expect(
      resolveFirstLoginRedirect({ mustChangePassword: true, pathname: "/admin" }),
    ).toBe(TROCAR_SENHA_PATH);
    expect(
      resolveFirstLoginRedirect({ mustChangePassword: true, pathname: "/admin/perfil" }),
    ).toBe(TROCAR_SENHA_PATH);
  });

  it("não redireciona quando o usuário já está em /admin/trocar-senha", () => {
    expect(
      resolveFirstLoginRedirect({ mustChangePassword: true, pathname: TROCAR_SENHA_PATH }),
    ).toBeNull();
  });

  it("não redireciona quando must_change_password é false", () => {
    expect(
      resolveFirstLoginRedirect({ mustChangePassword: false, pathname: "/admin" }),
    ).toBeNull();
  });
});

describe("performPasswordChangeAndLogout (fluxo pós-troca)", () => {
  const validPwd = "Senha123!";
  const makeDeps = () => ({
    updatePassword: vi.fn(async () => ({ error: null })),
    clearMustChangePassword: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    navigate: vi.fn(),
  });

  it("atualiza senha, limpa must_change_password, desloga e envia para /auth", async () => {
    const deps = makeDeps();
    await performPasswordChangeAndLogout(deps, "user-1", validPwd, validPwd);

    expect(deps.updatePassword).toHaveBeenCalledWith(validPwd);
    expect(deps.clearMustChangePassword).toHaveBeenCalledWith("user-1");
    expect(deps.signOut).toHaveBeenCalledOnce();
    expect(deps.navigate).toHaveBeenCalledWith(AUTH_PATH);

    // ordem: signOut deve ocorrer antes do navigate
    const signOutOrder = deps.signOut.mock.invocationCallOrder[0];
    const navigateOrder = deps.navigate.mock.invocationCallOrder[0];
    expect(signOutOrder).toBeLessThan(navigateOrder);
  });

  it("rejeita senha com menos de 8 caracteres", async () => {
    const deps = makeDeps();
    await expect(
      performPasswordChangeAndLogout(deps, "u", "Ab1", "Ab1"),
    ).rejects.toThrow(/Mínimo 8/);
    expect(deps.updatePassword).not.toHaveBeenCalled();
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("rejeita senha sem maiúsculas/minúsculas/números", async () => {
    const deps = makeDeps();
    await expect(
      performPasswordChangeAndLogout(deps, "u", "senhasemnumero", "senhasemnumero"),
    ).rejects.toThrow(/maiúsculas/);
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("rejeita quando confirmação não confere", async () => {
    const deps = makeDeps();
    await expect(
      performPasswordChangeAndLogout(deps, "u", validPwd, "Outra123!"),
    ).rejects.toThrow(/não coincidem/);
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("propaga erro do Supabase e não desloga o usuário", async () => {
    const deps = makeDeps();
    deps.updatePassword = vi.fn(async () => ({ error: { message: "Falhou no servidor" } }));
    await expect(
      performPasswordChangeAndLogout(deps, "u", validPwd, validPwd),
    ).rejects.toThrow("Falhou no servidor");
    expect(deps.clearMustChangePassword).not.toHaveBeenCalled();
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});
