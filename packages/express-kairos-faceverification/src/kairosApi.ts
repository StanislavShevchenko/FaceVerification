import fetch from "node-fetch";
import _get from "lodash/get";
import _omit from "lodash/omit";

import _pick from "lodash/pick";
import { VerifyResult, SearchResult, Face } from "./types";

const Timeout = timeout => {
  return new Promise((res, rej) => {
    setTimeout(rej, timeout, new Error("Request Timeout"));
  });
};

export class KairosAPI {
  debug: boolean;
  gallery: string;
  baseUrl: string;
  baseHeaders: object;
  constructor(auth, gallery, debug: boolean = false, baseUrl?: string) {
    this.debug = debug;
    this.baseUrl = baseUrl || "https://api.kairos.com";
    this.gallery = gallery;
    this.baseHeaders = {
      "Content-Type": "application/json",
      app_id: auth.app_id,
      app_key: auth.app_key
    };
  }

  baseQuery(
    url,
    jsonBody,
    headers = this.baseHeaders,
    method = "post",
    timeout = 15000
  ) {
    const fullUrl = `${this.baseUrl}${url}`;

    this.debug &&
      console.debug("kairosApi request:", {
        fullUrl,
        jsonBody: _omit(jsonBody, ["image", "images"]),
        headers
      });
    return Promise.race([
      Timeout(timeout),
      fetch(fullUrl, { method, body: JSON.stringify(jsonBody), headers })
    ])
      .then(async res => {
        this.debug && console.debug("Response:", url, { res });
        return res.json();
      })
      .catch(e => {
        delete jsonBody.image;
        console.error("Error:", url, e, { jsonBody });
        throw e;
      });
  }

  async enroll(userId, image: string): Promise<Face> {
    const res = await this.baseQuery("/enroll", {
      image: image,
      subject_id: userId,
      gallery_name: this.gallery,
      selector: "liveness",
      minHeadSacle: ".5",
      multiple_faces: false
    });
    this.debug && console.log("enroll result:", { res });
    const error = _get(res, "Errors[0]");
    if (error) return { error: error.Message };
    const { transaction, attributes } = _get(res, "images[0]", {});
    return {
      ...transaction,
      faceId: transaction.face_id,
      subjectId: transaction.subject_id,
      gender: {
        f: attributes.gender.femaleConfidence,
        m: attributes.gender.maleConfidence
      },
      liveness: attributes.liveness,
      glasses: attributes.glasses,
      age: attributes.age,
      race: _pick(attributes, ["asian", "black", "white", "hispanic", "other"])
    };
  }

  async search(
    userId,
    image: string,
    threshold: number,
    max_num_results: number = 1
  ): Promise<SearchResult> {
    const res = await this.baseQuery("/recognize", {
      image,
      gallery_name: this.gallery,
      selector: "liveness",
      min_head_scale: ".5",
      max_num_results,
      threshold
    });
    this.debug && console.log("search result:", { res });
    const error = _get(res, "Errors[0]");
    if (error !== undefined) throw new Error(error.Message);
    this.debug && console.log("search images result:", { images: res.images });
    const transaction = _get(res, "images[0].transaction", {});
    const liveness = transaction.liveness;
    const candidates = _get(res, "images[0].candidates", []).map(cand => ({
      subjectId: cand.subject_id,
      score: cand.confidence
    }));
    return {
      quality: transaction.quality,
      liveness,
      candidates
    };
  }

  async verify2(
    userId,
    image: string,
    threshold: number
  ): Promise<VerifyResult> {
    const res = await this.search(userId, image, threshold, 1);
    this.debug && console.log("verify result:", res);
    const candidate = _get(res, "candidates[0]", {});
    return {
      liveness: res.liveness,
      quality: res.quality,
      score: candidate.score,
      face: candidate
    };
  }

  async verify(userId, image: string): Promise<VerifyResult> {
    const res = await this.baseQuery("/verify", {
      image,
      subject_id: userId,
      gallery_name: this.gallery,
      selector: "liveness"
    });
    this.debug && console.log("verify result:", { res });
    const error = _get(res, "Errors[0]");
    if (error !== undefined) throw new Error(error.Message);
    const transaction = _get(res, "images[0].transaction");
    return {
      ...transaction,
      score: transaction.confidence,
      faceId: transaction.face_id,
      subjectId: transaction.subject_id
    };
  }

  async detect(image: string): Promise<Array<Face>> {
    const res = await this.baseQuery("/detect", {
      image,
      selector: "liveness",
      minHeadSacle: 0.5
    });
    this.debug && console.log("identify result:", { res });
    const error = _get(res, "Errors[0]");
    if (error !== undefined) throw new Error(error.Message);
    const faces = _get(res, "images[0].faces", []);

    return faces.map(face => ({
      ...face,
      faceId: face.face_id,
      liveness: face.attributes.liveness,
      gender: {
        f: face.attributes.gender.femaleConfidence,
        m: face.attributes.gender.maleConfidence
      },
      glasses: face.attributes.glasses,
      age: face.attributes.age,
      race: _pick(face.attributes, [
        "asian",
        "black",
        "white",
        "hispanic",
        "other"
      ])
    }));
  }

  async delete(userId): Promise<boolean> {
    const res = await this.baseQuery("/gallery/remove_subject", {
      subject_id: userId,
      gallery_name: this.gallery
    });
    const error = _get(res, "Errors[0]");
    if (error !== undefined) throw new Error(error.Message);
    return true;
  }

  removeGallery() {
    return this.baseQuery("/gallery/remove", {
      gallery_name: this.gallery
    });
  }
}
