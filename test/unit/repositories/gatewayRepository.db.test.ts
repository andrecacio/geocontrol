import {
    initializeTestDataSource,
    closeTestDataSource,
    TestDataSource
} from "@test/setup/test-datasource";
import { NetworkDAO } from "@dao/NetworkDAO";
import { GatewayDAO } from "@dao/GatewayDAO";
import { ConflictError } from "@errors/ConflictError";
import { NotFoundError } from "@errors/NotFoundError";
import { GatewayRepository } from "@repositories/GatewayRepository";

beforeAll(initializeTestDataSource);
afterAll(closeTestDataSource);

beforeEach(async () => {
    await TestDataSource.getRepository(GatewayDAO).clear();
    await TestDataSource.getRepository(NetworkDAO).clear();
});

const makeNetwork = async (code = "net") => {
    return TestDataSource.getRepository(NetworkDAO).save({ code, name: code, description: code });
};

const makeGateway = async (netCode = "net", mac = "GW1") => {
    const net = await makeNetwork(netCode);
    return TestDataSource.getRepository(GatewayDAO).save({
        macAddress: mac,
        name: mac,
        description: mac,
        network: net
    });
};

describe("SensorRepository – SQLite in-memory", () => {
    const repo = new GatewayRepository();

    it("createGateway + getGatewayByMac", async () => {
        const n = await makeNetwork();
        const g = await repo.createGateway(n.code, "GW1", "Name", "Desc");

        expect(g.macAddress).toBe("GW1");

        const found = await repo.getGatewayByMac(n.code, g.macAddress);
        expect(found.id).toBe(g.id);
    });

    it("CreateGateway → ConflictError duplicato", async () => {
        const n = await makeNetwork();
        await repo.createGateway(n.code, "aaaaaaaaaaa");
        await expect(
            repo.createGateway(n.code, "aaaaaaaaaaa")
        ).rejects.toBeInstanceOf(ConflictError);
    });

    it("updateGateway cambio name", async () => {
        const n = await makeNetwork();
        await repo.createGateway(n.code, "GW1", "aaaa");
        const upd = await repo.updateGateway(n.code, "GW1", { name: "new" });
        expect(upd.name).toBe("new");
    });

    it("updateGateway → ConflictError nuovo mac duplicato", async () => {
        const n = await makeNetwork();
        await repo.createGateway(n.code, "S1");
        await repo.createGateway(n.code, "S2");
        await expect(
            repo.updateGateway(n.code, "S1", { macAddress: "S2" })
        ).rejects.toBeInstanceOf(ConflictError);
    });

    it("deleteSensor ok & 404 dopo", async () => {
        const n = await makeNetwork();
        await repo.createGateway(n.code, "S1");
        await repo.deleteGateway(n.code, "S1");
        await expect(
            repo.getGatewayByMac(n.code, "S1")
        ).rejects.toBeInstanceOf(NotFoundError);
    });

    // it("non può creare sensore se MAC = MAC di un gateway", async () => {
    //     await makeGateway("DUP");
    //     await expect(
    //         repo.createSensor("net", "DUP-GW", "DUP")
    //     ).rejects.toBeInstanceOf(NotFoundError);
    // });

    // it("non può creare sensore se MAC già usato da altro sensore", async () => {
    //     const gw = await makeGateway("GW2");
    //     await repo.createSensor("net", gw.macAddress, "DUP");

    //     const gw2 = await makeGateway("GW2");
    //     await expect(
    //         repo.createSensor("net", gw2.macAddress, "DUP")
    //     ).rejects.toBeInstanceOf(ConflictError);
    // });
});
