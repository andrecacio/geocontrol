import { CONFIG } from "@config";
import { authenticateUser } from "@middlewares/authMiddleware";
import AppError from "@models/errors/AppError";
import { UserType } from "@models/UserType";
import { Router } from "express";

import {
  getMeasurementsSpecificSensor,
  getStatisticsSpecificSensor,
  getOnlyOutliersSpecificSensor,
  storeMeasurementForASensor,
  getMeasurementsPerNetwork,
  getStatisticsPerNetwork,
  getOutliersPerNetwork
} from "@controllers/measurementController";

const router = Router();

// Store a measurement for a sensor (Admin & Operator)
router.post(
  CONFIG.ROUTES.V1_SENSORS + "/:sensorMac/measurements",
  authenticateUser([UserType.Admin, UserType.Operator]),
  async (req, res, next) => {
    try {
      await storeMeasurementForASensor(
        req.params.networkCode,
        req.params.gatewayMac,
        req.params.sensorMac,
        req.body)
      res.status(201).send();
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve measurements for a specific sensor
router.get(
  CONFIG.ROUTES.V1_SENSORS + "/:sensorMac/measurements",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getMeasurementsSpecificSensor(
          req.params.networkCode,
          req.params.gatewayMac,
          req.params.sensorMac,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined));
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve statistics for a specific sensor
router.get(CONFIG.ROUTES.V1_SENSORS + "/:sensorMac/stats",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getStatisticsSpecificSensor(
          req.params.networkCode,
          req.params.gatewayMac,
          req.params.sensorMac,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined));
    } catch (error) {
      next(error);
    }
  });

// Retrieve only outliers for a specific sensor
router.get(
  CONFIG.ROUTES.V1_SENSORS + "/:sensorMac/outliers",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getOnlyOutliersSpecificSensor(
          req.params.networkCode,
          req.params.gatewayMac,
          req.params.sensorMac,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined));
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve measurements for a set of sensors of a specific network
router.get(
  CONFIG.ROUTES.V1_NETWORKS + "/:networkCode/measurements",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getMeasurementsPerNetwork(
          req.params.networkCode,
          Array.isArray(req.query.sensorMacs)
            ? req.query.sensorMacs.map(String)
            : typeof req.query.sensorMacs === "string"
              ? [req.query.sensorMacs]
              : undefined,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined)
      );

    } catch (error) {
      next(error);
    }
  }
);

// Retrieve statistics for a set of sensors of a specific network
router.get(
  CONFIG.ROUTES.V1_NETWORKS + "/:networkCode/stats",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getStatisticsPerNetwork(
          req.params.networkCode,
          Array.isArray(req.query.sensorMacs)
            ? req.query.sensorMacs.map(String)
            : typeof req.query.sensorMacs === "string"
              ? [req.query.sensorMacs]
              : undefined,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined)
      );
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve only outliers for a set of sensors of a specific network
router.get(
  CONFIG.ROUTES.V1_NETWORKS + "/:networkCode/outliers",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      res.status(200).json(
        await getOutliersPerNetwork(
          req.params.networkCode,
          Array.isArray(req.query.sensorMacs)
            ? req.query.sensorMacs.map(String)
            : typeof req.query.sensorMacs === "string"
              ? [req.query.sensorMacs]
              : undefined,
          typeof req.query.startDate === "string" ? req.query.startDate : undefined,
          typeof req.query.endDate === "string" ? req.query.endDate : undefined)
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
