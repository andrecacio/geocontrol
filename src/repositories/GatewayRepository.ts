

import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { GatewayDAO } from "@dao/GatewayDAO";
import { NetworkDAO } from "@dao/NetworkDAO";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils";
import { SensorDAO } from "@models/dao/SensorDAO";
import { ConflictError } from "@models/errors/ConflictError";

export class GatewayRepository {
  private repo: Repository<GatewayDAO>;
  private networkRepo: Repository<NetworkDAO>;
  private sensorRepo: Repository<SensorDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(GatewayDAO);
    this.networkRepo = AppDataSource.getRepository(NetworkDAO);
    this.sensorRepo = AppDataSource.getRepository(SensorDAO);
  }

  private async loadNetworkOrThrow(code: string): Promise<NetworkDAO> {

    const networks = await this.networkRepo.find({ where: { code } });

    return findOrThrowNotFound(
      networks,
      () => networks.length > 0,
      `Network with code '${code}' not found`
    );
  }

  getAllGateways(networkCode: string): Promise<GatewayDAO[]> {
    return this.findByNetwork(networkCode);
  }

  async findByNetwork(networkCode: string): Promise<GatewayDAO[]> {

    await this.loadNetworkOrThrow(networkCode);

    return this.repo.find({
      where: { network: { code: networkCode } },
      relations: ["sensors"],
    });
  }

  async getGatewayByMac(networkCode: string, macAddress: string): Promise<GatewayDAO> {

    await this.loadNetworkOrThrow(networkCode);

    const gateways = await this.repo.find({
      where: { macAddress, network: { code: networkCode } },
      relations: ["sensors"],
    });

    return findOrThrowNotFound(
      gateways,
      () => gateways.length > 0,
      `Gateway '${macAddress}' not found in network '${networkCode}'`
    );
  }

  async createGateway(
    networkCode: string,
    macAddress: string,
    name?: string,
    description?: string
  ): Promise<GatewayDAO> {

    const network = await this.loadNetworkOrThrow(networkCode);

    // Check if macAddress is not already use in gateways db
    throwConflictIfFound(
      await this.repo.find({ where: { macAddress } }),
      () => true,
      `Gateway '${macAddress}' already exists in network '${networkCode}'`
    );

    // Check if macAddress is not already use in sensors db
    throwConflictIfFound(
      await this.sensorRepo.find({ where: { macAddress } }),
      () => true,
      `Entity with code ${macAddress} already exists`
    );

    const gateway = this.repo.create({ macAddress, name, description, network });
    return this.repo.save(gateway);
  }

  async updateGateway(
    networkCode: string,
    macAddress: string,
    data: { macAddress?: string, name?: string; description?: string }
  ): Promise<GatewayDAO> {
    const gateway = await this.getGatewayByMac(networkCode, macAddress);

    if (data.macAddress !== undefined && data.macAddress !== macAddress) {
      throwConflictIfFound(
        await this.repo.find({ where: { macAddress: data.macAddress } }),
        () => true,
        `Entity with code ${data.macAddress} already exists`
      );

      throwConflictIfFound(
        await this.sensorRepo.find({ where: { macAddress: data.macAddress } }),
        () => true,
        `Entity with code ${data.macAddress} already exists`
      );
    }

    if (data.macAddress !== undefined) gateway.macAddress = data.macAddress;
    if (data.name !== undefined) gateway.name = data.name;
    if (data.description !== undefined) gateway.description = data.description;

    return this.repo.save(gateway);
  }

  async deleteGateway(networkCode: string, macAddress: string): Promise<GatewayDAO> {

    const gateway = await this.getGatewayByMac(networkCode, macAddress);

    return await this.repo.remove(gateway);
  }
}
