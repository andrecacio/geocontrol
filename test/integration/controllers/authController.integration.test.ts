import * as authController   from "@controllers/authController";
import { UserRepository }    from "@repositories/UserRepository";
import { generateToken }     from "@services/authService";
import { UserType }          from "@models/UserType";
import { UnauthorizedError } from "@errors/UnauthorizedError";

jest.mock("@repositories/UserRepository");
jest.mock("@services/authService");

describe("authController.getToken", () => {
  const userDao = { username: "john", password: "pwd", type: UserType.Admin };

  beforeEach(() => {
    jest.clearAllMocks();
    // mock del repo che ritorna sempre lo stesso DAO
    (UserRepository as jest.Mock).mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(userDao)
    }));
  });

  it("ritorna TokenDTO se password corretta", async () => {
    // mock del JWT
    (generateToken as jest.Mock).mockReturnValue("signed.jwt");

    const tokenDTO = await authController.getToken({
      username: "john",
      password: "pwd",              // password corretta
      type: UserType.Admin
    });

    expect(generateToken).toHaveBeenCalledWith({
      username: "john",
      password: "pwd",
      type: UserType.Admin
    });
    expect(tokenDTO).toEqual({ token: "signed.jwt" });
  });

  it("lancia UnauthorizedError se password sbagliata", async () => {
    await expect(
      authController.getToken({ username: "john", password: "wrong", type: UserType.Admin })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
