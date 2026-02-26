import { MeasurementRepository } from "@repositories/MeasurementRepository";
import {
    initializeTestDataSource,
    closeTestDataSource,
    TestDataSource
} from "@test/setup/test-datasource";
import { MeasurementDAO } from "@dao/MeasurementDAO";
import { SensorDAO } from "@dao/SensorDAO";
import { GatewayDAO } from "@dao/GatewayDAO";
import { NetworkDAO } from "@dao/NetworkDAO";


beforeAll(initializeTestDataSource);
afterAll(closeTestDataSource);

/*
beforeEach(async () => {
    await TestDataSource.getRepository(SensorDAO).clear();
    await TestDataSource.getRepository(GatewayDAO).clear();
    await TestDataSource.getRepository(NetworkDAO).clear();
    await TestDataSource.getRepository(MeasurementDAO).clear();
});
*/

const makeNetwork = async (code = "net") => {
    return TestDataSource.getRepository(NetworkDAO).save({ code, name: code, description: code });
};

const makeGateway = async (netCode, mac) => {
    const net = await makeNetwork(netCode);
    return TestDataSource.getRepository(GatewayDAO).save({
        macAddress: mac,
        name: mac,
        description: mac,
        network: net
    });
};

const makeSensor = async (netCode, gwMac, mac, name, desc, variable, unit) => {
    const gw = await makeGateway(netCode, gwMac);
    return TestDataSource.getRepository(SensorDAO).save({
        macAddress: mac,
        name: name,
        description: desc,
        variable: variable,
        unit: unit,
        gateway: gw
    });
}

const makeMeasurement = async (sensorMac, value, createdAt) => {
    const sensor = await makeSensor("net", "gw-mac", sensorMac, "Sensor Name", "Sensor Description", "temperature", "Celsius");
    return TestDataSource.getRepository(MeasurementDAO).save({
        value,
        createdAt,
        sensor
    });
};

describe("UserRepository: mocked database", () => {
    const repo = new MeasurementRepository();

    it("getMeasurementsSpecificSensor: normal activity", async () => {
        const measurement1 = await makeMeasurement("sensorMac", 25.5, new Date("2025-01-01T10:00:00Z"));

        await repo.getMeasurementsSpecificSensor(
            "net",
            "gw-mac",
            "sensorMac",
            "2025-01-01T09:00:00Z",
            "2025-01-01T11:00:00Z"
        ).then(measurements => {
            expect(measurements).toHaveLength(1);
            expect(measurements[0].value).toBe(measurement1.value);
            expect(measurements[0].createdAt.toISOString()).toBe(measurement1.createdAt.toISOString());
        });
    });

    it("getMeasurementsSpecificSensor: should throw 400 if startDate is invalid", async () => {

        let error;
        try {
            await repo.getMeasurementsSpecificSensor(
                "net",
                "gw-mac",
                "sensorMac",
                "invalid-date",
                "2025-01-01T11:00:00Z"
            );
        } catch (err) {
            error = err;
        }

        expect(error).toMatchObject({
            name: "BadRequest",
            code: 400
        });
    });

    it("getMeasurementsSpecificSensor: should throw 400 if endDate is invalid", async () => {
        let error;
        try {
            await repo.getMeasurementsSpecificSensor(
                "net",
                "gw-mac",
                "sensorMac",
                "2025-01-01T09:00:00Z",
                "invalid-date"
            );
        } catch (err) {
            error = err;
        }

        expect(error).toMatchObject({
            name: "BadRequest",
            code: 400
        });
    });

    it("storeMeasurementForASensor: should throw 400 if createdAt is invalid", async () => {
        const sensor = await makeSensor("net", "gw-mac", "sensorMac2", "Sensor Name", "Sensor Description", "temperature", "Celsius");

        let error;
        try {
            await repo.storeMeasurementForASensor(
                sensor.gateway.network.code,
                sensor.gateway.macAddress,
                sensor.macAddress,
                [
                    {
                        value: 30.0,
                        createdAt: new Date("TTWDWD"),
                        isOutlier: false
                    }
                ]
            );
        } catch (err) {
            error = err;
        }
        expect(error).toMatchObject({
            name: "BadRequest",
            code: 400
        });


    });

});