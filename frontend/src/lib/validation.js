import { z } from "zod";

// Mirrors backend serializers.PLAYER_RE / ZONE_RE exactly so we fail fast client-side.
export const PLAYER_RE = /^[A-Za-z0-9_-]{4,64}$/;
export const ZONE_RE = /^[A-Za-z0-9_-]{0,64}$/;

export const identitySchema = z.object({
  player_id: z
    .string()
    .trim()
    .regex(PLAYER_RE, "Player ID must be 4–64 letters, numbers, underscores, or dashes."),
  zone_id: z
    .string()
    .trim()
    .regex(ZONE_RE, "Zone ID may only contain letters, numbers, underscores, or dashes."),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});
