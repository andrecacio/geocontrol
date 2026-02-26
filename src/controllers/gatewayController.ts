import { Gateway as GatewayDTO } from "@dto/Gateway";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { mapGatewayDAOToDTO } from "@services/mapperService";

export async function getAllGateways(networkCode: string): Promise<GatewayDTO[]> {
  const gatewayRepo = new GatewayRepository();
  return (await gatewayRepo.getAllGateways(networkCode)).map(mapGatewayDAOToDTO);
}

export async function createGateway(networkCode: string, gatewayDTO: GatewayDTO): Promise<void> {
  const gatewayRepo = new GatewayRepository();
  await gatewayRepo.createGateway(networkCode, gatewayDTO.macAddress, gatewayDTO.name, gatewayDTO.description);
}

export async function getGatewayByMac(networkCode: string, mac: string): Promise<GatewayDTO> {
  const gatewayRepo = new GatewayRepository();
  return mapGatewayDAOToDTO(await gatewayRepo.getGatewayByMac(networkCode, mac));
}

export async function updateGateway(networkCode: string, mac: string, gatewayDTO: GatewayDTO): Promise<GatewayDTO> {
  const gatewayRepo = new GatewayRepository();
  return await gatewayRepo.updateGateway(networkCode, mac, gatewayDTO);
}

export async function deleteGateway(networkCode: string, mac: string): Promise<GatewayDTO> {
  const gatewayRepo = new GatewayRepository();
  return await gatewayRepo.deleteGateway(networkCode, mac);
} 