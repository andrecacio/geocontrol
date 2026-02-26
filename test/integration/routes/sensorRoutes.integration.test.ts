import request from 'supertest';
import { app } from '@app';
import * as authService       from '@services/authService';
import * as sensorController  from '@controllers/sensorController';
import { UserType }           from '@models/UserType';
import { UnauthorizedError }  from '@errors/UnauthorizedError';
import { InsufficientRightsError } from '@errors/InsufficientRightsError';
import { NotFoundError }      from '@errors/NotFoundError';
import { ConflictError }      from '@errors/ConflictError';
import { BadRequest }         from 'express-openapi-validator/dist/openapi.validator';

jest.mock('@services/authService');
jest.mock('@controllers/sensorController');

describe('SensorRoutes integration', () => {
  /* costanti */
  const token      = 'Bearer faketoken';
  const adminToken = 'Bearer admintoken';
  const viewerToken= 'Bearer viewertoken';

  const nc  = 'networkCode';
  const gw  = 'AA:BB:CC:DD:EE:01';
  const sm  = 'AA:BB:CC:DD:EE:02';

  const listSensors = [
    { macAddress: sm, name: 'Sensor1', description: 'desc', variable: 'temperature', unit: 'C' }
  ];
  const singleSensor = listSensors[0];

  const createDto = {
    macAddress: 'AA:BB:CC:DD:EE:03',
    name:        'New Sensor',
    description: 'desc',
    variable:    'humidity',
    unit:        '%'
  };
  const updateDto = { name: 'Updated Sensor' };

  /*  beforeEach */
  beforeEach(() => jest.clearAllMocks());

  /*  PATH OK */

  it('GET list → 200', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (sensorController.getSensorsByGateway as jest.Mock).mockResolvedValue(listSensors);

    const res = await request(app)
      .get(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(listSensors);
  });

  it('GET item → 200', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (sensorController.getSensor as jest.Mock).mockResolvedValue(singleSensor);

    const res = await request(app)
      .get(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(singleSensor);
  });

  it('POST → 201 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (sensorController.createSensor as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
      .set('Authorization', adminToken)
      .send(createDto);

    expect(res.status).toBe(201);
    expect(sensorController.createSensor).toHaveBeenCalledWith(nc, gw, createDto);
  });

  it('PATCH → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (sensorController.updateSensor as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .patch(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
      .set('Authorization', adminToken)
      .send({});

    expect(res.status).toBe(204);
  });

  it('DELETE → 204 con Admin', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (sensorController.deleteSensor as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
      .set('Authorization', adminToken);

    expect(res.status).toBe(204);
  });
  
  it('GET sensors → 500 se controller lancia errore', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue(undefined);
    (sensorController.getSensorsByGateway as jest.Mock).mockRejectedValue(new Error('fail'));
  
    const res = await request(app)
      .get(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
      .set('Authorization', token);
  
    expect(res.status).toBe(500);
    expect(res.body.name).toBe('InternalServerError');
  });
  
  it('POST sensor → 500 se controller lancia errore', async () => {
    (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    (sensorController.createSensor as jest.Mock).mockRejectedValue(new Error('boom'));
  
    const res = await request(app)
      .post(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
      .set('Authorization', adminToken)
      .send(createDto);
  
    expect(res.status).toBe(500);
    expect(res.body.name).toBe('InternalServerError');
  });
  /*  Errori d'autenticazione */

  describe('Unauthorized (401)', () => {
    it('header mancante', async () => {
      const res = await request(app).get(`/api/v1/networks/${nc}/gateways/${gw}/sensors`);
      expect(res.status).toBe(401);
      expect(res.body.name).toBe('Unauthorized');
    });

    it('GET item con token ma authService lancia', async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('No token');
      });
      const res = await request(app)
        .get(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
        .set('Authorization', token);
      expect(res.status).toBe(401);
      expect(res.body.name).toBe('UnauthorizedError');
    });

    it.each(['patch','delete'] as const)('%s → 401', async (method) => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('No token');
      });
      const res = request(app)[method](
        `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`
      ).set('Authorization', token);

      if (method === 'patch') res.send({});
      const req = await res;
      expect(req.status).toBe(401);
      expect(req.body.name).toBe('UnauthorizedError');
    });
  });

  /* Errori per l'operazioni non permesse */

  describe('Insufficient rights (403)', () => {
    it.each([
      { method: 'post',  path: `/api/v1/networks/${nc}/gateways/${gw}/sensors`          , body: createDto },
      { method: 'patch', path: `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`   , body: updateDto },
      { method: 'delete',path: `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`   , body: undefined }
    ])('$method → 403 se Viewer', async ({ method, path, body }) => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError('Insufficient rights');
      });
      const res = await request(app)[method](path)
        .set('Authorization', viewerToken)
        .send(body);
      expect(res.status).toBe(403);
      expect(res.body.name).toBe('InsufficientRightsError');
    });

    it('DELETE → 403 se InsufficientRightsError dal controller', async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (sensorController.deleteSensor as jest.Mock).mockRejectedValue(new InsufficientRightsError('forbidden'));
      const res = await request(app)
        .delete(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
        .set('Authorization', adminToken);
      expect(res.status).toBe(403);
      expect(res.body.name).toBe('InsufficientRightsError');
    });
  });

  /* Not found */

  describe('NotFound (404)', () => {
    beforeEach(() => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
    });

    it.each([
      ['get',    `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`,      'getSensor'     ],
      ['patch',  `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`,      'updateSensor'  ],
      ['delete', `/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`,      'deleteSensor'  ]
    ])('%s → 404 se controller NotFoundError', async (method, path, spyName) => {
      (sensorController[spyName] as jest.Mock).mockRejectedValue(new NotFoundError('missing'));
      const res = await request(app)[method](path)
        .set('Authorization', adminToken)
        .send(method === 'patch' ? updateDto : undefined);
      expect(res.status).toBe(404);
      expect(res.body.name).toBe('NotFoundError');
    });
  });

  /* Conflitti  */

  describe('Conflict (409)', () => {
    it('POST → 409 se mac duplicato', async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (sensorController.createSensor as jest.Mock).mockRejectedValue(new ConflictError('duplicate'));
      const res = await request(app)
        .post(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
        .set('Authorization', adminToken)
        .send(createDto);
      expect(res.status).toBe(409);
      expect(res.body.name).toBe('ConflictError');
    });

    it('PATCH → 409 se nuovo mac duplicato', async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (sensorController.updateSensor as jest.Mock).mockRejectedValue(new ConflictError('duplicate'));
      const res = await request(app)
        .patch(`/api/v1/networks/${nc}/gateways/${gw}/sensors/${sm}`)
        .set('Authorization', adminToken)
        .send({ macAddress: 'AA:BB:CC:DD:EE:03' });
      expect(res.status).toBe(409);
      expect(res.body.name).toBe('ConflictError');
    });
  });

  /* Errori 400 */

  describe('BadRequest (400)', () => {
    it('POST → 400 body mancante', async () => {
      (authService.processToken as jest.Mock).mockResolvedValue({ type: UserType.Admin });
      (sensorController.createSensor as jest.Mock).mockRejectedValue(
        new BadRequest({ message: 'body invalid', overrideStatus: 400, path: '', errors: [] })
      );

      const res = await request(app)
        .post(`/api/v1/networks/${nc}/gateways/${gw}/sensors`)
        .set('Authorization', adminToken)
        .send({});          // body vuoto

      expect(res.status).toBe(400);
    });
  });
});
