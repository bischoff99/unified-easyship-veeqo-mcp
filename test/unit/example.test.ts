import { describe, it, expect } from "vitest";

describe("Example Unit Test", () => {
  it("should pass basic assertion", () => {
    expect(2 + 2).toBe(4);
  });

  it("should handle string operations", () => {
    const str = "hello world";
    expect(str.toUpperCase()).toBe("HELLO WORLD");
    expect(str.includes("world")).toBe(true);
  });

  it("should work with arrays", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr.filter((n) => n > 3)).toEqual([4, 5]);
  });

  it("should handle async operations", async () => {
    const promise = Promise.resolve("success");
    const result = await promise;
    expect(result).toBe("success");
  });
});
