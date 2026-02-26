import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import exp from "constants";

describe("GET /users (e2e)", () => {
  let token: string;

  beforeAll(async () => {
    await beforeAllE2e();
    token = generateToken(TEST_USERS.admin);
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("get all users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);

    const usernames = res.body.map((u: any) => u.username).sort();
    const types = res.body.map((u: any) => u.type).sort();

    expect(usernames).toEqual(["admin", "operator", "viewer"]);
    expect(types).toEqual(["admin", "operator", "viewer"]);
  });

  describe('Auth error & role checks', () => {
    it('GET users → 401 senza token', async () => {
      const r = await request(app).get('/api/v1/users').expect(401);
      expect (r.status).toBe(401);
      expect(r.body.name).toBe('Unauthorized');
    });
  
    it('GET users → 403 con token Viewer', async () => {
      const viewerToken = generateToken(TEST_USERS.viewer);
      const r = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
      expect(r.status).toBe(403);
      expect(r.body.name).toBe('InsufficientRightsError');
    });
  });
  
  describe('CRUD utente', () => {
    const adminToken = `Bearer ${generateToken(TEST_USERS.admin)}`;
    const newUser = {
      username: 'e2e-user',
      password: 'secret',
      type: 'viewer'
    };
  
    it('POST /users → 201', async () => {
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', adminToken)
        .send(newUser)
        .expect(201);
    });
  
    it('POST dup → 409', async () => {
     const r = await request(app)
        .post('/api/v1/users')
        .set('Authorization', adminToken)
        .send(newUser)
        .expect(409);
      expect(r.status).toBe(409);
      expect(r.body.name).toBe('ConflictError');
    });
  
    // it('PATCH /users/:username → 200 cambio pwd', async () => {
    //   await request(app)
    //     .patch(`/api/v1/users/${newUser.username}`)
    //     .set('Authorization', adminToken)
    //     .send({ password: 'newpass' })
    //     .expect(200);
    // });
  
    it('DELETE /users/:username → 204 e poi 404', async () => {
      await request(app)
        .delete(`/api/v1/users/${newUser.username}`)
        .set('Authorization', adminToken)
        .expect(204);
  
      const r =await request(app)
        .get(`/api/v1/users/${newUser.username}`)
        .set('Authorization', adminToken)
        .expect(404);
      expect(r.status).toBe(404);
      expect(r.body.name).toBe('NotFoundError');
    });
  });
  
});
