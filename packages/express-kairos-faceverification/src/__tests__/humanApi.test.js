import API from "../kairosApi";
import HumanAPI from "../humanApi";
import fs from "fs";
jest.setTimeout(30000);
describe("Human API", () => {
  let api, human, img1, img2, img2b, img3, spoof1, spoof2;
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
    api = new API(
      { app_id: "4cff812e", app_key: "f3300f9543ec1ca1e6f824a4d51227ee" },
      "test",
      false
    );
    human = new HumanAPI(
      api,
      { livenessThresh: 0.98, uniqueThresh: 0.8 },
      true
    );
    const res = await api.enroll("x", [img3]);
  });

  it("should add user if unique and alive", async () => {
    const res = await human.addIfUniqueAndAlive(
      "userId",
      "sessionId",
      [img2b],
      (...data) => {
        console.log("callback", { data });
      }
    );
    expect(res).toBeTruthy();
  });

  //   it("should NOT add user if NOT unique", async () => {
  //     const res = await human.addIfUniqueAndAlive("userId","sessionId", [img2b], cb(...data) => {})
  //     expect(res).toBeFalsy()
  //   });

  //   it("recognizes base64", async () => {
  //     const res = await api.search("x", img1);
  //     console.log(res.images[0].candidates[0]);
  //     expect(res.Errors).toBeFalsy();
  //     expect(res.images.length).toEqual(1);
  //     expect(res.images[0].candidates[0].confidence).toBeGreaterThan(0.6);
  //     expect(res.images[0].transaction.liveness).toBeGreaterThan(0);
  //   });
});
