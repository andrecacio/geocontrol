import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { MeasurementDAO } from "@dao/MeasurementDAO";
import { SensorDAO } from "@dao/SensorDAO";
import { GatewayDAO } from "@dao/GatewayDAO";
import { NetworkDAO } from "@dao/NetworkDAO";
import { Measurement as MeasurementDTO } from "@dto/Measurement";
import { findOrThrowNotFound, throwConflictIfFound, parseISODateParamToUTC } from "@utils";
import { createErrorDTO } from "@services/mapperService";

export class MeasurementRepository {
    private repo: Repository<MeasurementDAO>;
    private networkRepo: Repository<NetworkDAO>;
    private gatewayRepo: Repository<GatewayDAO>;
    private sensorRepo: Repository<SensorDAO>;

    constructor() {
        this.repo = AppDataSource.getRepository(MeasurementDAO);
        this.networkRepo = AppDataSource.getRepository(NetworkDAO);
        this.gatewayRepo = AppDataSource.getRepository(GatewayDAO);
        this.sensorRepo = AppDataSource.getRepository(SensorDAO);
    }

    async getMeasurementsSpecificSensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        startDate?: string,
        endDate?: string
    ): Promise<MeasurementDAO[]> {

        // check if the network exists
        findOrThrowNotFound(
            await this.networkRepo.find(),
            n => n.code === networkCode,
            `Network with code '${networkCode}' not found`
        );

        // check if the gateway exists and belongs to the network
        findOrThrowNotFound(
            await this.gatewayRepo.find({ relations: ["network"] }),
            g => g.macAddress === gatewayMac && g.network.code === networkCode,
            `Gateway with MAC address '${gatewayMac}' not found in network '${networkCode}'`
        );

        // check if the sensor exists and belongs to the gateway
        findOrThrowNotFound(
            await this.sensorRepo.find({ relations: ["gateway"] }),
            s => s.macAddress === sensorMac && s.gateway.macAddress === gatewayMac,
            `Sensor with MAC address '${sensorMac}' not found in gateway '${gatewayMac}'`
        );

        const query = this.repo.createQueryBuilder("measurement")
            .innerJoin("measurement.sensor", "sensor")
            .innerJoin("sensor.gateway", "gateway")
            .innerJoin("gateway.network", "network")
            .where("sensor.macAddress = :sensorMac", { sensorMac })
            .andWhere("gateway.macAddress = :gatewayMac", { gatewayMac })
            .andWhere("network.code = :networkCode", { networkCode })
            .orderBy("measurement.createdAt", "ASC");

        if (startDate) {
            const startDateUTC = parseISODateParamToUTC(startDate);
            if (startDateUTC === undefined) {
                throw createErrorDTO(400, "request/query/startDate must match format 'date-time'", "BadRequest");
            }
            query.andWhere("measurement.createdAt >= :startDate", { startDate: startDateUTC });
        }

        if (endDate) {
            const endDateUTC = parseISODateParamToUTC(endDate);
            if (endDateUTC === undefined) {
                throw createErrorDTO(400, "request/query/endDate must match format 'date-time'", "BadRequest");
            }
            query.andWhere("measurement.createdAt <= :endDate", { endDate: endDateUTC });
        }

        return await query.getMany();
    }

    async storeMeasurementForASensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        measurement: MeasurementDTO[]
    ): Promise<MeasurementDAO[]> {

        // check if the network exists
        findOrThrowNotFound(
            await this.networkRepo.find(),
            n => n.code === networkCode,
            `Network with code '${networkCode}' not found`
        );

        // check if the gateway exists and belongs to the network
        findOrThrowNotFound(
            await this.gatewayRepo.find({ relations: ["network"] }),
            g => g.macAddress === gatewayMac && g.network.code === networkCode,
            `Gateway with MAC address '${gatewayMac}' not found in network '${networkCode}'`
        );

        // check if the sensor exists and belongs to the gateway
        findOrThrowNotFound(
            await this.sensorRepo.find({ relations: ["gateway"] }),
            s => s.macAddress === sensorMac && s.gateway.macAddress === gatewayMac,
            `Sensor with MAC address '${sensorMac}' not found in gateway '${gatewayMac}'`
        );

        const sensor = await this.sensorRepo
            .createQueryBuilder("sensor")
            .innerJoinAndSelect("sensor.gateway", "gateway")
            .innerJoinAndSelect("gateway.network", "network")
            .where("sensor.macAddress = :sensorMac", { sensorMac })
            .andWhere("gateway.macAddress = :gatewayMac", { gatewayMac })
            .andWhere("network.code = :networkCode", { networkCode })
            .getOne();

        const measurementsToSave = measurement.map(m => {
            console.log("date:", m.createdAt);
            console.log("date type:", typeof m.createdAt);

            const createdAtUTC = parseISODateParamToUTC(m.createdAt);
            if (createdAtUTC === undefined) {
                throw createErrorDTO(400, "request/body/createdAt must match format 'date-time'", "BadRequest");
            }
            return {
                ...m,
                sensor,
                createdAt: createdAtUTC.toISOString()
            };
        });
        return await this.repo.save(measurementsToSave);
    }
}