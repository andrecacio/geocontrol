import request from "supertest";
import { app } from "@app";

import * as authController from "@controllers/authController";
import { UnauthorizedError } from "@errors/UnauthorizedError";
import { BadRequest } from "express-openapi-validator/dist/openapi.validator";

jest.mock("@controllers/authController");

describe("AuthRoutes integration", () => {
  const api = "/api/v1/auth";



  it("POST /auth → 200 + TokenDTO", async () => {
    (authController.getToken as jest.Mock).mockResolvedValue({ token: "signed.jwt" });

    const res = await request(app)
      .post(api)
      .send({ username: "john", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: "signed.jwt" });
    expect(authController.getToken).toHaveBeenCalledWith({
      username: "john",
      password: "password123",
    });
  });

  /* ------------------------------- 401 ERROR --------------------------- */
  it("POST /auth → 401 se password errata", async () => {
    (authController.getToken as jest.Mock).mockRejectedValue(
      new UnauthorizedError("Invalid password")
    );

    const res = await request(app)
      .post(api)
      .send({ username: "john", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.name).toBe("UnauthorizedError");
  });

  /* ------------------------------- 400 ERROR --------------------------- */
  it("POST /auth → 400 input non valido", async () => {
    (authController.getToken as jest.Mock).mockRejectedValue(
      new BadRequest({ message: "bad", overrideStatus: 400, path: "", errors: [] })
    );

    const res = await request(app)
      .post(api)
      .send({ foo: "bar" });               // corpo non valido

    expect(res.status).toBe(400);          // nessun check sul 'name' (varia)
  });
});
