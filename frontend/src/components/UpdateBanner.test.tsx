import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateBanner } from "./UpdateBanner";
import * as api from "../api";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    current: {
      authEnabled: true as boolean | null,
      user: { role: "ADMIN" } as { role?: string } | null,
    },
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth.current,
}));

vi.mock("../api", () => ({
  getUpdateInfo: vi.fn(),
}));

const updateInfo: api.UpdateInfo = {
  currentVersion: "1.0.0",
  channel: "stable",
  outboundEnabled: true,
  latestVersion: "9.9.9",
  latestUrl: null,
  publishedAt: null,
  isUpdateAvailable: true,
};

describe("UpdateBanner role visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(api.getUpdateInfo).mockResolvedValue(updateInfo);
    mockAuth.current = { authEnabled: true, user: { role: "ADMIN" } };
  });

  it("shows the update banner for admins", async () => {
    render(<UpdateBanner />);

    await waitFor(() => {
      expect(api.getUpdateInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Update available")).toBeInTheDocument();
  });

  it("hides the update banner for non-admin users without fetching updates", () => {
    mockAuth.current = { authEnabled: true, user: { role: "USER" } };

    render(<UpdateBanner />);

    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
    expect(api.getUpdateInfo).not.toHaveBeenCalled();
  });

  it("shows the update banner when authentication is disabled", async () => {
    mockAuth.current = { authEnabled: false, user: null };

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(api.getUpdateInfo).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Update available")).toBeInTheDocument();
  });
});
