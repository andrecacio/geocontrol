import { Measurement as MeasurementDTO } from "@dto/Measurement";
import { Measurements as MeasurementsDTO } from "@dto/Measurements";
import { Stats as StatsDTO } from "@dto/Stats";
import { parseStringArrayParam, removeDuplicateStrings } from "@utils";
import { MeasurementRepository } from "@repositories/MeasurementRepository";
import { NetworkRepository } from "@repositories/NetworkRepository";
import {
    createMeasurementsDTO,
    createStatsDTO,
    mapMeasurementDAOToDTO
} from "@services/mapperService";

import { calculateStats, mapOutliers, extractOnlyOutliers } from "statsutils";

export async function getMeasurementsSpecificSensor(
    networkCode: string,
    gatewayMac: string,
    sensorMac: string,
    startDate?: string,
    endDate?: string
): Promise<MeasurementsDTO> {
    const measurementRepository = new MeasurementRepository();
    const measurements = (
        await measurementRepository.getMeasurementsSpecificSensor(
            networkCode, gatewayMac, sensorMac, startDate, endDate
        )
    ).map(mapMeasurementDAOToDTO);

    if (measurements.length === 0 && !startDate && !endDate) {
        return createMeasurementsDTO(sensorMac);
    }

    const {
        statsDTO,
        mappedMeasurementsWithOutliers
    } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

    return createMeasurementsDTO(sensorMac, statsDTO, mappedMeasurementsWithOutliers);
}

export async function getStatisticsSpecificSensor(
    networkCode: string,
    gatewayMac: string,
    sensorMac: string,
    startDate?: string,
    endDate?: string
): Promise<StatsDTO> {
    const measurementRepository = new MeasurementRepository();
    const measurements = (
        await measurementRepository.getMeasurementsSpecificSensor(
            networkCode, gatewayMac, sensorMac, startDate, endDate
        )
    ).map(mapMeasurementDAOToDTO);

    const {
        statsDTO
    } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

    return statsDTO;
}

export async function getOnlyOutliersSpecificSensor(
    networkCode: string,
    gatewayMac: string,
    sensorMac: string,
    startDate?: string,
    endDate?: string
): Promise<MeasurementsDTO> {
    const measurementRepository = new MeasurementRepository();
    const measurements = (
        await measurementRepository.getMeasurementsSpecificSensor(
            networkCode, gatewayMac, sensorMac, startDate, endDate
        )
    ).map(mapMeasurementDAOToDTO);

    const {
        statsDTO,
        mappedMeasurementsWithOutliers
    } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

    const outliers = extractOnlyOutliers(mappedMeasurementsWithOutliers);

    if (measurements.length === 0) {
        return createMeasurementsDTO(sensorMac);
    }

    return createMeasurementsDTO(sensorMac, statsDTO, outliers);
}

export async function storeMeasurementForASensor(
    networkCode: string,
    gatewayMac: string,
    sensorMac: string,
    measurementDTO: MeasurementDTO[]
): Promise<MeasurementDTO[]> {
    const measurementRepository = new MeasurementRepository();
    const measurement = await measurementRepository.storeMeasurementForASensor(
        networkCode,
        gatewayMac,
        sensorMac,
        measurementDTO
    );

    return measurement;
}

export async function getMeasurementsPerNetwork(
    networkCode: string,
    sensorMacs?: string[],
    startDate?: string,
    endDate?: string
): Promise<MeasurementsDTO[]> {
    const measurementRepository = new MeasurementRepository();
    const networkRepository = new NetworkRepository();

    const network = await networkRepository.getNetworkByCode(networkCode);
    const sensors = await networkRepository.getAllSensorsOfNetwork(networkCode);

    const sensorMacsSplitted = parseStringArrayParam(sensorMacs);

    let measurements;
    let measurementsDTO = [];

    if (sensorMacsSplitted === undefined || sensorMacsSplitted.length === 0) {
        // returns an array of measurementsDTO for all sensors in the network

        for (const sensor of sensors) {
            const sensorMac = sensor.macAddress;

            measurements = (
                await measurementRepository.getMeasurementsSpecificSensor(
                    networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                )
            ).map(mapMeasurementDAOToDTO);

            const {
                statsDTO,
                mappedMeasurementsWithOutliers
            } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

            if (measurements.length === 0) {
                measurementsDTO.push(createMeasurementsDTO(sensorMac));
            } else {
                measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO, mappedMeasurementsWithOutliers));
            }
        }

    } else {

        for (const sensorMac of removeDuplicateStrings(sensorMacsSplitted)) {
            const sensor = sensors.find((sensor) => sensor.macAddress === sensorMac);

            if (sensor) {
                measurements = (
                    await measurementRepository.getMeasurementsSpecificSensor(
                        networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                    )
                ).map(mapMeasurementDAOToDTO);

                const {
                    statsDTO,
                    mappedMeasurementsWithOutliers
                } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

                if (measurements.length === 0) {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac));
                } else {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO, mappedMeasurementsWithOutliers));
                }
            }
        }
    }

    return measurementsDTO;
}

export async function getStatisticsPerNetwork(
    networkCode: string,
    sensorMacs?: string[],
    startDate?: string,
    endDate?: string
): Promise<MeasurementsDTO[]> {
    const measurementRepository = new MeasurementRepository();
    const networkRepository = new NetworkRepository();

    const network = await networkRepository.getNetworkByCode(networkCode);
    const sensors = await networkRepository.getAllSensorsOfNetwork(networkCode);

    const sensorMacsSplitted = parseStringArrayParam(sensorMacs);

    let measurements;
    let measurementsDTO = [];

    if (sensorMacsSplitted == undefined || sensorMacsSplitted.length === 0) {
        for (const sensor of sensors) {
            const sensorMac = sensor.macAddress;
            measurements = (
                await measurementRepository.getMeasurementsSpecificSensor(
                    networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                )
            ).map(mapMeasurementDAOToDTO);

            const {
                statsDTO
            } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

            if (measurements.length === 0) {
                measurementsDTO.push(createMeasurementsDTO(sensorMac));
            } else {
                measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO));
            }
        }

    } else {
        for (const sensorMac of removeDuplicateStrings(sensorMacsSplitted)) {
            const sensor = sensors.find((sensor) => sensor.macAddress === sensorMac);

            if (sensor) {
                measurements = (
                    await measurementRepository.getMeasurementsSpecificSensor(
                        networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                    )
                ).map(mapMeasurementDAOToDTO);

                const {
                    statsDTO
                } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

                if (measurements.length === 0) {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac));
                } else {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO));
                }
            }
        }
    }

    return measurementsDTO;
}

export async function getOutliersPerNetwork(
    networkCode: string,
    sensorMacs?: string[],
    startDate?: string,
    endDate?: string
): Promise<MeasurementsDTO[]> {
    const measurementRepository = new MeasurementRepository();
    const networkRepository = new NetworkRepository();

    const network = await networkRepository.getNetworkByCode(networkCode);
    const sensors = await networkRepository.getAllSensorsOfNetwork(networkCode);

    const sensorMacsSplitted = parseStringArrayParam(sensorMacs);

    let measurements;
    let measurementsDTO = [];

    if (sensorMacsSplitted == undefined || sensorMacsSplitted.length === 0) {
        for (const sensor of sensors) {
            const sensorMac = sensor.macAddress;
            measurements = (
                await measurementRepository.getMeasurementsSpecificSensor(
                    networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                )
            ).map(mapMeasurementDAOToDTO);

            const {
                statsDTO,
                mappedMeasurementsWithOutliers
            } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

            const outliers = extractOnlyOutliers(mappedMeasurementsWithOutliers);

            if (measurements.length === 0) {
                measurementsDTO.push(createMeasurementsDTO(sensorMac));
            } else {
                measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO, outliers));
            }

        }

    } else {
        for (const sensorMac of removeDuplicateStrings(sensorMacsSplitted)) {
            const sensor = sensors.find((sensor) => sensor.macAddress === sensorMac);

            if (sensor) {
                measurements = (
                    await measurementRepository.getMeasurementsSpecificSensor(
                        networkCode, sensor.gateway.macAddress, sensorMac, startDate, endDate
                    )
                ).map(mapMeasurementDAOToDTO);

                const {
                    statsDTO,
                    mappedMeasurementsWithOutliers
                } = gestStatsAndMappedMeasurements(measurements, startDate, endDate);

                const outliers = extractOnlyOutliers(mappedMeasurementsWithOutliers);

                if (measurements.length === 0) {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac));
                } else {
                    measurementsDTO.push(createMeasurementsDTO(sensorMac, statsDTO, outliers));
                }
            }
        }
    }

    return measurementsDTO;
}

function gestStatsAndMappedMeasurements(
    measurements: any[],
    startDate?: string,
    endDate?: string
): { statsDTO: any; mappedMeasurementsWithOutliers: any[] } {
    const stats = calculateStats(
        measurements.map((measurement) => measurement.value)
    );

    const { mean, variance, upperThreshold, lowerThreshold } = stats;

    const mappedMeasurementsWithOutliers = mapOutliers(
        measurements,
        lowerThreshold,
        upperThreshold
    );

    const statsDTO = createStatsDTO(
        mean,
        variance,
        upperThreshold,
        lowerThreshold,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
    );

    return { statsDTO, mappedMeasurementsWithOutliers };
}
