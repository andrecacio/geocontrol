import * as measurementController from "@controllers/measurementController";
import { NotFoundError } from "@models/errors/NotFoundError";
import request from "supertest";
import { app } from "@app";

// Mocks
jest.mock("@controllers/measurementController");
jest.mock("@repositories/MeasurementRepository");

jest.mock("@middlewares/authMiddleware", () => ({
    authenticateUser: jest.fn(() => (req, res, next) => next())
}));

jest.mock("@models/UserType", () => ({
    UserType: {
        Admin: "admin",
        Operator: "operator",
        Viewer: "viewer"
    }
}));

const mockMeasurements = [
    { value: 1.5, createdAt: "2025-01-01T10:00:00Z", isOutlier: false },
    { value: -3.1, createdAt: "2025-01-01T11:00:00Z", isOutlier: false }
];

const mean = mockMeasurements.reduce((sum, m) => sum + m.value, 0) / mockMeasurements.length;
const variance = mockMeasurements.reduce((sum, m) => sum + Math.pow(m.value - mean, 2), 0) / mockMeasurements.length;
const upperThreshold = mean + 2 * Math.sqrt(variance);
const lowerThreshold = mean - 2 * Math.sqrt(variance);

const expectedStats = {
    mean: mean,
    variance: variance,
    upperThreshold: upperThreshold,
    lowerThreshold: lowerThreshold
}

const expectedOutput = {
    sensorMacAddress: "testSensorMac",
    stats: expectedStats,
    measurements: mockMeasurements
}

const expectedOutliers = {
    sensorMacAddress: "testSensorMac",
    stats: expectedStats,
    measuremens: [
        {
            value: 250,
            createdAt: "2025-01-01T11:00:00Z",
            isOutlier: true
        }
    ]
};

const expectedPerNetworkStats = [
    {
        sensorMacAddress: "testSensorMac",
        stats: expectedStats
    }
]

const testNetworkCode = "testNetwork";
const testGatewayMac = "testGatewayMac";
const testSensorMac = "testSensorMac";

describe("MeasurementRoutes integration", () => {
    const token = "Bearer faketoken";

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /:sensorMac/measurements", () => {
        it("should store measurements for a sensor", async () => {
            (measurementController.storeMeasurementForASensor as jest.Mock).mockResolvedValue(mockMeasurements);
            (measurementController.getMeasurementsSpecificSensor as jest.Mock).mockResolvedValue(expectedOutput);

            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/measurements`)
                .set("Authorization", token)
                .send(mockMeasurements);

            expect(response.status).toBe(201);

            const checkget = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/measurements`)
                .set("Authorization", token);

            console.log("Check GET response body:", checkget.body);

            expect(checkget.status).toBe(200);
            expect(checkget.body).toEqual(expectedOutput);
        });

        it("should return 201 if measurements are not provided", async () => {
            (measurementController.storeMeasurementForASensor as jest.Mock).mockResolvedValue([]);

            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/measurements`)
                .set("Authorization", token)
                .send([]);

            expect(response.status).toBe(201);
        });
        
        it("should return 404 if sensor not found", async () => {
            (measurementController.storeMeasurementForASensor as jest.Mock).mockRejectedValue(new NotFoundError("Network not found"));

            const response = await request(app)
                .post(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/FAKE-NET/measurements`)
                .set("Authorization", token)
                .send([]);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /:sensorMac/measurements", () => {
        it("should retrieve measurements for a specific sensor", async () => {
            (measurementController.getMeasurementsSpecificSensor as jest.Mock).mockResolvedValue(expectedOutput);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/measurements`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expectedOutput);
        });

        it("should return 404 if sensor not found", async () => {
            (measurementController.getMeasurementsSpecificSensor as jest.Mock).mockRejectedValue(new NotFoundError("Sensor not found"));

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/FAKE-SENSOR/measurements`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /:sensorMac/stats", () => {
        it("should retrieve statistics for a specific sensor", async () => {
            (measurementController.getStatisticsSpecificSensor as jest.Mock).mockResolvedValue(expectedStats);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/stats`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expectedStats);
        });

        it("should return 404 if sensor not found", async () => {
            (measurementController.getStatisticsSpecificSensor as jest.Mock).mockRejectedValue(new NotFoundError("Sensor not found"));

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/FAKE-SENSOR/stats`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /:sensorMac/outliers", () => {
        it("should retrieve outliers for a specific sensor", async () => {
            
            (measurementController.getOnlyOutliersSpecificSensor as jest.Mock).mockResolvedValue(expectedOutliers);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/${testSensorMac}/outliers`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expectedOutliers);
        });

        it("should return 404 if sensor not found", async () => {
            (measurementController.getOnlyOutliersSpecificSensor as jest.Mock).mockRejectedValue(new NotFoundError("Sensor not found"));

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/gateways/${testGatewayMac}/sensors/FAKE-SENSOR/outliers`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /networks/:networkCode/measurements", () => {
        it("should retrieve all measurements for a network", async () => {
            (measurementController.getMeasurementsPerNetwork as jest.Mock).mockResolvedValue([expectedOutput]);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/measurements`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body[0].sensorMacAddress).toBe (expectedOutput.sensorMacAddress);
            expect(response.body[0].stats).toEqual(expectedOutput.stats);
            expect(response.body[0].measurements).toEqual(expectedOutput.measurements);
        });

        it("should return 404 if network not found", async () => {
            (measurementController.getMeasurementsPerNetwork as jest.Mock).mockRejectedValue(new NotFoundError("Network not found"));

            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/measurements`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /networks/:networkCode/stats", () => {
        it("should retrieve statistics for a network", async () => {
            (measurementController.getStatisticsPerNetwork as jest.Mock).mockResolvedValue(expectedPerNetworkStats);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/stats`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expectedPerNetworkStats);
        });

        it("should return 404 if network not found", async () => {
            (measurementController.getStatisticsPerNetwork as jest.Mock).mockRejectedValue(new NotFoundError("Network not found"));

            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/stats`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });

    describe("GET /networks/:networkCode/outliers", () => {
        it("should retrieve outliers for a network", async () => {
            (measurementController.getOutliersPerNetwork as jest.Mock).mockResolvedValue([expectedOutliers]);

            const response = await request(app)
                .get(`/api/v1/networks/${testNetworkCode}/outliers`)
                .set("Authorization", token);

            expect(response.status).toBe(200);
            expect(response.body[0].sensorMacAddress).toBe(expectedOutliers.sensorMacAddress);
            expect(response.body[0].stats).toEqual(expectedOutliers.stats);
            expect(response.body[0].measuremens).toEqual(expectedOutliers.measuremens);
        });

        it("should return 404 if network not found", async () => {
            (measurementController.getOutliersPerNetwork as jest.Mock).mockRejectedValue(new NotFoundError("Network not found"));

            const response = await request(app)
                .get(`/api/v1/networks/FAKE-NET/outliers`)
                .set("Authorization", token);

            expect(response.status).toBe(404);
            expect(response.body.name).toBe("NotFoundError");
        });
    });
});