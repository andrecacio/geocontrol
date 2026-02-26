import * as sensorController  from '@controllers/sensorController';
import { SensorRepository }   from '@repositories/SensorRepository';
import { SensorDAO }          from '@dao/SensorDAO';
import { GatewayDAO }         from '@dao/GatewayDAO';
import { NetworkDAO }         from '@dao/NetworkDAO';
import { ConflictError }      from '@errors/ConflictError';   
import { NotFoundError }      from '@errors/NotFoundError';

jest.mock('@repositories/SensorRepository');

describe('SensorController integration', () => {
  const fakeNetwork: NetworkDAO = {
    id: 1,
    code: 'net1',
    name: 'N1',
    description: 'd',
    gateways: []
  };

  const fakeGateway: GatewayDAO = {
    id: 1,
    macAddress: 'gw1',
    name: 'G1',
    description: 'd',
    network: fakeNetwork,
    sensors: []
  };

  const makeFakeSensor = (override: Partial<SensorDAO> = {}): SensorDAO => ({
     id: 1,
     macAddress: 's1',
     name: 'S1',
     description: 'd',
     variable: 'temperature',
     unit: 'C',
     gateway: fakeGateway,
     measurements: [],
      ...override
   });

  const sensorDAO   = makeFakeSensor();
  const sensorDTO   = ({
    macAddress: sensorDAO.macAddress,
    name:        sensorDAO.name,
    description: sensorDAO.description,
    variable:    sensorDAO.variable,
    unit:        sensorDAO.unit
  });

  const namePatch   = { name: 'NewName' };
  const macNamePatch = { macAddress: 's2', name: 'Renamed' };

  
  beforeEach(() => jest.clearAllMocks());

  
  it('getSensorsByGateway → mappa correttamente DAO[]→DTO[]', async () => {
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      findByGateway: jest.fn().mockResolvedValue([sensorDAO])
    }));
    const res = await sensorController.getSensorsByGateway('net1', 'gw1');
    expect(res).toEqual([sensorDTO]);
  });

  it('getSensor → mappa correttamente DAO→DTO', async () => {
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      getSensorByMac: jest.fn().mockResolvedValue(sensorDAO)
    }));
    const res = await sensorController.getSensor('net1', 'gw1', 's1');
    expect(res).toEqual(sensorDTO);
  });

  
  it('createSensor → inoltra i parametri corretti', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      createSensor: spy
    }));

    await expect(
      sensorController.createSensor('net1', 'gw1', sensorDTO)
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      sensorDTO.macAddress,
      sensorDTO.name,
      sensorDTO.description,
      sensorDTO.variable,
      sensorDTO.unit
    );
  });

  it('createSensor → propaga ConflictError se duplicato', async () => {
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      createSensor: jest.fn().mockRejectedValue(new ConflictError('duplicate'))
    }));

    await expect(
      sensorController.createSensor('net1', 'gw1', sensorDTO)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  
  it('updateSensor (solo name) → aggiorna e passa i parametri giusti', async () => {
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({ name: namePatch.name })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', namePatch);

    expect(res).toMatchObject({ ...sensorDTO, ...namePatch });
    expect(spy).toHaveBeenCalledWith(
      'net1', 
      'gw1', 
      's1',           
      namePatch
    );
  });

  it('updateSensor (cambio mac) → aggiorna mac e name', async () => {
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({ macAddress: 's2', name: macNamePatch.name })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', macNamePatch);

    expect(res).toMatchObject({ ...sensorDTO, ...macNamePatch });
    expect(spy).toHaveBeenCalledWith(
      'net1', 
      'gw1', 
      's1',
      macNamePatch
    );
  });

  it('updateSensor (solo description) → aggiorna e passa description giusta', async () => {
    const descriptionPatch = { description: 'Nuova descrizione' };
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({ description: descriptionPatch.description })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', descriptionPatch);

    expect(res).toMatchObject({ ...sensorDTO, ...descriptionPatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      's1',
      descriptionPatch
    );
  });

  it('updateSensor (solo variable) → aggiorna e passa variable giusta', async () => {
    const variablePatch = { variable: 'humidity' };
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({ variable: variablePatch.variable })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', variablePatch);

    expect(res).toMatchObject({ ...sensorDTO, ...variablePatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      's1',
      variablePatch
    );
  });

  it('updateSensor (solo unit) → aggiorna e passa unit giusta', async () => {
    const unitPatch = { unit: 'F' };
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({ unit: unitPatch.unit })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', unitPatch);

    expect(res).toMatchObject({ ...sensorDTO, ...unitPatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      's1',
      unitPatch
    );
  });

  it('updateSensor (descrizione, variable e unit insieme) → aggiorna e passa tutti i campi', async () => {
    const comboPatch = {
      description: 'Descrizione nuova',
      variable: 'pressure',
      unit: 'Pa'
    };
    const spy = jest.fn().mockResolvedValue(
      makeFakeSensor({
        description: comboPatch.description,
        variable: comboPatch.variable,
        unit: comboPatch.unit
      })
    );
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      updateSensor: spy
    }));

    const res = await sensorController.updateSensor('net1', 'gw1', 's1', comboPatch);

    expect(res).toMatchObject({ ...sensorDTO, ...comboPatch });
    expect(spy).toHaveBeenCalledWith(
      'net1',
      'gw1',
      's1',
      comboPatch
    );
  });


  
  it('deleteSensor → inoltra i parametri al repository', async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      deleteSensor: spy
    }));

    await expect(sensorController.deleteSensor('net1', 'gw1', 's1'))
      .resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith('net1', 'gw1', 's1');
  });

  it('deleteSensor → propaga NotFoundError', async () => {
    (SensorRepository as jest.Mock).mockImplementation(() => ({
      deleteSensor: jest.fn().mockRejectedValue(new NotFoundError('not found'))
    }));

    await expect(sensorController.deleteSensor('net1', 'gw1', 's1'))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
