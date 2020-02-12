import { KairosAPI } from "./kairosApi";
import _get from "lodash/get";
import sharp from "sharp";
import pHash from "sharp-phash";
import dist from "sharp-phash/distance";
import imageHash from "imghash";
import { ProcessCallback, Face } from "./types";
//TODO:
//1. remove api keys
//3. do we need phash and require atleast 2 incoming images?
//4. add face size check according to kairos per image size
export class HumanAPI {
  kairos: KairosAPI;
  debug: boolean;
  settings: {
    livenessThresh: number;
    uniqueThresh: number;
    minEnrollImages: number;
    minPhashSimilarity: number;
    maxHeadAngle: number;
    minEyeDistance: Array<[number, number]>;
  };

  constructor(
    kairos: KairosAPI,
    settings: {
      livenessThresh?: number;
      uniqueThresh?: number;
      minEnrollImages?: number;
      minPhashSimilarity?: number;
      maxHeadAngle?: number;
      minEyeDistance?: Array<[number, number]>;
    },
    debug: boolean = false
  ) {
    this.debug = debug;
    this.kairos = kairos;
    this.settings = Object.assign(
      {
        livenessThresh: 0.95,
        uniqueThresh: 0.8,
        minEnrollImages: 2,
        minPhashSimilarity: 0.95,
        maxHeadAngle: 8,
        minEyeDistance: [[480, 90]]
      },
      settings
    );
  }

  async filterToSimilarImages(
    images: Array<string>,
    thresh = this.settings.minPhashSimilarity
  ) {
    const [leader, ...rest] = await Promise.all(
      images.map(async img => {
        const phash = await pHash(Buffer.from(img, "base64"));
        // const phash = await imageHash.hash(
        //   Buffer.from(img, "base64"),
        //   8,
        //   "binary"
        // );
        return { img, phash };
      })
    );
    const valid = rest
      .filter(({ img, phash }) => {
        const score = 1 - dist(phash, leader.phash) / phash.length;

        const res = score >= this.settings.minPhashSimilarity && score < 1;
        this.debug &&
          res === false &&
          console.log("filterToSimilarImages failed:", { score });
        return res;
      })
      .map(img => img.img);
    return [leader.img, ...valid];
  }

  /**
   * try to prevent spoofing
   * 1. verify images roll/pitch/yaw
   * 2. verify face size
   * 3. verify livenss
   * 4. TODO: verify image not used in the past ( in case of re-verification step)
   */
  async filterValidImages(images: Array<string>) {
    let i = 1;
    const analyzed = await Promise.all(
      images.map(async img => {
        const analyzed = await this.kairos.detect(img).catch(error => error);
        this.debug &&
          console.log("filterValidImages analyzed result:", {
            analyzed
          });
        return { img, analyzed };
      })
    );
    const errors = [];
    const valids = analyzed.filter(({ img, analyzed }) => {
      if (analyzed.error) {
        errors.push(analyzed.error);
        return false;
      }
      if (analyzed.length > 1 || analyzed.length === 0) {
        errors.push("image should contain exactly one face");
        return false;
      }
      const face: Face = analyzed[0];
      this.debug &&
        console.log("filterValidImages checking face", {
          face,
          attrs: face.attributes
        });
      if (face.liveness < this.settings.livenessThresh) {
        errors.push("liveness failed");
        return false;
      }
      if (
        Math.abs(face.roll) > this.settings.maxHeadAngle ||
        Math.abs(face.yaw) > this.settings.maxHeadAngle ||
        Math.abs(face.pitch) > this.settings.maxHeadAngle
      ) {
        errors.push("head not straight");
        return false;
      }
      if (face.eyeDistance < this.settings.minEyeDistance[0][1]) {
        errors.push("face not close enough");
        return false;
      }
      if (face.confidence < 0.5 || face.quality < 0.5) {
        errors.push("bad image quality");
        return false;
      }
      return true;
    });
    this.debug &&
      console.log("filterValidImages errors:", {
        errors
      });
    return valids.map(_ => _.img);
  }

  async verifyIncomingImages(userId, images: Array<string>) {
    //1. require multiple phash similar images, but not exact similars - this will try to enforce user have to send
    //images that were taking in short time or try to manipulate them to look as such (hopefully liveness will catch manipulation)
    const similar = await this.filterToSimilarImages(images);
    if (similar.length < this.settings.minEnrollImages)
      throw Error(
        `failed images similarity test. similars: ${similar.length} required: ${this.settings.minEnrollImages}`
      );
    const validImages = await this.filterValidImages(similar);
    if (validImages.length < this.settings.minEnrollImages)
      throw Error(
        `not enough valid facial images. valid: ${validImages.length} required: ${this.settings.minEnrollImages}`
      );
    return validImages;
  }

  async addIfUniqueAndAlive(
    userId,
    sessionId,
    images: Array<string>,
    cb: ProcessCallback
  ) {
    try {
      const validImages = await this.verifyIncomingImages(userId, images);
      const searchRes = await this.kairos
        .search(userId, validImages[0], this.settings.uniqueThresh)
        .catch(e => {
          if (e.message === "gallery name not found") return { candidates: [] };
          throw e;
        });
      this.debug &&
        console.log("addIfUniqueAndAlive", {
          searchRes,
          candidates: searchRes.candidates
        });
      // const liveness = res.liveness;
      // if (liveness === undefined) {
      //   cb(userId, sessionId, {
      //     ok: 0,
      //     error: "liveness undefined",
      //     result: res
      //   });
      //   return;
      // }
      const candidates = searchRes.candidates || [];
      const exists = searchRes.candidates.find(
        candidate => candidate.subjectId === userId
      );
      if (exists !== undefined) {
        const failed = {
          ok: 1,
          isEnroll: false,
          error: "user is already enrolled"
        };
        cb(userId, sessionId, failed);
        return failed;
      }
      const duplicate = searchRes.candidates.find(
        candidate => candidate.score > this.settings.uniqueThresh
      );
      const isDuplicate = duplicate !== undefined;
      const isLive = true;
      if (isDuplicate || isLive === false) {
        const failed = { ok: 1, isDuplicate, isLive, isEnroll: false };
        cb(userId, sessionId, failed);
        return failed;
      }
      cb(userId, sessionId, { isDuplicate, isLive });
      const enrollRes: Face = await this.kairos.enroll(userId, validImages[0]);
      this.debug && console.log({ enrollRes });
      const hasSuccess =
        enrollRes.error === undefined &&
        enrollRes.liveness >= this.settings.livenessThresh;
      const done = {
        ok: 1,
        isEnroll: hasSuccess,
        result: enrollRes
      };
      cb(userId, sessionId, done);
      return done;
    } catch (e) {
      this.debug && console.log({ e });
      const error = { ok: 0, error: e.message };
      cb(userId, sessionId, error);
      return error;
    }
  }

  async verifyAndUpdate(
    userId,
    sessionId,
    images: Array<string>,
    cb: ProcessCallback
  ) {
    try {
      const validImages = await this.verifyIncomingImages(userId, images);
      const res = await this.kairos.verify(userId, validImages[0]);
      this.debug && console.log("verifyAndUpdate:", { verifyRes: res });

      const liveness = res.liveness;
      const confidence = res.score;
      if (liveness === undefined) {
        const failed = {
          ok: 1,
          error: "liveness undefined"
        };
        cb(userId, sessionId, failed);
        return failed;
      }
      const isLive = liveness > this.settings.livenessThresh;
      const isVerified = confidence > this.settings.uniqueThresh;
      if (isLive === false || isVerified === false) {
        const failed = { ok: 1, isLive, isUpdated: false, isVerified };
        cb(userId, sessionId, failed);
        return failed;
      }
      cb(userId, sessionId, { isLive, isVerified });
      const enrollRes = await this.kairos.enroll(userId, validImages[0]);
      this.debug && console.log("verifyAndUpdate:", { enrollRes });
      const hasSuccess = enrollRes.error === undefined;
      const done = {
        ok: 1,
        isVerified: true,
        isUpdated: hasSuccess,
        result: enrollRes
      };
      cb(userId, sessionId, done);
      return done;
    } catch (e) {
      const error = { ok: 0, error: e.message };
      cb(userId, sessionId, error);
      return error;
    }
  }
}
