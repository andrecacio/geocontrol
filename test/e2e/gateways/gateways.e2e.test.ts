import request from 'supertest';
import { app } from '@app';
import { generateToken } from '@services/authService';
import {
  beforeAllE2e,
  afterAllE2e,
  TEST_USERS
} from '@test/e2e/lifecycle';
import { NetworkRepository } from '@repositories/NetworkRepository';
import { GatewayRepository } from '@repositories/GatewayRepository';
import { SensorRepository } from '@repositories/SensorRepository';

describe('Gateways e2e', () => {
  /* --------------------------------------------------------------- fixture */
  const GW1 = 'AA:BB:CC:DD:EE:FA';
  const GW2 = 'AA:BB:CC:DD:EE:GG';
  const gatewaytPayload = {
    macAddress: GW1,
    name: 'E2E Gateways',
    description: 'Created by the e2e suite'
  };

  /* ------------------------------------------------------------- auth token */
  let admin: string;
  let viewer: string;

  beforeAll(async () => {
    await beforeAllE2e();
    admin = generateToken(TEST_USERS.admin);
    viewer = generateToken(TEST_USERS.viewer);

    const networkRepo = new NetworkRepository();
    await networkRepo.createNetwork("test-net", "Test Network", "E2E test network");
    await networkRepo.createNetwork("test-net-2", "Test Network 2", "E2E test network 2");
    await networkRepo.createNetwork("test-net-3", "Test Network 3", "E2E test network 3");

    const gatewayRepo = new GatewayRepository();
    await gatewayRepo.createGateway("test-net", "AA:BB:CC:DD:EE:FF", "Test Gateway", "E2E test gateway");
    await gatewayRepo.createGateway("test-net-2", "AA:BB:CC:DD:EE:GG", "Test Gateway 2", "E2E test gateway 2");
    await gatewayRepo.createGateway("test-net-3", "AA:BB:CC:DD:EE:HH", "Test Gateway 3", "E2E test gateway 3");
  });

  afterAll(afterAllE2e);

  const api = '/api/v1/networks/test-net/gateways';
  const apiNotFound = '/api/v1/networks/aaaaaaaaa/gateways';
  const auth = (tkn: string | undefined) =>
    tkn ? { Authorization: `Bearer ${tkn}` } : {};

  /* ------------------------------------------------------------- 1. CREATE */
  it('POST → 201 con Admin', async () => {
    const res = await request(app).post(api).set(auth(admin)).send(gatewaytPayload);
    expect(res.status).toBe(201);
  });

  it('POST dup → 409 (macAddress duplicato)', async () => {
    const res = await request(app).post(api).set(auth(admin)).send(gatewaytPayload);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.name).toBe("ConflictError");
  });

  it('POST dup → 409 (sensor macAddress duplicato)', async () => {
    const duplicateMacAddress = 'dasdadas';
    await request(app).post(`/api/v1/networks/test-net/gateways/AA:BB:CC:DD:EE:FF/sensors`).set(auth(admin)).send({ macAddress: duplicateMacAddress });
    const res = await request(app).post(api).set(auth(admin)).send({ ...gatewaytPayload, macAddress: duplicateMacAddress });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.name).toBe("ConflictError");
  });

  it('POST → 403 con Viewer', async () => {
    const res = await request(app).post(api).set(auth(viewer)).send(gatewaytPayload);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('POST → 400 body incompleto', async () => {
    const res = await request(app).post(api).set(auth(admin)).send({ name: 'x', description: 'aaaa' });
    expect(res.status).toBe(400);
  });

  it('POST → 404 network non esistente', async () => {
    const res = await request(app).post(apiNotFound).set(auth(admin)).send(gatewaytPayload);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* ----------------------------------------------------------- 2. READ LIST */
  it('GET /gateways → 200 + fixture & nuova rete', async () => {
    const res = await request(app).get(api).set(auth(viewer));
    expect(res.status).toBe(200);
    const codes = res.body.map((n: any) => n.macAddress);
    expect(codes).toEqual(
      expect.arrayContaining(['AA:BB:CC:DD:EE:FF', GW1])
    );
  });

  it('GET /gateways → 401 no auth', async () => {
    const res = await request(app).get(api).set(auth("aaaaa"));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.name).toBe("UnauthorizedError");
  });

  it('GET /gateways → 404 no valid network', async () => {
    const res = await request(app).get(apiNotFound).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* ----------------------------------------------------------- 3. READ ITEM */
  it('GET item → 200 dati corretti', async () => {
    const res = await request(app).get(`${api}/${GW1}`).set(auth(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(gatewaytPayload);
  });

  it('GET item → 404 se macAddress inesistente', async () => {
    const res = await request(app).get(`${api}/nonexistent`).set(auth(admin));
    expect(res.status).toBe(404);
  });

  it('GET item → 404 network inesistente', async () => {
    const res = await request(app).get(`${apiNotFound}/${GW1}`).set(auth(viewer));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* ------------------------------------------------------------ 4. UPDATE  */
  it('PATCH → 200 rename + change description', async () => {
    const patch = { macAddress: 'AA:AA:AA:AA', name: 'Renamed', description: 'Updated desc' };
    const res = await request(app)
      .patch(`${api}/${GW1}`)
      .set(auth(admin))
      .send(patch);
    expect(res.status).toBe(204);
  });

  it('PATCH dup → 409 se macAddress già esistente', async () => {
    // tenta di rinominare NET2 in test-net (fixture già esistente)
    const res = await request(app)
      .patch(`${api}/AA:AA:AA:AA`)
      .set(auth(admin))
      .send({ macAddress: 'AA:BB:CC:DD:EE:GG' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.name).toBe("ConflictError");
  });

  it('PATCH dup → 409 se macAddress già esistente (in sensors)', async () => {
    const duplicateMacAddress = 'dasdadas';
    const res = await request(app)
      .patch(`${api}/AA:AA:AA:AA`)
      .set(auth(admin))
      .send({ macAddress: duplicateMacAddress });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.name).toBe("ConflictError");
  });

  it('PATCH → 403 con Viewer', async () => {
    const res = await request(app)
      .patch(`${api}/${GW2}`)
      .set(auth(viewer))
      .send({ name: 'ViewerUpdate' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('PATCH → 401 no auth', async () => {
    const res = await request(app)
      .patch(`${api}/${GW2}`)
      .set(auth("aaaaaa"))
      .send({ name: 'ViewerUpdate' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.name).toBe("UnauthorizedError");
  });


  it('PATCH → 404 su network inesistente', async () => {
    const res = await request(app)
      .patch(`${apiNotFound}/${GW2}`)
      .set(auth(admin))
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  it('PATCH → 404 su gateway inesistente', async () => {
    const res = await request(app)
      .patch(`${api}/ghost-net`)
      .set(auth(admin))
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* ------------------------------------------------------------- 5. DELETE */
  it('DELETE → 204 con Admin', async () => {
    const res = await request(app).delete(`${api}/AA:AA:AA:AA`).set(auth(admin));
    expect(res.status).toBe(204);
  });

  it('DELETE → 404 network non esistente', async () => {
    const res = await request(app).delete(`${apiNotFound}/AA:AA:AA:AA`).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  it('DELETE → 404 se già cancellata', async () => {
    const res = await request(app).delete(`${api}/AA:AA:AA:AA`).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  it('DELETE → 403 con Viewer', async () => {
    const res = await request(app).delete(`${api}/test-net`).set(auth(viewer));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('DELETE → 401 no auth', async () => {
    const res = await request(app).delete(`${api}/AA:AA:AA:AA`).set(auth("aaa"));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.name).toBe("UnauthorizedError");
  });


  /* ------------------------------------------------------------ 6. AUTH 401 */
  it('qualsiasi operazione senza token → 401', async () => {
    const res = await request(app).post(api).send({ macAddress: 'no-token', name: 'x' });
    expect(res.status).toBe(401);
  });
});
