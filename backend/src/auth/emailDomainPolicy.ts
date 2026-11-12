export const normalizeEmailDomain = (value: string): string | null => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\.+$/, "");

  if (normalized.length === 0) return null;

  const validDomainPattern =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;
  if (!validDomainPattern.test(normalized)) return null;

  return normalized;
};

/**
 * Parses REGISTRATION_EMAIL_DOMAINS.
 * - Unset, empty, or "*": no restriction (any email domain allowed).
 * - Comma-separated values: exact domain allowlist.
 */
export const parseAllowedEmailDomains = (rawValue: string | undefined): string[] => {
  if (rawValue === undefined) {
    return [];
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0 || trimmed === "*") {
    return [];
  }

  const domains: string[] = [];
  for (const entry of trimmed.split(",")) {
    if (entry.trim().length === 0) continue;
    const domain = normalizeEmailDomain(entry);
    if (!domain) {
      throw new Error(
        `Invalid REGISTRATION_EMAIL_DOMAINS entry: "${entry.trim()}". Use comma-separated domains like "digix.com.br", or "*" to allow any domain.`,
      );
    }
    domains.push(domain);
  }

  if (domains.length === 0) {
    throw new Error(
      'Invalid REGISTRATION_EMAIL_DOMAINS: expected at least one domain or "*" to allow all.',
    );
  }

  return Array.from(new Set(domains));
};

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

export const buildEmailDomainErrorMessage = (allowedDomains: string[]): string => {
  if (allowedDomains.length === 0) return "";
  const list = allowedDomains.map((domain) => `@${domain}`).join(", ");
  return `Registration is restricted to company email addresses (${list}).`;
};
