// test/e2e/networks.e2e.test.ts
import request                from 'supertest';
import { app }                from '@app';
import { generateToken }      from '@services/authService';
import {
  beforeAllE2e,
  afterAllE2e,
  TEST_USERS
} from '@test/e2e/lifecycle';
import { NetworkRepository } from '@repositories/NetworkRepository';
import { GatewayRepository } from '@repositories/GatewayRepository';

describe('Networks e2e', () => {
  /* fixture */
  const NET1 = 'net-e2e-1';
  const NET2 = 'net-e2e-2';               // userà per il rename
  const netPayload = {
    code: NET1,
    name: 'E2E Network',
    description: 'Created by the e2e suite'
  };

  /* auth token */
  let admin: string;
  let viewer: string;

  beforeAll(async () => {
    await beforeAllE2e();
    admin  = generateToken(TEST_USERS.admin);
    viewer = generateToken(TEST_USERS.viewer);

    const networkRepo = new NetworkRepository();
    await networkRepo.createNetwork("test-net","Test Network","E2E test network" );
    await networkRepo.createNetwork("test-net-2","Test Network 2","E2E test network 2" );
    await networkRepo.createNetwork("test-net-3","Test Network 3","E2E test network 3" );

    const gatewayRepo = new GatewayRepository();
    await gatewayRepo.createGateway("test-net","AA:BB:CC:DD:EE:FF","Test Gateway","E2E test gateway" );
    await gatewayRepo.createGateway("test-net-2","AA:BB:CC:DD:EE:GG","Test Gateway 2","E2E test gateway 2" );
    await gatewayRepo.createGateway("test-net-3","AA:BB:CC:DD:EE:HH","Test Gateway 3","E2E test gateway 3");
  });

  afterAll(afterAllE2e);

  const api = '/api/v1/networks';
  const auth = (tkn: string | undefined) =>
    tkn ? { Authorization: `Bearer ${tkn}` } : {};

  /* CREATE */
  it('POST → 201 con Admin', async () => {
    const res = await request(app).post(api).set(auth(admin)).send(netPayload);
    expect(res.status).toBe(201);
  });

  it('POST dup → 409 (code duplicato)', async () => {
    const res = await request(app).post(api).set(auth(admin)).send(netPayload);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 409,
      name: "ConflictError" 
      });
  });

  it('POST → 403 con Viewer', async () => {
    const res = await request(app).post(api).set(auth(viewer)).send({
      ...netPayload,
      code: 'net-e2e-dup'
    });
    expect(res.status).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('POST → 201 body incompleto', async () => {
    const res = await request(app).post(api).set(auth(admin)).send({ code: 'x' });
    expect(res.status).toBe(201);
  });

  /* READ LIST */
  it('GET /networks → 200 + fixture & nuova rete', async () => {
    const res = await request(app).get(api).set(auth(viewer));
    expect(res.status).toBe(200);
    const codes = res.body.map((n: any) => n.code);
    expect(codes).toEqual(
      expect.arrayContaining(['test-net', 'test-net-2', 'test-net-3', NET1])
    );
  });

  /* READ ITEM */
  it('GET item → 200 dati corretti', async () => {
    const res = await request(app).get(`${api}/${NET1}`).set(auth(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(netPayload);
  });

  it('GET item → 404 se code inesistente', async () => {
    const res = await request(app).get(`${api}/nonexistent`).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* UPDATE  */
  it('PATCH → 200 rename + change description', async () => {
    const patch = { code: NET2, name: 'Renamed', description: 'Updated desc' };
    const res   = await request(app)
      .patch(`${api}/${NET1}`)
      .set(auth(admin))
      .send(patch);
    expect(res.status).toBe(204);
    // expect(res.body).toMatchObject(patch);


  });

  it('PATCH dup → 409 se code già esistente', async () => {
    // tenta di rinominare NET2 in test-net (fixture già esistente)
    const res = await request(app)
      .patch(`${api}/${NET2}`)
      .set(auth(admin))
      .send({ code: 'test-net' });
    expect(res.status).toBe(409);
    expect(res.body.name).toBe("ConflictError");
  });

  it('PATCH → 403 con Viewer', async () => {
    const res = await request(app)
      .patch(`${api}/${NET2}`)
      .set(auth(viewer))
      .send({ name: 'ViewerUpdate' });
    expect(res.status).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('PATCH → 404 su rete inesistente', async () => {
    const res = await request(app)
      .patch(`${api}/ghost-net`)
      .set(auth(admin))
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* DELETE */
  it('DELETE → 204 con Admin', async () => {
    const res = await request(app).delete(`${api}/${NET2}`).set(auth(admin));
    expect(res.status).toBe(204);
  });

  it('DELETE → 404 se già cancellata', async () => {
    const res = await request(app).delete(`${api}/${NET2}`).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  it('DELETE → 403 con Viewer', async () => {
    const res = await request(app).delete(`${api}/test-net`).set(auth(viewer));
    expect(res.status).toBe(403);
    expect(res.body.name).toBe("InsufficientRightsError");
  });

  it('GET item dopo delete → 404', async () => {
    const res = await request(app).get(`${api}/${NET2}`).set(auth(admin));
    expect(res.status).toBe(404);
    expect(res.body.name).toBe("NotFoundError");
  });

  /* AUTH 401 */
  it('qualsiasi operazione senza token → 401', async () => {
    const res = await request(app).post(api).send({ code: 'no-token', name: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.name).toBe("Unauthorized");
  });
});
