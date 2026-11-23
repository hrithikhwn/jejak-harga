// The site adds up baskets itself (so items can be switched off). These tests check
// that, with every item on, its totals equal the pipeline's own basket files to the sen,
// in every month and every district, gaps included.
import fs from "node:fs";
import { describe, expect, test } from "vitest";
import {
  BASE_MONTH,
  compareWithState,
  districtBasket,
  scaledCpi,
  stateBasket,
  sumPrices,
} from "./basket.js";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../../public/data/${name}`, import.meta.url), "utf8"));
const items = read("items.json");
const itemDistricts = read("item_districts.json");
const allItems = new Set(items.items.map((item) => item.item_code));

describe("sumPrices", () => {
  test("rounds half a sen up, like the pipeline", () => {
    // 100.1 + 34.005 = 134.105 exactly. Plain addition gives a number that prints as
    // 134.105 but is stored a hair below it, so (100.1 + 34.005).toFixed(2) is "134.10".
    expect(sumPrices([100.1, 34.005])).toBe(134.11);
    expect(sumPrices([36.945, 2.995])).toBe(39.94);
    expect(sumPrices([1.234])).toBe(1.23);
  });

  test("gives no basket when an item has no price, or there are no items", () => {
    expect(sumPrices([2.85, null])).toBeNull();
    expect(sumPrices([])).toBeNull();
  });
});

describe("with every item switched on", () => {
  test("the state basket matches basket_state.json in every month", () => {
    const expected = read("basket_state.json");
    const computed = stateBasket(items, allItems);
    expect(computed).toHaveLength(expected.length);
    expected.forEach((row, i) => {
      expect(items.months[i]).toBe(row.month);
      expect(computed[i], row.month).toBe(row.basket_rm);
    });
  });

  test("each district's basket matches basket_districts.json in every month", () => {
    const expected = read("basket_districts.json");
    for (const row of expected) {
      const i = items.months.indexOf(row.month);
      const computed = districtBasket(itemDistricts, row.district, allItems)[i];
      expect(computed, `${row.district} ${row.month}`).toBe(row.basket_rm);
    }
    expect(expected.length).toBe(Object.keys(itemDistricts.districts).length * items.months.length);
  });
});

describe("compareWithState", () => {
  test("a gap under 2% counts as about the same", () => {
    // Nov 2026: Gombak RM144.08 and Petaling Jaya RM142.45 against Selangor's RM144.98
    expect(compareWithState(144.08, 144.98)).toMatchObject({ kind: "same", amount: 0.9 });
    expect(compareWithState(142.45, 144.98)).toMatchObject({ kind: "same", amount: 2.53 });
  });

  test("bigger gaps are dearer or cheaper", () => {
    const klang = compareWithState(137.39, 144.98);
    expect(klang).toMatchObject({ kind: "cheaper", amount: 7.59 });
    expect(klang.percent).toBeCloseTo(-5.24, 2);
    expect(compareWithState(151.13, 144.98)).toMatchObject({ kind: "dearer", amount: 6.15 });
    expect(compareWithState(102, 100).kind).toBe("dearer"); // exactly 2% is no longer "same"
  });
});

test("the scaled CPI line meets the basket in BASE_MONTH", () => {
  const basket = stateBasket(items, allItems);
  const cpi = scaledCpi(items.months, read("cpi.json"), basket);
  const base = items.months.indexOf(BASE_MONTH);
  expect(cpi[base]).toBeCloseTo(basket[base], 2);
});
