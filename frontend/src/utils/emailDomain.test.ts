import { describe, expect, it } from "vitest";
import {
  formatAllowedEmailDomains,
  isEmailDomainAllowed,
} from "./emailDomain";

describe("emailDomain utils", () => {
  it("matches allowed domains case-insensitively", () => {
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

  it("formats the allowed domains for display", () => {
    expect(formatAllowedEmailDomains(["digix.com.br", "example.com"])).toBe(
      "@digix.com.br, @example.com",
    );
  });
});
