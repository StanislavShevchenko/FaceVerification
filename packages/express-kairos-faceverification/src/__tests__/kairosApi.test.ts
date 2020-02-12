import { KairosAPI } from "../kairosApi";
import fs from "fs";
console.log(process.cwd());
jest.setTimeout(30000);
describe("Kairois API", () => {
  let api: KairosAPI,
    img1,
    img2,
    img2b,
    img3,
    img4,
    spoof1,
    spoof2,
    img5,
    hires1;
  beforeAll(async () => {
    let myimg = fs.readFileSync("./__tests__/myimg.jpg");
    img1 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg2.jpg");
    img2 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg2b.jpg");
    img2b = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg3.jpg");
    img3 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/spoof1.jpg");
    spoof1 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/spoof2.jpg");
    spoof2 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg4.jpg");
    img4 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/myimg5.jpg");
    img5 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/hires1.jpg");
    hires1 = Buffer.from(myimg).toString("base64");
    api = new KairosAPI(
      { app_id: process.env.KAIROS_ID, app_key: process.env.KAIROS_KEY },
      "test",
      false
    );
    await api.removeGallery();
  });

  it("enrolls base64 image", async () => {
    const res = await api.enroll("x", img2b);
    expect(res).toMatchObject({
      faceId: expect.any(String),
      subjectId: expect.any(String),
      quality: expect.any(Number),
      eyeDistance: expect.any(Number),
      pitch: expect.any(Number),
      roll: expect.any(Number),
      yaw: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
      topLeftX: expect.any(Number),
      topLeftY: expect.any(Number),
      gender: { f: expect.any(Number), m: expect.any(Number) },
      race: {
        other: expect.any(Number),
        white: expect.any(Number),
        asian: expect.any(Number),
        black: expect.any(Number),
        hispanic: expect.any(Number)
      },
      glasses: expect.any(String),
      liveness: expect.any(Number),
      age: expect.any(Number)
    });
  });

  it("recognizes base64", async () => {
    const res = await api.search("x", img1);
    expect(res.candidates.length).toEqual(1);
    expect(res.candidates[0].score).toBeGreaterThan(0.6);
    expect(res.liveness).toBeGreaterThan(0);
  });

  it("doesnt recognize spoof", async () => {
    const res = await api.search("x", spoof1);
    expect(res.candidates.length).toEqual(0);
  });

  it("verifies user", async () => {
    const res = await api.verify("x", img2b);
    expect(res.score).toBeGreaterThan(0.8);
    expect(res.liveness).toBeGreaterThan(0);
  });
  it("verifies user using verify2", async () => {
    const res = await api.verify2("x", img2b, 0.6);
    expect(res.score).toBeGreaterThan(0.8);
    expect(res.liveness).toBeGreaterThan(0);
  });

  it("verifies user above threshold", async () => {
    const results = await Promise.all([
      api.verify2("x", hires1, 0.6),
      api.verify2("x", img1, 0.6),
      api.verify2("x", img2, 0.6),
      api.verify2("x", img3, 0.6),
      api.verify2("x", img4, 0.6),
      api.verify2("x", img5, 0.6),
      api.verify2("x", spoof2, 0.5)
    ]);
    results.forEach(r => {
      expect(r.score).toBeGreaterThan(0.5);
    });
  });

  it("deletes user", async () => {
    const res = await api.delete("x");
    expect(res).toBeTruthy();
  });
});
