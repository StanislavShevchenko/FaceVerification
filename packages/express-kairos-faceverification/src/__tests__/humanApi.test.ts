import { KairosAPI } from "../kairosApi";
import { HumanAPI } from "../humanApi";
import fs from "fs";
jest.setTimeout(30000);
describe("Human API", () => {
  let api, human, img1, img2, img2b, img3, spoof1, spoof2, hires1, hiresb1;
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
    myimg = fs.readFileSync("./__tests__/ahmg1.jpg");
    hires1 = Buffer.from(myimg).toString("base64");
    myimg = fs.readFileSync("./__tests__/ahmg2.jpg");
    hiresb1 = Buffer.from(myimg).toString("base64");
    api = new KairosAPI(
      { app_id: process.env.KAIROS_ID, app_key: process.env.KAIROS_KEY },
      "test",
      false
    );
    human = new HumanAPI(
      api,
      {
        livenessThresh: 0.8,
        uniqueThresh: 0.7,
        minEnrollImages: 1,
        maxHeadAngle: 10,
        minPhashSimilarity: 0.95
      },
      true
    );
    await api.removeGallery();
  });

  it("should filter to similar images", async () => {
    const similars = await human.filterToSimilarImages([
      img3,
      img1,
      img2b,
      img2,
      spoof1,
      spoof2
    ]);
    expect(similars.length).toEqual(2);
  });

  it("should reject identical images", async () => {
    const similars = await human.filterToSimilarImages([
      img3,
      img3,
      img2,
      img3
    ]);
    expect(similars.length).toEqual(1);
  });

  it("should add user if unique and alive", async () => {
    const res = await human.addIfUniqueAndAlive(
      "userId",
      "sessionId",
      [hires1],
      (...data) => {
        console.log("add spy here", { data });
      }
    );
    expect(res).toMatchObject({ ok: 1, isEnroll: true });
  });

  it("should NOT add user if NOT unique", async () => {
    const res = await human.addIfUniqueAndAlive(
      "userId",
      "sessionId",
      [hiresb1],
      ({ ...data }) => {}
    );
    console.log({ res });
    expect(res).toMatchObject({
      ok: 1,
      isEnroll: false,
      error: "user is already enrolled"
    });
  });

  it("should update user", async () => {
    const res = await human.verifyAndUpdate(
      "userId",
      "sessionId",
      [hiresb1],
      (...data) => {}
    );
    expect(res).toMatchObject({ ok: 1, isVerified: true, isUpdated: true });
  });
});
