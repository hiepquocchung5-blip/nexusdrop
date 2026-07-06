import { describe, expect, it } from "vitest";
import { identitySchema, loginSchema } from "./validation";

describe("identitySchema", () => {
  it("accepts production-shaped game identities", () => {
    expect(identitySchema.safeParse({ player_id: "Player_1234", zone_id: "2214" }).success).toBe(true);
    expect(identitySchema.safeParse({ player_id: "PUBG889100", zone_id: "" }).success).toBe(true);
  });

  it("rejects unsafe player ids", () => {
    expect(identitySchema.safeParse({ player_id: "bad id!", zone_id: "1" }).success).toBe(false);
    expect(identitySchema.safeParse({ player_id: "abc", zone_id: "" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires both credentials", () => {
    expect(loginSchema.safeParse({ username: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "admin", password: "demo" }).success).toBe(true);
  });
});
