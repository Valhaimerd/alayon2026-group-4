// Enrollment is optional. Once enabled, verified factors require an AAL2 session.
export function requiresMfa(
  factors: { status: string }[] | undefined,
  currentLevel: string | null,
) {
  return !!factors?.some((factor) => factor.status === "verified") && currentLevel !== "aal2";
}

export function passwordError(password: string, confirmation: string) {
  if (password.length < 8) return "Use at least 8 characters for your new password.";
  if (password.length > 128) return "Use no more than 128 characters.";
  if (password !== confirmation) return "The new passwords do not match.";
  return null;
}
