import { NetworkRepository } from "@repositories/NetworkRepository";
import {
  initializeTestDataSource,
  closeTestDataSource,
  TestDataSource
} from "@test/setup/test-datasource";
import { NetworkDAO } from "@dao/NetworkDAO";
import { ConflictError } from "@errors/ConflictError";
import { NotFoundError } from "@errors/NotFoundError";
import { GatewayDAO } from "@dao/GatewayDAO";
import { SensorDAO }  from "@dao/SensorDAO";

beforeAll(initializeTestDataSource);
afterAll(closeTestDataSource);

beforeEach(async () => {
  await TestDataSource.getRepository(NetworkDAO).clear();
});

describe("NetworkRepository – SQLite in-memory", () => {
  const repo = new NetworkRepository();

  it("create & get network", async () => {
    await repo.createNetwork("net1", "Name", "Desc");
    const net = await repo.getNetworkByCode("net1");
    expect(net.code).toBe("net1");
    expect(net.name).toBe("Name");
  });

  it("create network: conflict", async () => {
    await repo.createNetwork("net1", "Name", "Desc");
    await expect(
      repo.createNetwork("net1", "Other", "Other")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("get network: not found", async () => {
    await expect(repo.getNetworkByCode("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update network rename + fields", async () => {
    await repo.createNetwork("net1", "Name", "Desc");
    const updated = await repo.updateNetwork("net1", "net2", "New", "NewDesc");
    expect(updated.code).toBe("net2");
    expect(updated.name).toBe("New");
  });

  it("update network: conflict on newCode", async () => {
    await repo.createNetwork("net1", "A", "A");
    await repo.createNetwork("net2", "B", "B");
    await expect(
      repo.updateNetwork("net1", "net2", "C", "C")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("delete network ok & 404 dopo delete", async () => {
    await repo.createNetwork("net1", "N", "D");
    await expect(repo.deleteNetwork("net1")).resolves.toBeUndefined();
    await expect(repo.deleteNetwork("net1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getAllSensorsOfNetwork → restituisce i sensori della rete", async () => {
    /* 1. crea la network con il repository reale (serve l’ID) */
    const net = await repo.createNetwork("cov-net", "Cov", "Desc");
  
    /* 2. gateway & sensore collegati direttamente via TestDataSource */
    const gw = await TestDataSource.getRepository(GatewayDAO).save({
      macAddress: "GW1",
      name: "gw",
      description: "d",
      network: net,
    });
  
    await TestDataSource.getRepository(SensorDAO).save({
      macAddress: "S1",
      name: "sensor",
      description: "d",
      variable: "temperature",
      unit: "C",
      gateway: gw,
    });
  
    /* 3. chiamata al metodo da coprire */
    const sensors = await repo.getAllSensorsOfNetwork("cov-net");
  
    expect(sensors).toHaveLength(1);
    expect(sensors[0].macAddress).toBe("S1");
  });
});
