import API from "../kairosApi";
import fs from "fs";
console.log(process.cwd());
jest.setTimeout(30000);
describe("Kairois API", () => {
  let api, img1, img2, img2b, img3, spoof1, spoof2;
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
      "test"
    );
    await api.removeGallery();
  });

  it("enrolls base64 image", async () => {
    const res = await api.enroll("x", [img2, img3]);
    expect(res.length).toEqual(2);
    const res1 = res[0];
    expect(res.Errors).toBeFalsy();
    expect(res1.images.length).toEqual(1);
  });

  it("recognizes base64", async () => {
    const res = await api.search("x", img1);
    console.log(res.images[0].candidates[0]);
    expect(res.Errors).toBeFalsy();
    expect(res.images.length).toEqual(1);
    expect(res.images[0].candidates[0].confidence).toBeGreaterThan(0.6);
    expect(res.images[0].transaction.liveness).toBeGreaterThan(0);
  });

  it("doesnt recognize spoof", async () => {
    const res = await api.search("x", spoof1);
    expect(res.Errors).toBeFalsy();
    expect(res.images.length).toEqual(1);
    expect(res.images[0].transaction.confidence).toBeFalsy();
  });

  it("verifies user", async () => {
    const res = await api.verify("x", img2b);
    console.log(res.images[0].transaction);
    expect(res.Errors).toBeFalsy();
    expect(res.images.length).toEqual(1);
    expect(res.images[0].transaction.confidence).toBeGreaterThan(0.8);
    expect(res.images[0].transaction.liveness).toBeDefined();
  });

  it("deletes user", async () => {
    const res = await api.delete("x");
    expect(res.Errors).toBeFalsy();
  });
});
