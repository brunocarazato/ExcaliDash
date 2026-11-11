import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredUser,
  readStoredUser,
  USER_KEY,
  writeStoredUser,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null and clears the key when the stored value is the literal 'undefined'", () => {
    localStorage.setItem(USER_KEY, "undefined");

    expect(readStoredUser()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("returns null and clears the key when the stored value is the literal 'null'", () => {
    localStorage.setItem(USER_KEY, "null");

    expect(readStoredUser()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("returns null and clears the key when the stored value is invalid JSON", () => {
    localStorage.setItem(USER_KEY, "{not valid json");

    expect(readStoredUser()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("returns null and clears the key when the stored value is not a JSON object", () => {
    localStorage.setItem(USER_KEY, JSON.stringify(["not", "a", "user"]));

    expect(readStoredUser()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("never writes undefined or null values", () => {
    writeStoredUser(undefined);
    expect(localStorage.getItem(USER_KEY)).toBeNull();

    writeStoredUser(null);
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("round-trips a valid user object", () => {
    const user = { id: "u1", email: "user@example.com", name: "User" };

    writeStoredUser(user);

    expect(readStoredUser()).toEqual(user);
  });

  it("clearStoredUser removes the key", () => {
    writeStoredUser({ id: "u1" });

    clearStoredUser();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});
