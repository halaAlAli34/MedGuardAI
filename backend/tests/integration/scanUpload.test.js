jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/User");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const app = require("../../src/app");

describe("POST /api/medications/scan — real HTTP request through the full middleware stack", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: "user1" });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "user1", name: "Test User", role: "patient" })
    });
  });

  it("returns 401 with no auth token at all (route is behind requireAuth)", async () => {
    const res = await request(app).post("/api/medications/scan");
    expect(res.status).toBe(401);
  });

  it("returns 400 (not 500) when a non-image file is uploaded — the exact edge case from Day 8's QA checklist", async () => {
    const res = await request(app)
      .post("/api/medications/scan")
      .set("Authorization", "Bearer faketoken")
      .attach("image", Buffer.from("not an image, just text"), { filename: "note.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only image uploads/i);
  });

  it("returns 400 when no file is attached at all", async () => {
    const res = await request(app)
      .post("/api/medications/scan")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(400);
  });
});

describe("GET /api/health — sanity check that the app boots and responds without a DB connection", () => {
  it("responds 200 with a status payload", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("404 handler", () => {
  it("returns a clean 404 JSON body for an unknown route", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Not found");
  });
});
