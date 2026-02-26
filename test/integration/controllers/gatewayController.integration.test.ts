import * as gatewayController from '@controllers/gatewayController';
import { GatewayDAO } from '@dao/GatewayDAO';
import { NetworkDAO } from '@dao/NetworkDAO';
import { ConflictError } from '@errors/ConflictError';
import { NotFoundError } from '@errors/NotFoundError';
import { GatewayRepository } from '@repositories/GatewayRepository';

jest.mock('@repositories/GatewayRepository');

describe('GatewayController integration', () => {
  const fakeNetwork: NetworkDAO = {
    id: 1,
    code: 'net1',
    name: 'N1',
    description: 'd',
    gateways: []
  };

  const makeFakeGateway = (override: Partial<GatewayDAO> = {}): GatewayDAO => ({
    id: 1,
    network: fakeNetwork,
    macAddress: 'gw1',
    name: 'Gateway 1',
    description: 'Gateway di test 1',
    sensors: [],
    ...override
  });

  const gatewayDAO = makeFakeGateway();
  const gatewayDTO = ({
    macAddress: gatewayDAO.macAddress,
    name: gatewayDAO.name,
    description: gatewayDAO.description,
  });

  const namePatch = { name: 'NewName' };
  const macNamePatch = { macAddress: 'g2', name: 'Renamed' };


  beforeEach(() => jest.clearAllMocks());


  it('getAllGateways → mappa correttamente DAO[]→DTO[]', async () => {

    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      getAllGateways: jest.fn().mockResolvedValue([gatewayDAO])
    }));

    const res = await gatewayController.getAllGateways('net1');
    expect(res).toEqual([gatewayDTO]);
  });

  it('getGatewayByMac → mappa correttamente DAO→DTO', async () => {
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      getGatewayByMac: jest.fn().mockResolvedValue(gatewayDAO)
    }));

    const res = await gatewayController.getGatewayByMac('net1', 'gw1');
    expect(res).toEqual(gatewayDTO);
  });


  it('createGateway → inoltra i parametri corretti', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      createGateway: spy
    }));

    await expect(
      gatewayController.createGateway('net1', gatewayDTO)
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      'net1',
      gatewayDTO.macAddress,
      gatewayDTO.name,
      gatewayDTO.description
    );
  });

  it('createGateway → propaga ConflictError se duplicato', async () => {
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      createGateway: jest.fn().mockRejectedValue(new ConflictError('duplicate'))
    }));

    await expect(
      gatewayController.createGateway('net1', gatewayDTO)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('updateGateway (solo name) → aggiorna e passa i parametri giusti', async () => {
    const spy = jest.fn().mockResolvedValue(
      makeFakeGateway({ name: namePatch.name })
    );
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      updateGateway: spy
    }));

    const res = await gatewayController.updateGateway('net1', 'gw1', namePatch);

    expect(res).toMatchObject({ ...gatewayDTO, ...namePatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      namePatch
    );
  });

  it('updateGateway (cambio mac) → aggiorna mac e name', async () => {
    const spy = jest.fn().mockResolvedValue(
      makeFakeGateway({ macAddress: 'g2', name: macNamePatch.name })
    );
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      updateGateway: spy
    }));

    const res = await gatewayController.updateGateway('net1', 'gw1', macNamePatch);

    expect(res).toMatchObject({ ...gatewayDTO, ...macNamePatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      macNamePatch
    );
  });


  it('deleteGateway → inoltra i parametri al repository', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      deleteGateway: spy
    }));

    await expect(gatewayController.deleteGateway('net1', 'gw1'))
      .resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith('net1', 'gw1');
  });

  it('deleteGateway → propaga NotFoundError', async () => {
    (GatewayRepository as jest.Mock).mockImplementation(() => ({
      deleteGateway: jest.fn().mockRejectedValue(new NotFoundError('not found'))
    }));

    await expect(gatewayController.deleteGateway('net1', 'gw1'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
