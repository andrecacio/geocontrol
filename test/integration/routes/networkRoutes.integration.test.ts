import request from 'supertest';
import { app } from '@app';

import * as authService        from '@services/authService';
import * as networkController  from '@controllers/networkController';

import { UserType }            from '@models/UserType';
import { UnauthorizedError }   from '@errors/UnauthorizedError';
import { InsufficientRightsError } from '@errors/InsufficientRightsError';
import { NotFoundError }       from '@errors/NotFoundError';
import { ConflictError }       from '@errors/ConflictError';
import { BadRequest }          from 'express-openapi-validator/dist/openapi.validator';
import e from 'express';

jest.mock('@services/authService');
jest.mock('@controllers/networkController');

describe('NetworkRoutes integration', () => {
  /* dati d'appoggio */
  const token        = 'Bearer faketoken';
  const adminToken   = 'Bearer admin';
  const viewerToken  = 'Bearer viewer';

  const netCode  = 'net-1';
  const dto      = { code: netCode, name: 'Net', description: 'desc' };
  const dtoPatch = { code: 'net-2', name: 'Renamed', description: 'updated' };


  const api  = '/api/v1/networks';
  const hdr  = (t?: string) => (t ? { Authorization: t } : {});

  beforeEach(() => jest.clearAllMocks());

  /* PATH con 200 */

  it('GET list → 200 (+dto[])', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (networkController.getAllNetworks as jest.Mock).mockResolvedValue([dto]);

    const res = await request(app).get(api).set(hdr(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([dto]);
    expect(authService.processToken).toHaveBeenCalledWith(
      token,
      [UserType.Admin, UserType.Operator, UserType.Viewer]
    );
    expect(networkController.getAllNetworks).toHaveBeenCalled();
  });

  it('GET item → 200 (+dto)', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (networkController.getNetwork as jest.Mock).mockResolvedValue(dto);

    const res = await request(app).get(`${api}/${netCode}`).set(hdr(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(dto);
    expect(networkController.getNetwork).toHaveBeenCalledWith(netCode);
  });

  it('POST → 201 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (networkController.createNetwork as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post(api).set(hdr(adminToken)).send(dto);

    expect(res.status).toBe(201);
    expect(networkController.createNetwork).toHaveBeenCalledWith(dto);
  });

  it('PATCH → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (networkController.updateNetwork as jest.Mock).mockResolvedValue(dtoPatch);

    const res = await request(app)
      .patch(`${api}/${netCode}`)
      .set(hdr(adminToken))
      .send(dtoPatch);

    // expect(res.status).toBe(200);
    // expect(res.body).toEqual(dtoPatch);
    expect(res.status).toBe(204);
    expect(networkController.updateNetwork).toHaveBeenCalledWith(netCode, dtoPatch);
  });

  it('DELETE → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (networkController.deleteNetwork as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`${api}/${netCode}`)
      .set(hdr(adminToken));

    expect(res.status).toBe(204);
    expect(networkController.deleteNetwork).toHaveBeenCalledWith(netCode);
  });

  it('GET list → 500 se controller lancia errore generico', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (networkController.getAllNetworks as jest.Mock).mockRejectedValue(
      new Error('boom')
    );
  
    const res = await request(app).get(api).set(hdr(token));
  
    expect(res.status).toBe(500);              
    expect(res.body.name).toBe('InternalServerError'); 
  });

  it('POST → 500 se controller lancia errore inatteso', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (networkController.createNetwork as jest.Mock).mockRejectedValue(new Error('fail'));
  
    const res = await request(app).post(api).set(hdr(adminToken)).send(dto);
  
    expect(res.status).toBe(500);
    expect(res.body.name).toBe('InternalServerError'); 
  });
  

  /* Errori 401 */

  describe('401 – Unauthorized', () => {
    it('header assente', async () => {
      const res = await request(app).get(api);
      expect(res.status).toBe(401);
      expect(res.body.name).toBe("Unauthorized");
    });

    it('token invalido (authService lancia)', async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('bad token');
      });
      const res = await request(app).get(api).set(hdr(token));
      expect(res.status).toBe(401);
      expect(res.body.name).toBe("UnauthorizedError");    
    });
  });

  /* Errori 403 */

  describe('403 – Viewer senza permessi', () => {
    beforeEach(() => {
      // invece di .resolvedValue(...)
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError('Insufficient rights');
      });
    });
  
    it.each([
      ['post',   api,                                   dto              ],   // POST /networks
      ['patch', `${api}/${netCode}`,                    dtoPatch         ],   // PATCH /networks/:code
      ['delete',`${api}/${netCode}`,                    undefined        ]    // DELETE /networks/:code
    ])('%s → 403', async (method, path, body) => {
      const req = request(app)[method](path).set(hdr(viewerToken));
      if (body && method !== 'delete') req.send(body);      // PATCH/POST con body
      const res = await req;
      expect(res.status).toBe(403);
      expect(res.body.name).toBe("InsufficientRightsError");
    });
  });

  /* Errori 404 */

  describe('404 – NotFound', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it.each([
      ['get',    `${api}/missing`,           'getNetwork'     ],
      ['patch',  `${api}/missing`,           'updateNetwork'  ],
      ['delete', `${api}/missing`,           'deleteNetwork'  ]
    ])('%s → 404', async (method, path, spy) => {
      (networkController[spy] as jest.Mock).mockRejectedValue(new NotFoundError('missing'));
      const res = await request(app)[method](path).set(hdr(adminToken)).send(dtoPatch);
      expect(res.status).toBe(404);
      expect(res.body.name).toBe("NotFoundError");
    });
  });

  /* Errori 409 */

  describe('409 – Conflict', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it('POST → 409 (duplicate code)', async () => {
      (networkController.createNetwork as jest.Mock).mockRejectedValue(
        new ConflictError('dup')
      );
      const res = await request(app).post(api).set(hdr(adminToken)).send(dto);
      expect(res.status).toBe(409);
      expect(res.body.name).toBe("ConflictError");
    });

    it('PATCH → 409 (code già esistente)', async () => {
      (networkController.updateNetwork as jest.Mock).mockRejectedValue(
        new ConflictError('dup')
      );
      const res = await request(app)
        .patch(`${api}/${netCode}`)
        .set(hdr(adminToken))
        .send(dtoPatch);
      expect(res.status).toBe(409);
      expect(res.body.name).toBe("ConflictError");
    });
  });

  /* Errori 400 */

  describe('400 – BadRequest', () => {
    beforeEach(() =>
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin })
    );

    it('POST body mancante', async () => {
      (networkController.createNetwork as jest.Mock).mockRejectedValue(
        new BadRequest({ message: 'bad', overrideStatus: 400, path: '', errors: [] })
      );
      const res = await request(app).post(api).set(hdr(adminToken)).send({});
      expect(res.status).toBe(400);
    });
  });
});
