import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/forms";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/lista?mes=2026-11", "/dashboard")).toBe(
      "/lista?mes=2026-11",
    );
  });

  it("recusa URLs externas e caminhos protocol-relative", () => {
    expect(safeRedirectPath("https://example.com", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("//example.com", "/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("\\\\example.com", "/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("", "/dashboard")).toBe("/dashboard");
  });
});
