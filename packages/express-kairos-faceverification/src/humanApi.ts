import KairosAPI from "./kairosApi";
import _get from "lodash/get";
export default class HumanAPI {
  constructor(
    kairos: KairosAPI,
    settings: { livenessThresh: number; uniqueThresh: number },
    debug = false
  ) {
    this.debug = debug;
    this.kairos = kairos;
    this.settings = settings;
  }

  /**
   * try to prevent spoofing
   */
  async filterValidImages(images:Array<string>) {
    //1. require multiple phash similar images, but not exact similars - this will try to enforce user have to send
    //images that were taking in short time or try to manipulate them to look as such (hopefully liveness will catch manipulation)
    //2. require images to be same size/quality
    //3. verify images roll/pitch/yaw
    //4. verify face size
    //5. verify face expression
    //6. verify livenss

  }
  async addIfUniqueAndAlive(
    userId,
    sessionId,
    images: Array<string>,
    cb: () => void
  ) {
    cb(userId, sessionId, {});
    try {
      const res = await this.kairos.search(userId, images[0]);
      this.debug && console.log(res);
      const error = _get(res, "Errors[0]");
      if (error !== undefined) throw new Error(error.Message);
      this.debug && console.log(res.images);
      const liveness = _get(res, "images[0].transaction.liveness");
      if (liveness === undefined) {
        cb(userId, sessionId, {
          ok: 0,
          error: "liveness undefined",
          result: res[0]
        });
        return;
      }
      const candidates = _get(res, "images[0].candidates", []);
      const duplicate = candidates.find(
        candidate =>
          candidate.subject_id !== userId &&
          candidate.confidence > this.settings.uniqueThresh
      );
      const isDuplicate = duplicate !== undefined;
      const isLive = liveness > this.settings.livenessThresh;
      cb(userId, sessionId, { isDuplicate, isLive });
      if (isDuplicate || isLive === false) {
        cb(userId, sessionId, { ok: 1, isEnroll: false });
        return false;
      }
      this.enroll(userId, images);
      cb(userId, sessionId, { ok: 1, isEnroll: true });
      return true;
    } catch (e) {
      console.log({ e });
      cb(userId, sessionId, { ok: 0, error: e.message });
    }
  }

  async enroll(userId, images: Array<string>) {
    const enrollRes = await this.kairos.enroll(userId, images);
    const enrollError = _get(enrollRes, "[0].Errors");
    if (enrollError) throw new Error(enrollError.Messsage);
    return enrollRes;
  }

  async verifyAndUpdate(userId, images: Array<string>, cb: () => void) {
    try {
      const res = await this.kairos.verify(userId, images[0]);
      const error = _get(res, "Errors");
      if (error) throw new Error(error.Messsage);
      const liveness = _get(res, "images[0].transaction.liveness");
      const confidence = _get(res, "images[0].transaction.confidence");
      if (liveness === undefined) {
        cb(userId, sessionId, {
          ok: 0,
          error: "liveness undefined"
        });
        return;
      }
      const isLive = liveness > this.settings.livenessThresh;
      const isVerified = confidence > this.settings.similarityThresh;
      cb(userId, sessionId, { isLive, isVerified });
      if (isLive === false || isVerified === false) {
        cb(userId, sessionId, { ok: 1, isUpdated: false });
        return;
      }
      const enrollRes = this.enroll(userId, images);
      cb(userId, sessionId, { ok: 1, isUpdated: true });
    } catch (e) {
      cb(userId, sessionId, { ok: 0, error: e.message });
    }
  }
}
