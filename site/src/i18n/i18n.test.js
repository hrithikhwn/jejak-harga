// Fails the build if the two languages drift apart (WEB_UI.md: "A test fails the
// build if a key is missing from either file"), or if the code asks for a key that
// doesn't exist.
import fs from "node:fs";
import { describe, expect, test } from "vitest";
import en from "./en.json";
import ms from "./ms.json";

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("ms.json and en.json", () => {
  test("have the same keys", () => {
    const missingFromMs = Object.keys(en).filter((key) => !(key in ms));
    const missingFromEn = Object.keys(ms).filter((key) => !(key in en));
    expect(missingFromMs, "keys missing from ms.json").toEqual([]);
    expect(missingFromEn, "keys missing from en.json").toEqual([]);
  });

  test("have no empty strings", () => {
    const empty = [...Object.entries(en), ...Object.entries(ms)].filter(([, text]) => !text.trim());
    expect(empty).toEqual([]);
  });

  test("use the same {placeholders} for each key", () => {
    const different = Object.keys(en).filter(
      (key) => key in ms && placeholders(en[key]).join() !== placeholders(ms[key]).join(),
    );
    expect(different).toEqual([]);
  });

  test("contain every key the components use", () => {
    // Keys are written as "section.name" string literals, also inside ternaries such as
    // t(failed ? "status.error" : "status.loading")
    const sections = "meta|status|nav|header|tabs|lang|hero|chart|findings|basket|districts|method|footer";
    const keyPattern = new RegExp(`"((?:${sections})\\.\\w+)"`, "g");
    const sourceDir = new URL("../", import.meta.url);
    const used = new Set();
    for (const file of fs.readdirSync(sourceDir, { recursive: true })) {
      if (!/\.jsx?$/.test(file) || file.endsWith(".test.js")) continue;
      const source = fs.readFileSync(new URL(file.replaceAll("\\", "/"), sourceDir), "utf8");
      for (const match of source.matchAll(keyPattern)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(50);
    expect([...used].filter((key) => !(key in en))).toEqual([]);
    // Month names are looked up as month.1 ... month.12
    for (let m = 1; m <= 12; m += 1) expect(en).toHaveProperty([`month.${m}`]);
  });
});
