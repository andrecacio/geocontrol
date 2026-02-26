import request from "supertest";
import { app } from "@app";
import * as authService from "@services/authService";
import * as userController from "@controllers/userController";
import { UserType } from "@models/UserType";
import { User as UserDTO } from "@dto/User";
import { UnauthorizedError } from "@models/errors/UnauthorizedError";
import { InsufficientRightsError } from "@models/errors/InsufficientRightsError";
import { ConflictError } from "@errors/ConflictError";
import { NotFoundError } from "@errors/NotFoundError";
import { BadRequest } from "express-openapi-validator/dist/openapi.validator";


jest.mock("@services/authService");
jest.mock("@controllers/userController");

describe("UserRoutes integration", () => {
  const token       = "Bearer faketoken";
  const adminToken  = "Bearer admintoken";
  const viewerToken = "Bearer viewertoken";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("get all users", async () => {
    const mockUsers: UserDTO[] = [
      { username: "admin", type: UserType.Admin },
      { username: "viewer", type: UserType.Viewer }
    ];

    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (userController.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUsers);
    expect(authService.processToken).toHaveBeenCalledWith(token, [
      UserType.Admin
    ]);
    expect(userController.getAllUsers).toHaveBeenCalled();
  });

  it('GET /users → 500 se controller lancia errore', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (userController.getAllUsers as jest.Mock).mockRejectedValue(new Error('boom'));
  
    const res = await request(app).get('/api/v1/users').set('Authorization', token);
  
    expect(res.status).toBe(500);
   
  });

  it("get all users: 401 UnauthorizedError", async () => {
    (authService.processToken as jest.Mock).mockImplementation(() => {
      throw new UnauthorizedError("Unauthorized: No token provided");
    });

    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", "Bearer invalid");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Unauthorized/);
  });

  it("get all users: 403 InsufficientRightsError", async () => {
    (authService.processToken as jest.Mock).mockImplementation(() => {
      throw new InsufficientRightsError("Forbidden: Insufficient rights");
    });

    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", token);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Insufficient rights/);
  });
  describe("POST /users", () => {
    const newUser = { username: "neo", password: "password", type: "viewer" };

    it("201 con Admin", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (userController.createUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", adminToken)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(userController.createUser).toHaveBeenCalledWith(newUser);
    });

    it("409 se duplicato", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (userController.createUser as jest.Mock).mockRejectedValue(new ConflictError("dup"));

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", adminToken)
        .send(newUser);

      expect(res.status).toBe(409);
      expect(res.body.name).toBe("ConflictError");
    });

    it("400 body mancante", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (userController.createUser as jest.Mock).mockRejectedValue(
        new BadRequest({ message: "bad", overrideStatus: 400, path: "", errors: [] })
      );

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", adminToken)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /users/:username", () => {
    const toDelete = "viewer";

    it("204 con Admin", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (userController.deleteUser as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/users/${toDelete}`)
        .set("Authorization", adminToken);

      expect(res.status).toBe(204);
    });

    it("404 se username assente", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (userController.deleteUser as jest.Mock).mockRejectedValue(new NotFoundError("missing"));

      const res = await request(app)
        .delete(`/api/v1/users/${toDelete}`)
        .set("Authorization", adminToken);

      expect(res.status).toBe(404);
      expect(res.body.name).toBe("NotFoundError");
    });

    it("403 con Viewer", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError("forbidden");
      });

      const res = await request(app)
        .delete(`/api/v1/users/${toDelete}`)
        .set("Authorization", viewerToken);

      expect(res.status).toBe(403);
      expect(res.body.name).toBe("InsufficientRightsError");
    });
  });
});
