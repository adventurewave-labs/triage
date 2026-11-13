import { describe, expect, it } from "vitest";
import { esc, safeBack } from "../src/web/html.js";

describe("web html helpers", () => {
  it("esc neutralizes every HTML-significant character", () => {
    expect(esc(`<a href="x" onclick='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
    );
    expect(esc(null)).toBe("null");
  });

  it("safeBack keeps same-origin paths only", () => {
    expect(safeBack("/")).toBe("/");
    expect(safeBack("/company/acme%20co")).toBe("/company/acme%20co");
    expect(safeBack("//evil.com")).toBe("/");
    expect(safeBack("/\\evil.com")).toBe("/");
    expect(safeBack("/\t/evil.com")).toBe("/");
    expect(safeBack("https://evil.com")).toBe("/");
    expect(safeBack("evil")).toBe("/");
    expect(safeBack(undefined)).toBe("/");
  });
});
