import { describe, expect, it } from "vitest";
import { getPlaygroundPaths } from "../data/playground-path";

describe("case Playground paths", () => {
  it("uses the same route pattern for English and Russian cases", () => {
    expect(getPlaygroundPaths("/pye-try-on-app/", "pye-try-on-app")).toEqual({
      casePath: "/pye-try-on-app/",
      playgroundPath: "/pye-try-on-app/playground/",
      isOpen: false,
    });
    expect(getPlaygroundPaths("/ru/example/playground/", "example")).toEqual({
      casePath: "/ru/example/",
      playgroundPath: "/ru/example/playground/",
      isOpen: true,
    });
  });

  it("does not treat another case or nested page as this Playground", () => {
    expect(getPlaygroundPaths("/other/playground/", "pye-try-on-app")).toBeNull();
    expect(getPlaygroundPaths("/pye-try-on-app/other/", "pye-try-on-app")).toBeNull();
  });
});
