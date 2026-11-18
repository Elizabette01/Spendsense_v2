import { describe, expect, it } from "vitest";

import { niceTicks } from "./chart-colors";

describe("niceTicks", () => {
  it.each([
    [295_000, [0, 100_000, 200_000, 300_000]],
    [260_000, [0, 100_000, 200_000, 300_000]],
    [90_000, [0, 25_000, 50_000, 75_000, 100_000]],
    [0, [0]],
  ])("max %d → %j", (max, expected) => {
    expect(niceTicks(max)).toEqual(expected);
  });
});
