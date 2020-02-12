import fs from "fs";
import phash from "sharp-phash";
import dist from "sharp-phash/distance";
import imageHash from "imghash";

const score = (h1, h2) => {
  return 1 - dist(h1, h2) / h1.length;
};

describe("phash", () => {
  let api, human, img1, img2, img2b, img3, spoof1, spoof2;
  beforeAll(async () => {
    let myimg = fs.readFileSync("./__tests__/myimg.jpg");
    img1 = myimg;
    myimg = fs.readFileSync("./__tests__/myimg2.jpg");
    img2 = myimg;
    myimg = fs.readFileSync("./__tests__/myimg2b.jpg");
    img2b = myimg;
    myimg = fs.readFileSync("./__tests__/myimg3.jpg");
    img3 = myimg;
    myimg = fs.readFileSync("./__tests__/spoof1.jpg");
    spoof1 = myimg;
    myimg = fs.readFileSync("./__tests__/spoof2.jpg");
    spoof2 = myimg;
  });

  it("should compare faces with phash", async () => {
    const phashes = await Promise.all([
      phash(img1),
      phash(img2),
      phash(img2b),
      phash(img3)
    ]);
    const spoofPhashes = await Promise.all([phash(spoof1), phash(spoof2)]);
    for (let i = 0; i < phashes.length - 1; i++)
      for (let j = i + 1; j < phashes.length; j++) {
        console.log(`phash ${i}/${j}`, score(phashes[i], phashes[j]));
      }
    for (let i = 0; i < spoofPhashes.length - 1; i++) {
      for (let j = i + 1; j < spoofPhashes.length; j++) {
        console.log(
          `spoof phash ${i}/${j}`,
          score(spoofPhashes[i], spoofPhashes[j])
        );
      }
    }
    for (let i = 0; i < phashes.length; i++) {
      for (let j = 0; j < spoofPhashes.length; j++) {
        console.log(
          `spoof vs reg phash ${i}/${j}`,
          score(phashes[i], spoofPhashes[j])
        );
      }
    }
  });

  it("should compare faces with image-hash", async () => {
    const phashes = await Promise.all([
      imageHash.hash("./__tests__/myimg.jpg", 8, "binary"),
      imageHash.hash("./__tests__/myimg2.jpg", 8, "binary"),
      imageHash.hash("./__tests__/myimg2b.jpg", 8, "binary"),
      imageHash.hash("./__tests__/myimg3.jpg", 8, "binary")
    ]);
    console.log({ phashes });
    const spoofPhashes = await Promise.all([
      imageHash.hash("./__tests__/spoof1.jpg", 8, "binary"),
      imageHash.hash("./__tests__/spoof2.jpg", 8, "binary")
    ]);

    for (let i = 0; i < phashes.length - 1; i++)
      for (let j = i + 1; j < phashes.length; j++) {
        console.log(`blockhash ${i}/${j}`, score(phashes[i], phashes[j]));
      }
    for (let i = 0; i < spoofPhashes.length - 1; i++) {
      for (let j = i + 1; j < spoofPhashes.length; j++) {
        console.log(
          `spoof blockhash ${i}/${j}`,
          score(spoofPhashes[i], spoofPhashes[j])
        );
      }
    }
    for (let i = 0; i < phashes.length; i++) {
      for (let j = 0; j < spoofPhashes.length; j++) {
        console.log(
          `spoof vs reg blockhash ${i}/${j}`,
          score(phashes[i], spoofPhashes[j])
        );
      }
    }
  });
});
