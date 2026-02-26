import { createAppError } from "@services/errorService";

describe("errorService – createAppError", () => {
it ("should return a default error object when no parameters are provided", () => {
    const err = createAppError({});
    expect(err.name).toEqual("InternalServerError");
    expect(err.code).toBe(500);
});
});