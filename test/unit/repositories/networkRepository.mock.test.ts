import { NetworkRepository } from "@repositories/NetworkRepository";
import { NetworkDAO } from "@dao/NetworkDAO";
import { ConflictError } from "@errors/ConflictError";
import { NotFoundError } from "@errors/NotFoundError";

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();

jest.mock("@database", () => ({
  AppDataSource: {
    getRepository: () => ({
      find: mockFind,
      save: mockSave,
      delete: mockDelete
    })
  }
}));

describe("NetworkRepository – mocked DB", () => {
  const repo = new NetworkRepository();

  beforeEach(() => jest.clearAllMocks());

  it("createNetwork → save chiamato", async () => {
    mockFind.mockResolvedValue([]);           // no conflict
    const dao = Object.assign(new NetworkDAO(), { code: "net1" });
    mockSave.mockResolvedValue(dao);

    const res = await repo.createNetwork("net1", "N", "D");
    expect(res.code).toBe("net1");
    expect(mockSave).toHaveBeenCalledWith({
      code: "net1",
      name: "N",
      description: "D"
    });
  });

  it("createNetwork → ConflictError", async () => {
    mockFind.mockResolvedValue([{}]);         // simulate duplicate
    await expect(
      repo.createNetwork("dup", "x", "y")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("getNetworkByCode → NotFoundError", async () => {
    mockFind.mockResolvedValue([]);
    await expect(repo.getNetworkByCode("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updateNetwork → passa 4 argomenti e ritorna DAO", async () => {
    // 1° find: getNetworkByCode
    // 2° find: duplicate check (vuoto)
    mockFind
      .mockResolvedValueOnce([ { code: "net1" } ])   // attuale
      .mockResolvedValueOnce([]);                    // nessun code dup
    mockSave.mockResolvedValue({ code: "net2", name: "N", description: "D" });

    const res = await repo.updateNetwork("net1", "net2", "N", "D");
    expect(res.code).toBe("net2");
  });

  it("deleteNetwork → NotFoundError se affected 0", async () => {
    mockDelete.mockResolvedValue({ affected: 0 });
    await expect(repo.deleteNetwork("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });
});
