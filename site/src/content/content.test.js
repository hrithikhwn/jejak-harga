// Hand-written content: both languages present, sources linked, and every number a
// finding quotes is filled from the data.
import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { fillFinding } from "../lib/content.js";
import events from "./events.json";
import findings from "./findings.json";
import names from "./item_names.json";

const items = JSON.parse(fs.readFileSync(new URL("../../public/data/items.json", import.meta.url), "utf8"));
const LANGUAGES = ["ms", "en"];

describe("events.json", () => {
  test.each(events)("$date has both languages, a source and a month in the data", (event) => {
    for (const lang of LANGUAGES) expect(event.label[lang]?.trim()).toBeTruthy();
    expect(event.source.name).toBeTruthy();
    expect(event.source.url).toMatch(/^https:\/\//);
    expect(items.months).toContain(event.date.slice(0, 7));
  });
});

describe("findings.json", () => {
  test.each(findings)("item $item_code: placeholders fill in both languages", (finding) => {
    const item = items.items.find((candidate) => candidate.item_code === finding.item_code);
    expect(item).toBeDefined();
    for (const lang of LANGUAGES) {
      for (const text of [finding.title[lang], finding.text[lang]]) {
        expect(fillFinding(text, item, items.months)).not.toMatch(/[{}]/);
      }
    }
    expect(finding.source.url).toMatch(/^https:\/\//);
  });
});

test("every basket item has a short name", () => {
  const missing = items.items.filter((item) => !names[String(item.item_code)]);
  expect(missing.map((item) => item.item_code)).toEqual([]);
});
