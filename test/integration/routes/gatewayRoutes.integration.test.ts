import request from 'supertest';
import { app } from '@app';

import * as authService from '@services/authService';
import * as gatewayController from '@controllers/gatewayController';

import { UserType } from '@models/UserType';
import { UnauthorizedError } from '@errors/UnauthorizedError';
import { InsufficientRightsError } from '@errors/InsufficientRightsError';
import { NotFoundError } from '@errors/NotFoundError';
import { ConflictError } from '@errors/ConflictError';
import { BadRequest } from 'express-openapi-validator/dist/openapi.validator';

jest.mock('@services/authService');
jest.mock('@controllers/gatewayController');

describe('GatewayRoutes integration', () => {

  const token = 'Bearer faketoken';
  const adminToken = 'Bearer admin';
  const viewerToken = 'Bearer viewer';

  const netCode = 'net-1';
  const dto = { macAddress: 'gw-1', name: "GW01", description: "aaaaaa", sensors: [] };
  const dtoPatch = { macAddress: 'gw-updated', name: "GW01-updated", description: "bbbbb", sensors: [] };


  const api = '/api/v1/networks/' + netCode + '/gateways';
  const hdr = (t?: string) => (t ? { Authorization: t } : {});

  beforeEach(() => jest.clearAllMocks());

  /* PATH con 200 */

  it('GET list → 200 (+dto[])', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (gatewayController.getAllGateways as jest.Mock).mockResolvedValue([dto]);

    const res = await request(app).get(api).set(hdr(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([dto]);
    expect(authService.processToken).toHaveBeenCalledWith(
      token,
      [UserType.Admin, UserType.Operator, UserType.Viewer]
    );
    expect(gatewayController.getAllGateways).toHaveBeenCalled();
  });

  it('GET item → 200 (+dto)', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(dto);

    const res = await request(app).get(`${api}/gw-1`).set(hdr(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(dto);
    expect(gatewayController.getGatewayByMac).toHaveBeenCalledWith("net-1", "gw-1");
  });

  it('POST → 201 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (gatewayController.createGateway as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post(api).set(hdr(adminToken)).send(dto);

    expect(res.status).toBe(201);
    expect(gatewayController.createGateway).toHaveBeenCalledWith(netCode, dto);
  });

  it('PATCH → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (gatewayController.updateGateway as jest.Mock).mockResolvedValue(dtoPatch);

    const res = await request(app)
      .patch(`${api}/gw-1`)
      .set(hdr(adminToken))
      .send(dtoPatch);

    expect(res.status).toBe(204);
    expect(gatewayController.updateGateway).toHaveBeenCalledWith(netCode, "gw-1", dtoPatch);
  });

  it('DELETE → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (gatewayController.deleteGateway as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`${api}/gw-1`)
      .set(hdr(adminToken));

    expect(res.status).toBe(204);
    expect(gatewayController.deleteGateway).toHaveBeenCalledWith(netCode, "gw-1");
  });

  /* Errori 401 */

  describe('401 – Unauthorized', () => {
    it('header assente', async () => {
      const res = await request(app).get(api);
      expect(res.status).toBe(401);
    });

    it('token invalido (authService lancia)', async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('bad token');
      });
      const res = await request(app).get(api).set(hdr(token));
      expect(res.status).toBe(401);
    });
  });

  /* Errori 403 */

  describe('403 – Viewer senza permessi', () => {
    beforeEach(() => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError('Insufficient rights');
      });
    });

    it.each([
      ['post', api, dto],
      ['patch', `${api}/gw-1`, dtoPatch],
      ['delete', `${api}/gw-1}`, undefined]
    ])('%s → 403', async (method, path, body) => {
      const req = request(app)[method](path).set(hdr(viewerToken));
      if (body && method !== 'delete') req.send(body);
      const res = await req;
      expect(res.status).toBe(403);
    });
  });

  /* Errori 404 */

  describe('404 – NotFound', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it.each([
      ['get', `${api}/missing`, 'getGatewayByMac'],
      ['patch', `${api}/missing`, 'updateGateway'],
      ['delete', `${api}/missing`, 'deleteGateway']
    ])('%s → 404', async (method, path, spy) => {
      (gatewayController[spy] as jest.Mock).mockRejectedValue(new NotFoundError('missing'));
      const res = await request(app)[method](path).set(hdr(adminToken)).send(dtoPatch);
      expect(res.status).toBe(404);
    });
  });

  /* Errori 409 */

  describe('409 – Conflict', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it('POST → 409 (duplicate code)', async () => {
      (gatewayController.createGateway as jest.Mock).mockRejectedValue(
        new ConflictError('dup')
      );
      const res = await request(app).post(api).set(hdr(adminToken)).send(dto);
      expect(res.status).toBe(409);
    });

    it('PATCH → 409 (code già esistente)', async () => {
      (gatewayController.updateGateway as jest.Mock).mockRejectedValue(
        new ConflictError('dup')
      );
      const res = await request(app)
        .patch(`${api}/${netCode}`)
        .set(hdr(adminToken))
        .send(dtoPatch);
      expect(res.status).toBe(409);
    });
  });

  /* Errori 400 */

  describe('400 – BadRequest', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it('POST body mancante', async () => {
      (gatewayController.updateGateway as jest.Mock).mockRejectedValue(
        new BadRequest({ message: 'bad', overrideStatus: 400, path: '', errors: [] })
      );
      const res = await request(app).post(api).set(hdr(adminToken)).send({});
      expect(res.status).toBe(400);
    });
  });
});
