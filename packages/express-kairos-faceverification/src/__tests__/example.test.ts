import startServer from "../example/server";
import request from "supertest";
import fs from "fs";
import { KairosAPI } from "../kairosApi";
import { HumanAPI } from "../humanApi";
jest.setTimeout(30000);
describe("Example Server", () => {
  let app,
    server,
    api,
    human,
    img1,
    img2,
    img2b,
    img3,
    spoof1,
    spoof2,
    img4,
    img4b,
    img5,
    img5b;
  beforeAll(async () => {
    api = new KairosAPI(
      { app_id: process.env.KAIROS_ID, app_key: process.env.KAIROS_KEY },
      "test",
      false
    );
    human = new HumanAPI(
      api,
      {
        livenessThresh: 0.8,
        uniqueThresh: 0.8,
        minEnrollImages: 2,
        maxHeadAngle: 10,
        minPhashSimilarity: 0.65
      },
      true
    );
    const serverRes = startServer(api, human);
    server = serverRes.server;
    app = serverRes.app;
    let myimg = fs.readFileSync("./__tests__/myimg.jpg");
    img1 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg2.jpg");
    img2 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg2b.jpg");
    img2b = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg3.jpg");
    img3 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg5.jpg");
    img5 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg5b.jpg");
    img5b = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/spoof1.jpg");
    spoof1 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/spoof2.jpg");
    spoof2 = Buffer.from(myimg).toString("base64");
    for (let i = 1; i <= 6; i++) {
      myimg = fs.readFileSync(`./__tests__/hires${i}.jpg`);
      global[`hires${i}`] = Buffer.from(myimg).toString("base64");
    }
  });

  afterAll(done => server.close(done));

  it("should return 400 on bad path", async () => {
    const res = await request(app)
      .post("/fv/bad")
      .send({
        userId: 1,
        title: "test is cool"
      });
    expect(res.statusCode).toEqual(404);
  });

  it("should clear gallery", async () => {
    const res = await request(app)
      .get("/fv/reset")
      .send();
    expect(res.body.ok).toBeTruthy();
  });

  it("should ping server", async () => {
    const res = await request(app)
      .get("/fv/ping")
      .send();

    expect(res.body.ok).toBeTruthy();
  });

  it("should enroll user", async () => {
    const res = await request(app)
      .post("/fv/enroll")
      .type("json")
      .send({
        userId: "xxxx",
        sessionId: "xxxxxx",
        images: [hires1, hires2]
      });

    expect(res.body.ok).toBeTruthy();
  });

  it("should not enroll existing user id", async () => {
    const res = await request(app)
      .post("/fv/enroll")
      .type("json")
      .send({
        userId: "xxxx",
        sessionId: "xxxxxx",
        images: [hires4, hires5]
      });
    expect(res.body).toMatchObject({
      ok: 1,
      isEnroll: false,
      error: "user is already enrolled"
    });
  });

  it("should not enroll existing duplicate face", async () => {
    const res = await request(app)
      .post("/fv/enroll")
      .type("json")
      .send({
        userId: "yyyy",
        sessionId: "yyyyyy",
        images: [hires6, hires4]
      });
    console.log({ body: res.body, text: res.text });
    expect(res.body).toEqual({
      ok: 1,
      isDuplicate: true,
      isEnroll: false,
      isLive: true
    });
    expect(res.body.isDuplicate).toBeTruthy();
  });

  it("should not enroll failed liveness", async () => {
    const res = await request(app)
      .post("/fv/enroll")
      .type("json")
      .send({
        userId: "yyyy",
        sessionId: "yyyyyy",
        images: [img2, img2b]
      });
    expect(res.body).toEqual({
      ok: 0,
      error: "not enough valid facial images. valid: 1 required: 2"
    });
  });
});
