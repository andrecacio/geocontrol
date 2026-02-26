import { Network as NetworkDTO } from "@dto/Network";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { mapNetworkDAOToDTO } from "@services/mapperService";

export async function getAllNetworks(): Promise<NetworkDTO[]> {
  const networkRepo = new NetworkRepository();
  return (await networkRepo.getAllNetworks()).map(mapNetworkDAOToDTO);
}

export async function createNetwork(networkDto: NetworkDTO): Promise<void> {
  const networkRepo = new NetworkRepository();
  await networkRepo.createNetwork(networkDto.code, networkDto.name, networkDto.description);
}

export async function getNetwork(code: string): Promise<NetworkDTO> {
  const networkRepo = new NetworkRepository();
  return mapNetworkDAOToDTO(await networkRepo.getNetworkByCode(code));
}

export async function updateNetwork(prevCode: string, networkDto: NetworkDTO) {
  const networkRepo = new NetworkRepository();
  return await networkRepo.updateNetwork(prevCode, networkDto.code, networkDto.name, networkDto.description);
}

export async function deleteNetwork(code: string): Promise<void> {
  const networkRepo = new NetworkRepository();
  await networkRepo.deleteNetwork(code);
}