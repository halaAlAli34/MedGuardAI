jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

const jwt = require("jsonwebtoken");
const User = require("../../src/models/User");
const { requireAuth } = require("../../src/middleware/auth.middleware");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("rejects with 401 when the Authorization header is missing", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the token is invalid/expired", async () => {
    jwt.verify.mockImplementation(() => { throw new Error("jwt expired"); });
    const req = { headers: { authorization: "Bearer badtoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the token is valid but the user no longer exists", async () => {
    jwt.verify.mockReturnValue({ id: "ghost-user" });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = { headers: { authorization: "Bearer goodtoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the user to req and calls next() on a valid token", async () => {
    jwt.verify.mockReturnValue({ id: "user1" });
    const fakeUser = { _id: "user1", name: "Jordan Lee", role: "patient" };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

    const req = { headers: { authorization: "Bearer goodtoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});
