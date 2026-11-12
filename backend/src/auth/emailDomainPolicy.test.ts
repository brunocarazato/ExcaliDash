import { describe, expect, it } from "vitest";
import {
  buildEmailDomainErrorMessage,
  isEmailDomainAllowed,
  normalizeEmailDomain,
  parseAllowedEmailDomains,
} from "./emailDomainPolicy";

describe("emailDomainPolicy", () => {
  it("allows any domain when REGISTRATION_EMAIL_DOMAINS is unset", () => {
    expect(parseAllowedEmailDomains(undefined)).toEqual([]);
  });

  it("treats empty or * as no restriction", () => {
    expect(parseAllowedEmailDomains("")).toEqual([]);
    expect(parseAllowedEmailDomains("   ")).toEqual([]);
    expect(parseAllowedEmailDomains("*")).toEqual([]);
  });

  it("normalizes domains and removes duplicates", () => {
    expect(
      parseAllowedEmailDomains("@DIGIX.COM.BR, digix.com.br, Example.com"),
    ).toEqual(["digix.com.br", "example.com"]);
  });

  it("throws on invalid domain entries", () => {
    expect(() => parseAllowedEmailDomains("not a domain")).toThrow(
      /Invalid REGISTRATION_EMAIL_DOMAINS/,
    );
  });

  it("matches email domains case-insensitively", () => {
    const allowed = ["digix.com.br"];
    expect(isEmailDomainAllowed("dev@digix.com.br", allowed)).toBe(true);
    expect(isEmailDomainAllowed("DEV@DIGIX.COM.BR", allowed)).toBe(true);
    expect(isEmailDomainAllowed("dev@sub.digix.com.br", allowed)).toBe(false);
    expect(isEmailDomainAllowed("dev@gmail.com", allowed)).toBe(false);
    expect(isEmailDomainAllowed("not-an-email", allowed)).toBe(false);
  });

  it("allows any email when the allowlist is empty", () => {
    expect(isEmailDomainAllowed("dev@gmail.com", [])).toBe(true);
  });

  it("builds a helpful error message", () => {
    expect(buildEmailDomainErrorMessage(["digix.com.br", "example.com"])).toBe(
      "Registration is restricted to company email addresses (@digix.com.br, @example.com).",
    );
  });

  it("normalizes a single domain", () => {
    expect(normalizeEmailDomain("@Digix.com.br")).toBe("digix.com.br");
    expect(normalizeEmailDomain("bad domain")).toBeNull();
  });
});
