export const isEmailDomainAllowed = (
  email: string,
  allowedDomains: string[],
): boolean => {
  if (allowedDomains.length === 0) return true;

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) return false;

  const domain = normalizedEmail.slice(atIndex + 1);
  return allowedDomains.includes(domain);
};

export const formatAllowedEmailDomains = (allowedDomains: string[]): string =>
  allowedDomains.map((domain) => `@${domain}`).join(", ");
