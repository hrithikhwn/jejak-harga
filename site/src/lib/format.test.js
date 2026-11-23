import { expect, test } from "vitest";
import { direction, formatMonth, formatPercent, formatRM, formatRMChange } from "./format.js";

test("prices ending in half a sen round up, like the basket totals", () => {
  // Real prices from items.json. (8.825).toFixed(2) gives "8.82" and (29.395).toFixed(2)
  // gives "29.39", because the stored numbers are a hair under the half sen.
  expect(formatRM(8.825)).toBe("RM8.83");
  expect(formatRM(29.395)).toBe("RM29.40");
  expect(formatRM(21.495)).toBe("RM21.50");
  expect(formatRM(2.995)).toBe("RM3.00");
  expect(formatRM(144.98)).toBe("RM144.98");
  expect(formatRM(null)).toBe("–");
});

test("changes always carry a sign", () => {
  expect(formatPercent(27.8)).toBe("+28%");
  expect(formatPercent(-16.3)).toBe("−16%");
  expect(formatPercent(0.2)).toBe("0%");
  expect(formatRMChange(10.87)).toBe("+RM10.87");
  expect(direction(0.2)).toBe("flat");
  expect(direction(-16.3)).toBe("down");
});

test("months use each language's short names", () => {
  const t = (key) => ({ "month.8": "Ogo" })[key];
  expect(formatMonth("2025-08", t)).toBe("Ogo 2025");
});
