/**
 * Pure helpers for the first-login password change flow.
 * Extracted so unit tests can exercise the decision logic without
 * bootstrapping the full TanStack Router + Supabase runtime.
 */

export const TROCAR_SENHA_PATH = "/admin/trocar-senha";
export const AUTH_PATH = "/auth";

/**
 * Given the current authenticated location and whether the profile has
 * `must_change_password = true`, return the path we must redirect to
 * (or `null` when the user is allowed to stay where they are).
 */
export function resolveFirstLoginRedirect(input: {
  mustChangePassword: boolean;
  pathname: string;
}): string | null {
  if (input.mustChangePassword && input.pathname !== TROCAR_SENHA_PATH) {
    return TROCAR_SENHA_PATH;
  }
  return null;
}

export interface PasswordChangeDeps {
  updatePassword: (newPassword: string) => Promise<{ error?: { message: string } | null }>;
  clearMustChangePassword: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  navigate: (to: string) => void;
}

/**
 * Validate + apply a new password on first login, then sign the user
 * out and send them back to /auth so they log in with the new password.
 */
export async function performPasswordChangeAndLogout(
  deps: PasswordChangeDeps,
  userId: string,
  next: string,
  confirm: string,
): Promise<void> {
  if (next.length < 8) throw new Error("Mínimo 8 caracteres.");
  if (!/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/\d/.test(next)) {
    throw new Error("Use letras maiúsculas, minúsculas e números.");
  }
  if (next !== confirm) throw new Error("As senhas não coincidem.");

  const { error } = await deps.updatePassword(next);
  if (error) throw new Error(error.message);

  await deps.clearMustChangePassword(userId);
  await deps.signOut();
  deps.navigate(AUTH_PATH);
}
