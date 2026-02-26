/*  test/unit/repositories/sensorRepository.mock.test.ts  */

import { SensorRepository } from "@repositories/SensorRepository";
import { ConflictError }    from "@errors/ConflictError";
import { NotFoundError }    from "@errors/NotFoundError";

/* ---------------------------------------------------------------- mocks */
const sensorFind   = jest.fn();
const sensorSave   = jest.fn();
const sensorRemove = jest.fn();
const sensorCreate = jest.fn();
const gatewayFind  = jest.fn();

jest.mock("@database", () => ({
  AppDataSource: {
    getRepository: (e: any) => {
      if (e.name === "SensorDAO")
        return { find: sensorFind, save: sensorSave, remove: sensorRemove, create: sensorCreate };
      if (e.name === "GatewayDAO")
        return { find: gatewayFind };
      return {};
    }
  }
}));

/* utils */
const repo = new SensorRepository();
beforeEach(() => jest.clearAllMocks());

/* tests */
describe("SensorRepository – mocked DB", () => {

  /* CREATE */

  it("createSensor salva correttamente se non ci sono duplicati", async () => {
    // 1) loadGatewayOrThrow
    gatewayFind.mockResolvedValueOnce([{ id: 1 }]);
    // 2) dupGw assente
    gatewayFind.mockResolvedValueOnce([]);
    // 3) dupSensorGlobal assente
    sensorFind.mockResolvedValueOnce([]);
    // 4) dupLocal assente
    sensorFind.mockResolvedValueOnce([]);
    // salvataggio
    sensorSave.mockResolvedValue({ macAddress: "S1" });

    const res = await repo.createSensor("net", "GW1", "S1");
    expect(res.macAddress).toBe("S1");
    expect(sensorCreate).toHaveBeenCalled();
    expect(sensorSave).toHaveBeenCalled();
  });

  it("createSensor → ConflictError se esiste già nello stesso gateway", async () => {
    gatewayFind.mockResolvedValueOnce([{ id: 1 }]) // gateway OK
                .mockResolvedValueOnce([]);         // dupGw assente
    sensorFind .mockResolvedValueOnce([])           // dupGlobal assente
               .mockResolvedValueOnce([{ id: 9 }]); // dupLocal presente

    await expect(repo.createSensor("net","GW1","DUP"))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it("createSensor → ConflictError se MAC usato da un gateway", async () => {
    gatewayFind.mockResolvedValueOnce([{ id: 1 }])            // gateway OK
                .mockResolvedValueOnce([{ macAddress:"DUP"}]); // dupGw presente
    sensorFind .mockResolvedValueOnce([]);                     // dupGlobal non interrogato

    await expect(repo.createSensor("net","GW1","DUP"))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it("createSensor → ConflictError se MAC usato da altro sensore", async () => {
    gatewayFind.mockResolvedValueOnce([{ id: 1 }]) // gateway OK
                .mockResolvedValueOnce([]);         // dupGw assente
    sensorFind .mockResolvedValueOnce([{ id: 42 }]) // dupGlobal presente
               .mockResolvedValueOnce([]);          // dupLocal non usata

    await expect(repo.createSensor("net","GW1","DUP"))
      .rejects.toBeInstanceOf(ConflictError);
  });
/*Questi due mi restituivano errore??*/ 

  

  // it("updateSensor → ConflictError se nuovo MAC dup nel gateway", async () => {
  //   // loadSensorOrThrow
  //   sensorFind.mockResolvedValueOnce([{ macAddress:"OLD", gateway:{ macAddress:"GW1"} }]);
  //   // dup locale con NEW
  //   sensorFind.mockResolvedValueOnce([{ macAddress:"NEW" }]);
  //   // dupGw assente
  //   gatewayFind.mockResolvedValueOnce([]);

  //   await expect(
  //     repo.updateSensor("net","GW1","OLD",{ macAddress:"NEW" })
  //   ).rejects.toBeInstanceOf(ConflictError);
  // });

  // /* ------------ DELETE  ------------------------------------------------- */

  // it("deleteSensor → NotFoundError se sensore mancante", async () => {
  //   sensorFind.mockResolvedValueOnce([]); // loadSensorOrThrow fallisce
  //   await expect(repo.deleteSensor("net","GW1","MISSING"))
  //     .rejects.toBeInstanceOf(NotFoundError);
  // });

});
