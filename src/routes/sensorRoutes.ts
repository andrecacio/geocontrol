import { authenticateUser } from "@middlewares/authMiddleware";
import { UserType } from "@models/UserType";
import { Router } from "express";

import {  getSensorsByGateway,
  createSensor,
  getSensor,
  updateSensor,
  deleteSensor,} from "@controllers/sensorController"
import { SensorFromJSON } from "@models/dto/Sensor";


const router = Router({ mergeParams: true });

// Get all sensors (Any authenticated user)
router.get("", authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]), async(req, res, next) => {
  try {
    const {networkCode,gatewayMac} = req.params;
    res.status(200).json(await getSensorsByGateway(networkCode,gatewayMac));
  } catch (error) {
    next(error);
  }
  
});

// Create a new sensor (Admin & Operator)
router.post("", authenticateUser([UserType.Admin, UserType.Operator]), async (req, res, next) => {
  try{
    const {networkCode,gatewayMac} = req.params;
    const sensorcreated = SensorFromJSON(req.body);
    await createSensor( networkCode, gatewayMac, sensorcreated);
    res.status(201).send();
  }catch(error){
    next(error);
  }
});

// Get a specific sensor (Any authenticated user)
router.get(
  "/:sensorMac",
  authenticateUser([UserType.Admin, UserType.Operator, UserType.Viewer]),
  async (req, res, next) => {
    try {
      const { networkCode, gatewayMac, sensorMac } = req.params;
      res.status(200).json(
        await getSensor(networkCode, gatewayMac, sensorMac)
      );
    } catch (err) { 
      next(err); }
  }
);

// Update a sensor (Admin & Operator)
router.patch(
  "/:sensorMac",
  authenticateUser([UserType.Admin, UserType.Operator]),
  async (req, res, next) => {
    try {
      const { networkCode, gatewayMac, sensorMac } = req.params;
      const dto = await updateSensor(networkCode, gatewayMac, sensorMac, req.body);
      res.status(204).send();
    } catch (err) { next(err); }
  }
);

// Delete a sensor (Admin & Operator)
router.delete(
  "/:sensorMac",
  authenticateUser([UserType.Admin, UserType.Operator]),
  async (req, res, next) => {
    try {
      const { networkCode, gatewayMac, sensorMac } = req.params;
      await deleteSensor(networkCode, gatewayMac, sensorMac);
      res.status(204).send();
    } catch (err) { next(err); }
  }
);

export default router;
