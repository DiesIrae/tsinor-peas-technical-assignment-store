import { writeToObject } from "../src/nestUtils";

describe("writeToObject", () => {
  const getTestObject = () => ({
    a: true,
    b: { c: true, d: true },
  });

  it("should change existing object", () => {
    expect(writeToObject(getTestObject(), ["b", "c"], false)).toStrictEqual({
      ...getTestObject(),
      b: {
        c: false,
        d: true,
      },
    });
  });

  it("should create object", () => {
    expect(writeToObject(undefined, ["b", "c"], false)).toStrictEqual({
      b: {
        c: false,
      },
    });
  });

  it("should create nested object", () => {
    expect(writeToObject(getTestObject(), ["b", "e"], false)).toStrictEqual({
      ...getTestObject(),
      b: {
        c: true,
        d: true,
        e: false,
      },
    });
  });
});
