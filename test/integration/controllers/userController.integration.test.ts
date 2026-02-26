import * as userController  from "@controllers/userController";
import { UserRepository }   from "@repositories/UserRepository";
import { UserDAO }          from "@dao/UserDAO";
import { UserType }         from "@models/UserType";
import { ConflictError }    from "@errors/ConflictError";
import { NotFoundError }    from "@errors/NotFoundError";

jest.mock("@repositories/UserRepository");

describe("UserController integration", () => {
  it("get User: mapperService integration", async () => {
    const fakeUserDAO: UserDAO = {
      username: "testuser",
      password: "secret",
      type: UserType.Operator
    };

    const expectedDTO = {
      username: fakeUserDAO.username,
      type: fakeUserDAO.type
    };

    (UserRepository as jest.Mock).mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(fakeUserDAO)
    }));

    const result = await userController.getUser("testuser");

    expect(result).toEqual({
      username: expectedDTO.username,
      type: expectedDTO.type
    });
    expect(result).not.toHaveProperty("password");
  });
  it("createUser → inoltra parametri", async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (UserRepository as jest.Mock).mockImplementation(() => ({
      createUser: spy
    }));

    await expect(userController.createUser({
      username: "new",
      password: "p",
      type: UserType.Viewer
    })).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledWith("new", "p", UserType.Viewer);
  });

  it("createUser → ConflictError se duplicato", async () => {
    (UserRepository as jest.Mock).mockImplementation(() => ({
      createUser: jest.fn().mockRejectedValue(new ConflictError("dup"))
    }));

    await expect(
      userController.createUser({ username: "dup", password: "x", type: UserType.Viewer })
    ).rejects.toBeInstanceOf(ConflictError);
  });

 
  it("deleteUser → inoltra username", async () => {
    const spy = jest.fn().mockResolvedValue(undefined);
    (UserRepository as jest.Mock).mockImplementation(() => ({
      deleteUser: spy
    }));

    await expect(userController.deleteUser("testuser")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("testuser");
  });

  it("deleteUser → NotFoundError se assente", async () => {
    (UserRepository as jest.Mock).mockImplementation(() => ({
      deleteUser: jest.fn().mockRejectedValue(new NotFoundError("missing"))
    }));

    await expect(userController.deleteUser("ghost"))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
