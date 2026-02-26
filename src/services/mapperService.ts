import { Token as TokenDTO } from "@dto/Token";

import { User as UserDTO } from "@dto/User";
import { UserDAO } from "@models/dao/UserDAO";

import { Network as NetworkDTO } from "@dto/Network";
import { NetworkDAO } from "@models/dao/NetworkDAO";

import { Gateway as GatewayDTO } from "@dto/Gateway";
import { GatewayDAO } from "@models/dao/GatewayDAO";

import { Sensor as SensorDTO } from "@dto/Sensor";
import { SensorDAO } from "@models/dao/SensorDAO";

import { Measurement as MeasurementDTO } from "@dto/Measurement";
import { MeasurementDAO } from "@models/dao/MeasurementDAO";

import { Measurements as MeasurementsDTO } from "@dto/Measurements";

import { Stats as StatsDTO } from "@dto/Stats";

import { ErrorDTO } from "@models/dto/ErrorDTO";
import { UserType } from "@models/UserType";

export function createErrorDTO(
  code: number,
  message?: string,
  name?: string
): ErrorDTO {
  return removeNullAttributes({
    code,
    name,
    message
  }) as ErrorDTO;
}

export function createTokenDTO(token: string): TokenDTO {
  return removeNullAttributes({
    token: token
  }) as TokenDTO;
}

// mapping services for UserDTO
export function createUserDTO(
  username: string,
  type: UserType,
  password?: string
): UserDTO {
  return removeNullAttributes({
    username,
    type,
    password
  }) as UserDTO;
}

export function mapUserDAOToDTO(userDAO: UserDAO): UserDTO {
  return createUserDTO(userDAO.username, userDAO.type);
}

// mapping services for NetworkDTO
export function createNetworkDTO(
  code: string,
  name?: string,
  description?: string,
  gateways?: GatewayDTO[] 
): NetworkDTO {
  return removeNullAttributes({
    code,
    name,
    description,
    gateways
  }) as NetworkDTO;
}

export function mapNetworkDAOToDTO(networkDAO: NetworkDAO): NetworkDTO {
  return createNetworkDTO(
    networkDAO.code, 
    networkDAO.name, 
    networkDAO.description,
    networkDAO.gateways?.map(mapGatewayDAOToDTO) ?? []
  );
}

// mapping services for GatewayDTO
export function createGatewayDTO(
  macAddress: string,
  name?: string,
  description?: string,
  sensors?: SensorDTO[]
): GatewayDTO {
  return removeNullAttributes({
    macAddress,
    name,
    description,
    sensors
  }) as GatewayDTO;
}

export function mapGatewayDAOToDTO(gatewayDAO: GatewayDAO): GatewayDTO {
  return createGatewayDTO(
    gatewayDAO.macAddress,
    gatewayDAO.name,
    gatewayDAO.description,
    gatewayDAO.sensors?.map(mapSensorDAOToDTO) ?? []
  );
}

// mapping services for SensorDTO
export function createSensorDTO(
  macAddress: string,
  name?: string,
  description?: string,
  variable?: string,
  unit?: string
): SensorDTO {
  return removeNullAttributes({
    macAddress,
    name,
    description,
    variable,
    unit
  }) as SensorDTO;
}

export function mapSensorDAOToDTO(sensorDAO: SensorDAO): SensorDTO {
  return createSensorDTO(
    sensorDAO.macAddress,
    sensorDAO.name,
    sensorDAO.description,
    sensorDAO.variable,
    sensorDAO.unit
  );
}

// mapping services for MeasurementDTO
export function createMeasurementDTO(
  createdAt: Date,
  value: number,
  isOutlier?: boolean
): MeasurementDTO {
  return removeNullAttributes({
    createdAt,
    value,
    isOutlier
  }) as MeasurementDTO;
}

export function mapMeasurementDAOToDTO(measurementDAO: MeasurementDAO): MeasurementDTO {
  return createMeasurementDTO(
    measurementDAO.createdAt,
    measurementDAO.value,
    measurementDAO.isOutlier
  );
}

export function createMeasurementsDTO(
  sensorMacAddress: string,
  stats?: StatsDTO,
  measurements?: MeasurementDTO[]
): MeasurementsDTO {
  return removeNullAttributes({
    sensorMacAddress,
    stats,
    measurements
  }) as MeasurementsDTO;
}

export function createStatsDTO(
  mean: number,
  variance: number,
  upperThreshold: number,
  lowerThreshold: number,
  startDate?: Date,
  endDate?: Date
): StatsDTO {
  return removeNullAttributes({
    mean,
    variance,
    upperThreshold,
    lowerThreshold,
    startDate,
    endDate
  }) as StatsDTO;
}

////

function removeNullAttributes<T>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(
      ([_, value]) =>
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0)
    )
  ) as Partial<T>;
}
