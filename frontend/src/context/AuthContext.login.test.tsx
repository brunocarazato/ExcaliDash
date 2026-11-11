import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { USER_KEY } from "../utils/authStorage";

const mockAuthStatus = vi.fn();
const mockAuthMe = vi.fn();
const mockAuthRefresh = vi.fn();
const mockAuthLogin = vi.fn();

vi.mock("../api", () => ({
  authStatus: () => mockAuthStatus(),
  authMe: () => mockAuthMe(),
  authRefresh: () => mockAuthRefresh(),
  authLogout: vi.fn(),
  authLogin: (...args: unknown[]) => mockAuthLogin(...args),
  authRegister: vi.fn(),
  isAxiosError: vi.fn(() => false),
}));

let loginResult: Promise<unknown> | null = null;

const Probe = () => {
  const { login, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <button
        type="button"
        onClick={() => {
          loginResult = login("user@example.com", "password");
        }}
      >
        login
      </button>
    </div>
  );
};

const renderProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );

describe("AuthProvider.login response validation", () => {
  beforeEach(() => {
    localStorage.clear();
    loginResult = null;
    vi.clearAllMocks();
    mockAuthStatus.mockResolvedValue({ authEnabled: true });
    mockAuthMe.mockRejectedValue(new Error("unauthorized"));
    mockAuthRefresh.mockRejectedValue(new Error("unauthorized"));
  });

  it("rejects with a clear error and does not persist 'undefined' when the response has no user", async () => {
    mockAuthLogin.mockResolvedValue({});

    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await expect(loginResult).rejects.toThrow(/server response was invalid/i);
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("persists a valid user object", async () => {
    const user = { id: "u1", email: "user@example.com", name: "User" };
    mockAuthLogin.mockResolvedValue({ user });

    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await expect(loginResult).resolves.toEqual(user);
    expect(JSON.parse(localStorage.getItem(USER_KEY) as string)).toEqual(user);
  });
});
