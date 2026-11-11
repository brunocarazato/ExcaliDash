import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "./Login";
import { USER_KEY } from "../utils/authStorage";

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../api", () => ({
  startOidcSignIn: vi.fn(),
  api: {
    post: vi.fn(),
  },
  isAxiosError: vi.fn(() => false),
}));

vi.mock("../components/Logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const baseAuthState = {
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  authEnabled: true,
  registrationEnabled: true,
  authStatusError: null,
  retryAuthStatus: vi.fn(),
  oidcEnabled: false,
  oidcEnforced: false,
  oidcProvider: "OIDC",
  bootstrapRequired: false,
  authOnboardingRequired: false,
  isAuthenticated: false,
  loading: false,
  user: null,
};

describe("Login with a corrupted stored user", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not fail when excalidash-user contains the literal string 'undefined'", async () => {
    localStorage.setItem(USER_KEY, "undefined");
    const login = vi.fn().mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
    });
    mockUseAuth.mockReturnValue({ ...baseAuthState, login });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    expect(screen.queryByText(/not valid json/i)).not.toBeInTheDocument();
  });

  it("keeps the user on the reset-password step when the server requires a reset", async () => {
    localStorage.setItem(USER_KEY, "undefined");
    const login = vi.fn().mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      mustResetPassword: true,
    });
    mockUseAuth.mockReturnValue({ ...baseAuthState, login });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });
});
