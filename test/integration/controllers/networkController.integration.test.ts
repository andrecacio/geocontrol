import * as networkController from '@controllers/networkController';
import { NetworkRepository }  from '@repositories/NetworkRepository';
import { NetworkDAO }         from '@dao/NetworkDAO';
import { ConflictError }      from '@errors/ConflictError';
import { NotFoundError }      from '@errors/NotFoundError';

jest.mock('@repositories/NetworkRepository');

describe('NetworkController integration', () => {
  /* fixture & DTO */
  const makeDao = (over: Partial<NetworkDAO> = {}): NetworkDAO => ({
    id: 1,
    code: 'net1',
    name: 'Network 1',
    description: 'desc',
    gateways: [],
    ...over
  });

  const dao     = makeDao();
  const dto     = ({ code: dao.code, name: dao.name, description: dao.description });
  const updated = { code: 'net2', name: 'Renamed', description: 'Updated desc' };

  
  beforeEach(() => jest.clearAllMocks());

  /* LEGGI TUTTO */
  it('getAllNetworks → mappa DAO[]→DTO[]', async () => {
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      getAllNetworks: jest.fn().mockResolvedValue([dao])
    }));
    const res = await networkController.getAllNetworks();
    expect(res).toEqual([dto]);
  });

  /* LEGGI */
  it('getNetwork → mappa DAO→DTO', async () => {
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      getNetworkByCode: jest.fn().mockResolvedValue(dao)
    }));
    const res = await networkController.getNetwork('net1');
    expect(res).toEqual(dto);
  });

  /* CREATO */
  it('createNetwork → inoltra parametri', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      createNetwork: spy
    }));
    await expect(networkController.createNetwork(dto)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith(dto.code, dto.name, dto.description);
  });

  it('createNetwork → propaga ConflictError', async () => {
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      createNetwork: jest.fn().mockRejectedValue(new ConflictError('dup'))
    }));
    await expect(networkController.createNetwork(dto)).rejects.toBeInstanceOf(ConflictError);
  });

  /* UPDATE */
  describe('updateNetwork', () => {
    it('rename + change fields →  mappa DTO e passa i 4 parametri', async () => {
      const spy = jest.fn().mockResolvedValue(makeDao(updated));
      (NetworkRepository as jest.Mock).mockImplementation(() => ({
        updateNetwork: spy
      }));

      const res = await networkController.updateNetwork('net1', updated);

      
      expect(res).toMatchObject(updated);                // DTO passato al repository
      expect(spy).toHaveBeenCalledWith(
        'net1',
        updated.code,
        updated.name,
        updated.description
      );
    });

    it('→ ConflictError se nuovo code duplicato', async () => {
      (NetworkRepository as jest.Mock).mockImplementation(() => ({
        updateNetwork: jest.fn().mockRejectedValue(new ConflictError('dup'))
      }));
      await expect(networkController.updateNetwork('net1', updated))
        .rejects.toBeInstanceOf(ConflictError);
    });

    it('→ NotFoundError se rete assente', async () => {
      (NetworkRepository as jest.Mock).mockImplementation(() => ({
        updateNetwork: jest.fn().mockRejectedValue(new NotFoundError('missing'))
      }));
      await expect(networkController.updateNetwork('ghost', updated))
        .rejects.toBeInstanceOf(NotFoundError);
    });
  });

  /* ELIMINA */
  it('deleteNetwork → inoltra code al repository', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      deleteNetwork: spy
    }));
    await expect(networkController.deleteNetwork('net1')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith('net1');
  });

  it('deleteNetwork → NotFoundError se rete assente', async () => {
    (NetworkRepository as jest.Mock).mockImplementation(() => ({
      deleteNetwork: jest.fn().mockRejectedValue(new NotFoundError('missing'))
    }));
    await expect(networkController.deleteNetwork('ghost'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
