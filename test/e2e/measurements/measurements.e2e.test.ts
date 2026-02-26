import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";

import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import { UserRepository } from "@repositories/UserRepository";

import { NetworkDAO } from "@models/dao/NetworkDAO";
import { parseISODateParamToUTC } from "@utils";

describe("Measurement API E2E Tests", () => {
    let tokenAdmin: string;
    let tokenOperator: string;
    let tokenViewer: string;

    let network: NetworkDAO;

    const testNetworkCode = "TEST-NET";
    const testGatewayMac = "11:22:33:44:55:66";

    const testSensorMacforStoreMeasurements = "AA:BB:CC:DD:EE:FF";
    const testSensorMacforSpecificMeasurementsRetrieval = "AB:BB:CC:DD:EE:FF";
    const testSensorMacforSpecificStatsRetrieval = "AC:BB:CC:DD:EE:FF";
    const testSensorMacforSpecificOutlierRetrieval = "AD:BB:CC:DD:EE:FF";

    const testSensorMacforGeneralMeasurementsRetrieval = "AB:AB:CC:DD:EE:FF";
    const testSensorMacforGeneralStatsRetrieval = "AC:AB:CC:DD:EE:FF";
    const testSensorMacforGeneralOutlierRetrieval = "AD:AB:CC:DD:EE:FF";

    const secondSensorMac = "22:33:44:55:66:77";
    const testUserEmail = "test@example.com";
    const testUserPassword = "testPassword123";

    const wrongTokenAuthHeader = "wrong-token-format";

    const testMeasurements = [
        { value: 10, createdAt: "2025-01-01T00:00:00+00:00" },
        { value: 15, createdAt: "2025-01-01T17:00:00+01:00" }
    ];

    const testMeasurementsWithNoRequiredProperty = [
        { value: 10, createdAt: "2025-01-01T00:00:00+00:00" },
        { value: 15 } // missing createdAt
    ];

    const measurementsSensor1withOutlier = [
        { value: 10, createdAt: "2025-01-01T00:00:00+00:00" },
        { value: 10, createdAt: "2025-01-01T08:10:00+02:00" },
        { value: 10, createdAt: "2025-01-01T02:00:00+01:00" },
        { value: -4.32, createdAt: "2025-01-01T22:00:00+01:00" },
        { value: 2, createdAt: "2025-01-01T23:00:00+02:30" },
        { value: 100, createdAt: "2025-01-01T10:30:00+03:00" } // outlier
    ];

    const measurementsSensor2withOutlier = [
        { value: 10, createdAt: "2025-01-01T10:00:00+01:00" },
        { value: 10, createdAt: "2025-01-01T10:10:00+02:00" },
        { value: 10, createdAt: "2025-01-01T10:20:00+01:30" },
        { value: 10, createdAt: "2025-01-01T10:00:00+01:00" },
        { value: 10, createdAt: "2025-01-01T10:10:00+02:00" },
        { value: 10, createdAt: "2025-01-01T10:20:00+03:00" },
        { value: 100, createdAt: "2025-01-01T10:30:00+02:30" } // outlier
    ];

    beforeAll(async () => {
        await beforeAllE2e();

        tokenAdmin = generateToken(TEST_USERS.admin);
        tokenOperator = generateToken(TEST_USERS.operator);
        tokenViewer = generateToken(TEST_USERS.viewer);

        // Create test network
        const networkRepo = new NetworkRepository();
        await networkRepo.createNetwork(testNetworkCode, "Test Network", "Test network description");

        // Create test gateway
        const gatewayRepo = new GatewayRepository();
        await gatewayRepo.createGateway(
            testNetworkCode,
            testGatewayMac,
            "Test Gateway",
            "Test gateway description"
        );

        // Create test sensor
        const sensorRepo = new SensorRepository();
        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforStoreMeasurements,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforSpecificMeasurementsRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforSpecificStatsRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforSpecificOutlierRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforGeneralMeasurementsRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforGeneralStatsRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            testSensorMacforGeneralOutlierRetrieval,
            "Test Sensor",
            "temperature",
            "°C",
            "Test sensor description"
        );

        // Create second test sensor
        await sensorRepo.createSensor(
            testNetworkCode,
            testGatewayMac,
            secondSensorMac,
            "Extra Sensor",
            "temperature",
            "°C",
            "Second test sensor"
        );

        // Create test user
        const userRepo = new UserRepository();
        await userRepo.createUser(testUserEmail, testUserPassword, "admin");
    });

    afterAll(async () => {
        await afterAllE2e();
    });

    describe("Store measurements", () => {
        it("should store measurements (admin)", async () => {
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);

            expect(response.status).toBe(201);

            const checkIfMeasurementsStoredWithoutBoundaries = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(checkIfMeasurementsStoredWithoutBoundaries.status).toBe(200);

            const checkIfMeasurementsStored = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .query({ startDate: "2025-01-01T00:00:00+00:00" })
                .query({ endDate: "2025-01-02T03:00:00+02:30" });

            expect(checkIfMeasurementsStored.status).toBe(200);
            expect(checkIfMeasurementsStored.body).toHaveProperty("measurements");
            expect(Array.isArray(checkIfMeasurementsStored.body.measurements)).toBe(true);
            expect(checkIfMeasurementsStored.body.measurements.length).toBe(testMeasurements.length);
            expect(checkIfMeasurementsStored.body.measurements[0].value).toBeCloseTo(testMeasurements[0].value);
            expect(checkIfMeasurementsStored.body.measurements[1].value).toBeCloseTo(testMeasurements[1].value);
        });


        it("should store measurements (operator)", async () => {
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenOperator}`)
                .send(testMeasurements);

            expect(response.status).toBe(201);
        });

        it("should return bad request when no required properties are passed", async () => {
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurementsWithNoRequiredProperty);

            expect(response.status).toBe(400);
            //expect(response.body.name).toMatch(/BadRequest/); // OPENAPI validator restituisce un "Bad Request" e non BadRequest
            //expect(response.body.message).toMatch(/required property/);
        });

        it("should return insufficient rights when a viewer tries to store measurements", async () => {
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenViewer}`)
                .send(testMeasurements);

            expect(response.status).toBe(403);
            expect(response.body.name).toMatch(/InsufficientRightsError/);
            expect(response.body.message).toMatch(/Insufficient rights/);
        });

        it("should return unauthorized when invalid token format", async () => {
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer`) // without token passed 
                .send(testMeasurements);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/);
            expect(response.body.message).toMatch(/Unauthorized/);
        });

        // AND when no token is provided ?? -----------------------------------------------

        it("should return 404 if network is not found", async () => {
            const fakeNetworkCode = "FAKE-NET";

            const response = await request(app)
                .post(`/api/v1/networks/${fakeNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/Network/);
        });

        it("should return 404 if gateway is not found", async () => {
            const fakeGatewayMac = "DE:AD:BE:EF:00:01";

            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${fakeGatewayMac}/sensors/${testSensorMacforStoreMeasurements}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/Gateway/);
        });

        it("should return 404 if sensor is not found", async () => {
            const fakeSensorMac = "DE:AD:BE:EF:00:02";

            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${fakeSensorMac}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/Sensor/);
        });
    });

    describe("Retrieve measurements by sensor", () => {

        beforeAll(async () => {
            // Store test measurements first
            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);
        });

        it("should retrieve measurements", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .query({
                    startDate: "2025-01-01T01:00:00+01:00",
                    endDate: "2025-01-02T01:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);

            expect(response.body).toHaveProperty("sensorMacAddress", testSensorMacforSpecificMeasurementsRetrieval);
            expect(response.body).toHaveProperty("stats");
            expect(response.body).toHaveProperty("measurements");
            expect(Array.isArray(response.body.measurements)).toBe(true);
            expect(response.body.measurements.length).toBeGreaterThan(0);

            const m = response.body.measurements[0];
            expect(m).toHaveProperty("value");
            expect(m).toHaveProperty("createdAt");
            expect(m.value).toBeCloseTo(testMeasurements[0].value);
            expect(new Date(m.createdAt).toISOString()).toBe(new Date(testMeasurements[0].createdAt).toISOString());
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .query({
                    startDate: "invalid-date",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
            //expect(response.body.name).toMatch(/BadRequest/); // OPENAPI validator restituisce un "Bad Request" e non BadRequest
            //expect(response.body.message).toMatch(/startDate/);
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
            expect(response.body.message).toMatch(/Unauthorized/i);
        });

        // missing token OPENAPI validator restituisce un "Unauthorized" e non UnauthorizedError

        it("should return 404 for non-existent sensor", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/XX:XX:XX:XX:XX:XX/measurements`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 for non-existent gateway", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/XX:XX:XX:XX:XX:XX/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 for non-existent network", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificMeasurementsRetrieval}/measurements`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

    });

    describe("GET stats by sensor", () => {
        const url = `/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificStatsRetrieval}/stats`;

        beforeAll(async () => {
            // Store test measurements first
            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificStatsRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(testMeasurements);
        });

        it("should retrieve statistics successfully (200)", async () => {
            const response = await request(app)
                .get(url)
                .query({
                    startDate: "2025-01-01T01:00:00+01:00",
                    endDate: "2025-01-02T18:00:00+02:30"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                expect.objectContaining({
                    startDate: expect.any(String),
                    endDate: expect.any(String),
                    mean: expect.any(Number),
                    variance: expect.any(Number),
                    upperThreshold: expect.any(Number),
                    lowerThreshold: expect.any(Number)
                })
            );
            expect(response.body.mean).toBeCloseTo(testMeasurements.reduce((sum, m) => sum + m.value, 0) / testMeasurements.length);
            expect(response.body.variance).toBeCloseTo(
                testMeasurements.reduce((sum, m) => sum + Math.pow(m.value - response.body.mean, 2), 0) / testMeasurements.length
            );
            expect(response.body.upperThreshold).toBeCloseTo(response.body.mean + 2 * Math.sqrt(response.body.variance));
            expect(response.body.lowerThreshold).toBeCloseTo(response.body.mean - 2 * Math.sqrt(response.body.variance));
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(url)
                .query({
                    startDate: "not-a-date",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
            //expect(response.body.name).toMatch(/BadRequest/); // OPENAPI validator restituisce un "Bad Request" e non BadRequest
            //expect(response.body.message).toMatch(/startDate/);
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(url)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
            expect(response.body.message).toMatch(/unauthorized/i);
        });

        it("should return 404 for non-existent sensor", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/22:22:22:22:22:22/stats`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 for non-existent gateway", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/22:22:22:22:22:22/sensors/${testSensorMacforSpecificStatsRetrieval}/stats`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 for non-existent network", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificStatsRetrieval}/stats`)
                .query({
                    startDate: "2025-02-18T14:00:00+01:00",
                    endDate: "2025-02-18T08:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });
    });


    describe("GET outliers by sensor", () => {
        const baseUrl = `/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificOutlierRetrieval}/outliers`;

        const query = {
            startDate: "2025-01-01T01:00:00+01:00",
            endDate: "2025-01-02T04:00:00+02:30"
        };

        beforeAll(async () => {
            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificOutlierRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor1withOutlier);
        });

        it("should retrieve outlier measurements successfully (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(query)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("sensorMacAddress", testSensorMacforSpecificOutlierRetrieval);
            expect(response.body).toHaveProperty("stats");

            expect(response.body.stats).toEqual(
                expect.objectContaining({
                    startDate: expect.any(String),
                    endDate: expect.any(String),
                    mean: expect.any(Number),
                    variance: expect.any(Number),
                    upperThreshold: expect.any(Number),
                    lowerThreshold: expect.any(Number)
                })
            );

            expect(Array.isArray(response.body.measurements)).toBe(true);
            expect(response.body.measurements.length).toBeGreaterThan(0);

            const hasOutlier = response.body.measurements.some(m => m.isOutlier === true);
            expect(hasOutlier).toBe(true); // Ensure at least one outlier was detected
            expect(response.body.measurements[0]).toHaveProperty("value");
            expect(response.body.measurements[0]).toHaveProperty("createdAt");
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "invalid-date",
                    endDate: query.endDate
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(query)
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
            expect(response.body.message).toMatch(/unauthorized/i);
        });

        it("should return 404 if sensor not found", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/22:22:22:22:22:22/outliers`)
                .query(query)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 if gateway not found", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/22:22:22:22:22:22/sensors/${testSensorMacforSpecificOutlierRetrieval}/outliers`)
                .query(query)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return 404 if network not found", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/gateways/${testGatewayMac}/sensors/${testSensorMacforSpecificOutlierRetrieval}/outliers`)
                .query(query)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
            expect(response.body.message).toMatch(/not found/i);
        });

        it("should return only sensorMac if no measurements found in that boundary", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2020-01-01T01:00:00+01:00",
                    endDate: "2020-01-02T01:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("sensorMacAddress", testSensorMacforSpecificOutlierRetrieval);
            expect(response.body).not.toHaveProperty("stats");
            expect(response.body).not.toHaveProperty("measurements");
        });
    });

    describe("GET measurements by sensors of a network", () => {
        const baseUrl = `/api/v1/networks/${testNetworkCode}/measurements`;

        const query = {
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-01-02T01:00:00+01:00",
            sensorMacs: testSensorMacforGeneralMeasurementsRetrieval
        };

        beforeAll(async () => {
            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforGeneralMeasurementsRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor1withOutlier);

            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${secondSensorMac}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor2withOutlier);
        });

        it("should retrieve measurements for the given sensors (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(query)
                .set("Authorization", `Bearer ${tokenViewer}`); // any user can access

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeCloseTo(1); // only one sensor requested
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralMeasurementsRetrieval);
            expect(response.body[0]).toHaveProperty("measurements");
            expect(Array.isArray(response.body[0].measurements)).toBe(true);
            expect(response.body[0].measurements.length).toBeGreaterThan(0);

            // Check measurement format
            const measurement = response.body[0].measurements[0];
            expect(measurement).toHaveProperty("createdAt");
            expect(measurement).toHaveProperty("value");
            expect(typeof measurement.createdAt).toBe("string");
            expect(typeof measurement.value).toBe("number");
            expect(measurement.value).toBeCloseTo(measurementsSensor1withOutlier[0].value);
            expect(new Date(measurement.createdAt).toISOString()).toBe((parseISODateParamToUTC(measurementsSensor1withOutlier[0].createdAt).toISOString()));
        });


        it("should retrieve measurements for multiple sensors", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...query,
                    sensorMacs: `${testSensorMacforGeneralMeasurementsRetrieval},${secondSensorMac}`
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);

            const macs = response.body.map(e => e.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralMeasurementsRetrieval, secondSensorMac]));
            expect(response.body[0]).toHaveProperty("measurements");
            expect(Array.isArray(response.body[0].measurements)).toBe(true);
        });

        it("should retrieve measurements for all sensors if none provided", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2025-01-01T01:00:00+01:00",
                    endDate: "2025-01-02T01:00:00+01:00"
                    // no sensorMacs[]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // Both sensors returned

            const macs = response.body.map(e => e.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralMeasurementsRetrieval, secondSensorMac]));
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "invalid-date",
                    endDate: query.endDate,
                    sensorMacs: [testSensorMacforGeneralMeasurementsRetrieval]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(query)
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
            expect(response.body.message).toMatch(/unauthorized/i);
        });

        it("should return 404 for non-existent network", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/measurements`)
                .query(query)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
        });

        it("should return only sensorMac if no measurements found in that boundary", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2020-01-01T01:00:00+01:00",
                    endDate: "2020-01-02T01:00:00+01:00",
                    sensorMacs: testSensorMacforGeneralMeasurementsRetrieval
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralMeasurementsRetrieval);
        });

        it("should return all sensors if sensorMacs = [] (empty array)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2025-01-01T01:00:00+01:00",
                    endDate: "2025-01-02T01:00:00+01:00",
                    sensorMacs: [] // empty array
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // Both sensors returned
            const macs = response.body.map(e => e.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralMeasurementsRetrieval, secondSensorMac]));
        });

    });

    describe("GET stats by sensors of a network", () => {
        const baseUrl = `/api/v1/networks/${testNetworkCode}/stats`;

        const queryBase = {
            startDate: "2025-01-01T01:00:00+01:00",
            endDate: "2025-01-02T01:00:00+01:00"
        };

        beforeAll(async () => {
            // Insert measurements for both sensors
            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforGeneralStatsRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor1withOutlier);

            await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${secondSensorMac}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor2withOutlier);
        });

        it("should retrieve statistics for a single sensor (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: testSensorMacforGeneralStatsRetrieval
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralStatsRetrieval);
            expect(response.body[0]).toHaveProperty("stats");
            expect(response.body[0].stats).toEqual(
                expect.objectContaining({
                    startDate: expect.any(String),
                    endDate: expect.any(String),
                    mean: expect.any(Number),
                    variance: expect.any(Number),
                    upperThreshold: expect.any(Number),
                    lowerThreshold: expect.any(Number)
                })
            );
            expect(response.body[0].stats.mean).toBeCloseTo(
                measurementsSensor1withOutlier.reduce((sum, m) => sum + m.value, 0) / measurementsSensor1withOutlier.length
            );
            expect(response.body[0].stats.variance).toBeCloseTo(
                measurementsSensor1withOutlier.reduce((sum, m) => sum + Math.pow(m.value - response.body[0].stats.mean, 2), 0) / measurementsSensor1withOutlier.length
            );
            expect(response.body[0].stats.upperThreshold).toBeCloseTo(
                response.body[0].stats.mean + 2 * Math.sqrt(response.body[0].stats.variance)
            );
            expect(response.body[0].stats.lowerThreshold).toBeCloseTo(
                response.body[0].stats.mean - 2 * Math.sqrt(response.body[0].stats.variance)
            );

            expect(response.body[0].sensorMacAddress).toBe(testSensorMacforGeneralStatsRetrieval);
        });

        it("should retrieve statistics for multiple sensors (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: `${testSensorMacforGeneralStatsRetrieval},${secondSensorMac}`
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);

            const macs = response.body.map(r => r.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralStatsRetrieval, secondSensorMac]));

            // Check stats format for each sensor
            response.body.forEach(sensor => {
                expect(sensor).toHaveProperty("sensorMacAddress");
                expect(sensor).toHaveProperty("stats");
                expect(sensor.stats).toEqual(
                    expect.objectContaining({
                        startDate: expect.any(String),
                        endDate: expect.any(String),
                        mean: expect.any(Number),
                        variance: expect.any(Number),
                        upperThreshold: expect.any(Number),
                        lowerThreshold: expect.any(Number)
                    })
                );
            });
        });

        it("should retrieve statistics for all sensors (with measurements) if none are provided", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(queryBase)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2);

            const macs = response.body.map(r => r.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralStatsRetrieval, secondSensorMac]));
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "invalid-date",
                    endDate: queryBase.endDate,
                    sensorMacs: [testSensorMacforGeneralStatsRetrieval]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
            //expect(response.body.name).toMatch(/BadRequest/); // OPENAPI validator restituisce un "Bad Request" e non BadRequest
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: [testSensorMacforGeneralStatsRetrieval]
                })
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
        });

        it("should return 404 if network not found", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/stats`)
                .query({
                    ...queryBase,
                    sensorMacs: [testSensorMacforGeneralStatsRetrieval]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
        });

        it("should return only sensorMac if no measurements found in that boundary", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2020-01-01T01:00:00+01:00",
                    endDate: "2020-01-02T01:00:00+01:00",
                    sensorMacs: testSensorMacforGeneralStatsRetrieval
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralStatsRetrieval);
        });
    });

    describe("GET outliers by sensors of a network", () => {
        const baseUrl = `/api/v1/networks/${testNetworkCode}/outliers`;

        const queryBase = {
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-01-02T01:00:00+01:00"
        };

        beforeAll(async () => {
            // Store test measurements for first sensor
            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforGeneralOutlierRetrieval}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor1withOutlier);

            expect(response.status).toBe(201);

            // Store test measurements for second sensor
            const secondResponse = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${secondSensorMac}/measurements`)
                .set("Authorization", `Bearer ${tokenAdmin}`)
                .send(measurementsSensor2withOutlier);

            expect(secondResponse.status).toBe(201);

            // Verify measurements were stored
            const verifyResponse = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMacforGeneralOutlierRetrieval}/measurements`)
                .query({
                    startDate: "2025-01-01T01:00:00+01:00",
                    endDate: "2025-01-02T01:00:00+01:00"
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body).toHaveProperty("sensorMacAddress", testSensorMacforGeneralOutlierRetrieval);
            expect(Array.isArray(verifyResponse.body.measurements)).toBe(true);
            expect(verifyResponse.body.measurements.length).toBeGreaterThan(0);
            expect(verifyResponse.body.measurements[0]).toHaveProperty("value");
            expect(verifyResponse.body.measurements[0]).toHaveProperty("createdAt");
            expect(verifyResponse.body.measurements[0].value).toBeCloseTo(measurementsSensor1withOutlier[0].value);
        });

        it("should return outlier data for a single sensor (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: testSensorMacforGeneralOutlierRetrieval
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralOutlierRetrieval);
            expect(Array.isArray(response.body[0].measurements)).toBe(true);
            expect(response.body[0].measurements.length).toBe(1); // Only one outlier measurement
            expect(response.body[0].measurements.some(m => m.isOutlier)).toBe(true);
        });

        it("should return outlier data for multiple sensors (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: `${testSensorMacforGeneralOutlierRetrieval},${secondSensorMac}`
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            const macs = response.body.map(r => r.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralOutlierRetrieval, secondSensorMac]));
            response.body.forEach(sensor => {
                expect(sensor).toHaveProperty("sensorMacAddress");
                expect(Array.isArray(sensor.measurements)).toBe(true);
                expect(sensor.measurements.some(m => m.isOutlier)).toBe(true); // At least one outlier
            });
        });

        it("should return outlier data for all sensors if none are specified (200)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query(queryBase)
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const macs = response.body.map(r => r.sensorMacAddress);
            expect(macs).toEqual(expect.arrayContaining([testSensorMacforGeneralOutlierRetrieval, secondSensorMac]));
            response.body.forEach(sensor => {
                expect(sensor).toHaveProperty("sensorMacAddress");
                if ([testSensorMacforGeneralOutlierRetrieval, secondSensorMac].includes(sensor.sensorMacAddress)) {
                    expect(Array.isArray(sensor.measurements)).toBe(true);
                    expect(sensor.measurements.some(m => m.isOutlier)).toBe(true); // At least one outlier
                }
            });
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "not-a-date",
                    endDate: queryBase.endDate,
                    sensorMacs: [testSensorMacforGeneralOutlierRetrieval]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(400);
        });

        it("should return 401 for wrong token", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    ...queryBase,
                    sensorMacs: [testSensorMacforGeneralOutlierRetrieval]
                })
                .set("Authorization", `Bearer ${wrongTokenAuthHeader}`);

            expect(response.status).toBe(401);
            expect(response.body.name).toMatch(/UnauthorizedError/i);
        });

        it("should return 404 if network not found", async () => {
            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/outliers`)
                .query({
                    ...queryBase,
                    sensorMacs: [testSensorMacforGeneralOutlierRetrieval]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(404);
            expect(response.body.name).toMatch(/NotFoundError/);
        });

        it("should return only sensorMac if no measurements found in that boundary (with sensorMacs)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2020-01-01T01:00:00+01:00",
                    endDate: "2020-01-02T01:00:00+01:00",
                    sensorMacs: testSensorMacforGeneralOutlierRetrieval
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralOutlierRetrieval);
            expect(response.body[0]).not.toHaveProperty("measurements");
            expect(response.body[0]).not.toHaveProperty("stats");
        });

        it("should return only sensorMac if no measurements found in that boundary (without sensorMacs)", async () => {
            const response = await request(app)
                .get(baseUrl)
                .query({
                    startDate: "2020-01-01T01:00:00+01:00",
                    endDate: "2020-01-02T01:00:00+01:00"
                    // no sensorMacs[]
                })
                .set("Authorization", `Bearer ${tokenAdmin}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0]).toHaveProperty("sensorMacAddress");
            expect(response.body[0]).not.toHaveProperty("measurements");
            expect(response.body[0]).not.toHaveProperty("stats");
        });

        // it("pass empty string -> 400", async () => {
        //     const response = await request(app)
        //         .get(baseUrl)
        //         .query({
        //             startDate: "2020-01-01T01:00:00+01:00",
        //             endDate: "2020-01-02T01:00:00+01:00",
        //             sensorMacs: 3 // empty string
        //         })
        //         .set("Authorization", `Bearer ${tokenAdmin}`);

        //     expect(response.status).toBe(400);
        //     // expect(Array.isArray(response.body)).toBe(true);
        //     // expect(response.body.length).toBe(1);
        //     // expect(response.body[0]).toHaveProperty("sensorMacAddress", testSensorMacforGeneralOutlierRetrieval);
        //     // expect(response.body[0]).not.toHaveProperty("measurements");
        //     // expect(response.body[0]).not.toHaveProperty("stats");
        // });



    });

});
