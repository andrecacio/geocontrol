import { Sensor as SensorDTO } from "@dto/Sensor";
import { SensorRepository  } from "@repositories/SensorRepository";
import { mapSensorDAOToDTO } from "@services/mapperService";


export async function getSensorsByGateway(networkcode:string,gatewayMac: string ): Promise<SensorDTO[]> {
    const repo = new SensorRepository();
    const daos = (await repo.findByGateway(networkcode,gatewayMac));
    return daos.map(mapSensorDAOToDTO);
  }

export async function createSensor(networkCode: string, gatewayMac: string, sensorDto: SensorDTO): Promise<void> {
    const sensorRepo = new SensorRepository();
    const { macAddress, name, description,variable,unit } = sensorDto;
    await sensorRepo.createSensor(networkCode, gatewayMac, macAddress, name, description,variable,unit);
}
export async function getSensor(networkCode: string,gatewayMac: string,sensorMac: string): Promise<SensorDTO> {
  const repo = new SensorRepository();
  const dao  = await repo.getSensorByMac(networkCode, gatewayMac, sensorMac);
  return mapSensorDAOToDTO(dao);
}

export async function updateSensor(networkCode: string,gatewayMac: string,sensorMac: string,
  data: { macAddress?:string; name?: string; description?: string; variable?: string; unit?: string }
): Promise<SensorDTO> {
  const repo = new SensorRepository();
  const dao  = await repo.updateSensor(networkCode, gatewayMac, sensorMac, data);
  return mapSensorDAOToDTO(dao);
}

export async function deleteSensor(networkCode: string, gatewayMac: string,sensorMac: string): Promise<void> {
  const repo = new SensorRepository();
  await repo.deleteSensor(networkCode, gatewayMac, sensorMac);
}