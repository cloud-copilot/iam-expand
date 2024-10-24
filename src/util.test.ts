import { describe, expect, it } from "vitest";
import { unescapeUnicodeCharacters } from "./util.js";

describe("unescapeUnicodeCharacters", () => {
  it("should unescape unicode characters", () => {
    //Given a string with unicode escape sequences
    const input = "\\u0041\\u0042\\u0043"; // ABC

    //When unescaping the unicode characters
    const result = unescapeUnicodeCharacters(input);

    //Then the result should be the unescaped string
    expect(result).toBe("ABC");
  });
})