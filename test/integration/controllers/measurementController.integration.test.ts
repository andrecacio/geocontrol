import * as measurementController from "@controllers/measurementController";
import { MeasurementDAO } from "@dao/MeasurementDAO";
import { MeasurementRepository } from "@repositories/MeasurementRepository";
import { SensorDAO } from "@models/dao/SensorDAO";
import { GatewayDAO } from "@models/dao/GatewayDAO";
import { NetworkDAO } from "@models/dao/NetworkDAO";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { Any } from "typeorm";

jest.mock("@repositories/MeasurementRepository");
jest.mock("@repositories/NetworkRepository");

describe("MeasurementController integration", () => {
    const fakeNetwork: NetworkDAO = {
        id: 1,
        code: "net1",
        name: "Network 1",
        description: "Test Network",
        gateways: []
    };

    const fakeGateway: GatewayDAO = {
        id: 1,
        macAddress: "gw1",
        name: "Gateway 1",
        description: "Test Gateway",
        network: fakeNetwork,
        sensors: []
    };

    const fakeSensor: SensorDAO = {
        id: 1,
        macAddress: "s1",
        name: "Sensor 1",
        description: "Test Sensor",
        variable: "temperature",
        unit: "C",
        gateway: fakeGateway,
        measurements: []
    };

    const fakeMeasurement: MeasurementDAO = {
        id: 1,
        value: 5.2345,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        sensor: fakeSensor,
        isOutlier: false
    };

    const outlierMeasurement: MeasurementDAO = {
        id: 6,
        value: 250.3456,
        createdAt: new Date("2025-01-01T04:00:00Z"),
        sensor: fakeSensor,
        isOutlier: false
    };

    const fakeMeasurementsWithOutlier: MeasurementDAO[] = [
        {
            id: 1,
            value: 1.2345,
            createdAt: new Date("2025-01-01T00:00:00Z"),
            sensor: fakeSensor,
            isOutlier: false
        },
        {
            id: 2,
            value: 1.7890,
            createdAt: new Date("2025-01-01T01:00:00Z"),
            sensor: fakeSensor,
            isOutlier: false
        },
        {
            id: 3,
            value: 0.5678,
            createdAt: new Date("2025-01-01T02:00:00Z"),
            sensor: fakeSensor,
            isOutlier: false
        },
        {
            id: 4,
            value: 0.8901,
            createdAt: new Date("2025-01-01T03:00:00Z"),
            sensor: fakeSensor,
            isOutlier: false
        },
        {
            id: 5,
            value: 0.8901,
            createdAt: new Date("2025-01-01T03:00:00Z"),
            sensor: fakeSensor,
            isOutlier: false
        },
        outlierMeasurement
    ];

    const expectedMeasurementDTO = {
        createdAt: fakeMeasurement.createdAt,
        value: fakeMeasurement.value,
        isOutlier: fakeMeasurement.isOutlier
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("getMeasurementsSpecificSensor → normal operation", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        const result = await measurementController.getMeasurementsSpecificSensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            "2025-01-01T01:00:00+01:00",
            "2025-01-02T00:00:00Z"
        );

        //console.log("Result:", result);

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(typeof result).toBe("object");
        expect(Array.isArray(result)).toBe(false);
        expect(result).not.toBeNull();
        expect(result.measurements).toBeDefined();
        expect(result.measurements).toHaveLength(1);
        expect(result.measurements).toEqual([expectedMeasurementDTO]);
        expect(result.sensorMacAddress).toBe(fakeSensor.macAddress);
    });

    it("getMeasurementsSpecificSensor → no measurements found", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([])
        }));

        const result = await measurementController.getMeasurementsSpecificSensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            "2025-01-01T01:00:00+01:00",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual({
            sensorMacAddress: fakeSensor.macAddress,
            stats: expect.any(Object)
        });
    });

    it("getStatisticsSpecificSensor → normal operation", async () => {

        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([
                { value: 10, createdAt: new Date("2025-01-01T10:00:00Z") }
            ])
        }));

        const result = await measurementController.getStatisticsSpecificSensor(
            "TEST-NET",
            "11:22:33:44:55:66",
            "AA:BB:CC:DD:EE:FF",
            "2025-01-01T09:00:00Z",
            "2025-01-01T11:00:00Z"
        );

        console.log("Result:", result);

        expect(result).toHaveProperty("mean", 10);
        expect(result).toHaveProperty("variance", 0);
        expect(result).toHaveProperty("upperThreshold");
        expect(result).toHaveProperty("lowerThreshold");
        expect(result).toHaveProperty("startDate");
        expect(result).toHaveProperty("endDate");
    });

    it("getStatisticsSpecificSensor → stats with no measurements found", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([])
        }));

        const result = await measurementController.getStatisticsSpecificSensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            "2025-01-01T01:00:00+01:00",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual({
            mean: 0,
            variance: 0,
            upperThreshold: 0,
            lowerThreshold: 0,
            startDate: new Date("2025-01-01T01:00:00+01:00"),
            endDate: new Date("2025-01-02T00:00:00Z")
        });
    });

    it("getOnlyOutliersSpecificSensor → normal operation", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue(fakeMeasurementsWithOutlier)
        }));

        const result = await measurementController.getOnlyOutliersSpecificSensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            "2025-01-01T01:00:00+01:00",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual({
            sensorMacAddress: fakeSensor.macAddress,
            stats: expect.any(Object),
            measurements: [
                {
                    createdAt: outlierMeasurement.createdAt,
                    value: outlierMeasurement.value,
                    isOutlier: true
                }
            ]
        });
    });

    it("getOnlyOutliersSpecificSensor → no outliers found but measurements present in that boundary", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue(fakeMeasurementsWithOutlier.slice(0, 5))
        }));

        const result = await measurementController.getOnlyOutliersSpecificSensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            "2025-01-01T01:00:00+01:00",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual({
            sensorMacAddress: fakeSensor.macAddress,
            stats: expect.any(Object)
        });
    });

    it("storeMeasurementForASensor → normal operation with single measurement", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            storeMeasurementForASensor: jest.fn().mockResolvedValue(fakeMeasurement)
        }));

        const result = await measurementController.storeMeasurementForASensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            [{ createdAt: fakeMeasurement.createdAt, value: fakeMeasurement.value, isOutlier: fakeMeasurement.isOutlier }]
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual({
            id: fakeMeasurement.id,
            createdAt: fakeMeasurement.createdAt,
            value: fakeMeasurement.value,
            isOutlier: fakeMeasurement.isOutlier,
            sensor: fakeMeasurement.sensor
        });
    });

    it("storeMeasurementForASensor → normal operation with multiple measurements", async () => {
        const measurements = [
            fakeMeasurement,
            fakeMeasurement
        ];

        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            storeMeasurementForASensor: jest.fn().mockResolvedValue(measurements)
        }));

        const result = await measurementController.storeMeasurementForASensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            measurements
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual([
            {
                id: measurements[0].id,
                createdAt: measurements[0].createdAt,
                value: measurements[0].value,
                isOutlier: measurements[0].isOutlier,
                sensor: measurements[0].sensor
            },
            {
                id: measurements[1].id,
                createdAt: measurements[1].createdAt,
                value: measurements[1].value,
                isOutlier: measurements[1].isOutlier,
                sensor: measurements[1].sensor
            }
        ]);
    });

    it("storeMeasurementForASensor → no measurements provided", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            storeMeasurementForASensor: jest.fn().mockResolvedValue([])
        }));

        const result = await measurementController.storeMeasurementForASensor(
            fakeNetwork.code,
            fakeGateway.macAddress,
            fakeSensor.macAddress,
            []
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual([]);
    });

    it("getMeasurementsPerNetwork → normal operation", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            undefined,
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        console.log("Result:", result);

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    },
                    measurements: [{
                        createdAt: fakeMeasurement.createdAt,
                        value: fakeMeasurement.value,
                        isOutlier: false
                    }]
                }
            ]
        );
    });

    it("getMeasurementsPerNetwork → no measurements found", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            undefined,
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual([
            {
                sensorMacAddress: fakeSensor.macAddress,
            }
        ]);
    });

    it("getMeasurementsPerNetwork → no sensors found in network", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            undefined,
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual([]);
    });

    it("getMeasurementsPerNetwork → normal operation with single sensor filter", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            [fakeSensor.macAddress],
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    },
                    measurements: [{
                        createdAt: fakeMeasurement.createdAt,
                        value: fakeMeasurement.value,
                        isOutlier: false
                    }]
                }
            ]
        );
    });

    it("getMeasurementsPerNetwork → normal operation with double sensor filter", async () => {
        const secondSensor: SensorDAO = {
            id: 2,
            macAddress: "s2",
            name: "Sensor 2",
            description: "Test Sensor 2",
            variable: "humidity",
            unit: "%",
            gateway: fakeGateway,
            measurements: []
        };

        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor, secondSensor])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            [fakeSensor.macAddress, secondSensor.macAddress],
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    },
                    measurements: [{
                        createdAt: fakeMeasurement.createdAt,
                        value: fakeMeasurement.value,
                        isOutlier: false
                    }]
                },
                {
                    sensorMacAddress: secondSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    },
                    measurements: [{
                        createdAt: fakeMeasurement.createdAt,
                        value: fakeMeasurement.value,
                        isOutlier: false
                    }]
                }
            ]
        );
    });

    it("getMeasurementsPerNetwork → normal operation with empty sensor filter", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getMeasurementsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            [],
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    },
                    measurements: [{
                        createdAt: fakeMeasurement.createdAt,
                        value: fakeMeasurement.value,
                        isOutlier: false
                    }]
                }
            ]
        );
    });

    it("getStatisticsPerNetwork → normal operation", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue([fakeMeasurement])
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getStatisticsPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            undefined,
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: {
                        mean: fakeMeasurement.value,
                        variance: 0,
                        upperThreshold: fakeMeasurement.value,
                        lowerThreshold: fakeMeasurement.value,
                        startDate: new Date("2025-01-01T00:00:00Z"),
                        endDate: new Date("2025-01-02T00:00:00Z")
                    }
                }
            ]
        );
    });

    it("getOutliersPerNetwork → normal operation", async () => {
        (MeasurementRepository as jest.Mock).mockImplementation(() => ({
            getMeasurementsSpecificSensor: jest.fn().mockResolvedValue(fakeMeasurementsWithOutlier)
        }));

        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(fakeNetwork),
            getAllSensorsOfNetwork: jest.fn().mockResolvedValue([fakeSensor])
        }));

        const result = await measurementController.getOutliersPerNetwork(
            fakeMeasurement.sensor.gateway.network.code,
            undefined,
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z"
        );

        expect(MeasurementRepository).toHaveBeenCalled();
        expect(result).toEqual(
            [
                {
                    sensorMacAddress: fakeSensor.macAddress,
                    stats: expect.any(Object),
                    measurements: [
                        {
                            createdAt: outlierMeasurement.createdAt,
                            value: outlierMeasurement.value,
                            isOutlier: true
                        }
                    ]
                }
            ]
        );
    });
});