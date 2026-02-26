import { authenticateUser } from "@middlewares/authMiddleware";
import { processToken } from "@services/authService";
import { UserType } from "@models/UserType";

jest.mock("@services/authService");

describe("authenticateUser middleware", () => {
  const next = jest.fn();
  const res = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("chiama next() se il token è valido", async () => {
    (processToken as jest.Mock).mockResolvedValue({ username: "ghost", type: UserType.Viewer });
    const req = { headers: { authorization: "Bearer validtoken" } } as any;
    const middleware = authenticateUser([UserType.Viewer]);
    await middleware(req, res, next);
    expect(processToken).toHaveBeenCalledWith("Bearer validtoken", [UserType.Viewer]);
    expect(next).toHaveBeenCalledWith();
  });

  it("chiama next(error) se processToken lancia errore", async () => {
    const fakeError = new Error("invalid");
    (processToken as jest.Mock).mockRejectedValue(fakeError);
    const req = { headers: { authorization: "Bearer invalidtoken" } } as any;
    const middleware = authenticateUser([UserType.Admin]);
    await middleware(req, res, next);
    expect(processToken).toHaveBeenCalledWith("Bearer invalidtoken", [UserType.Admin]);
    expect(next).toHaveBeenCalledWith(fakeError);
  });

  it("chiama next(error) se processToken lancia errore con UserType[] = []", async () => {
    const fakeError = new Error("invalid");
    (processToken as jest.Mock).mockRejectedValue(fakeError);
    const req = { headers: { authorization: "Bearer invalidtoken" } } as any;
    const middleware = authenticateUser();
    await middleware(req, res, next);
    expect(processToken).toHaveBeenCalledWith("Bearer invalidtoken",[]);
    expect(next).toHaveBeenCalledWith(fakeError);
  });

});