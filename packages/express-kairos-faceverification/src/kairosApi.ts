import fetch from "node-fetch";

const Timeout = timeout => {
  return new Promise((res, rej) => {
    setTimeout(rej, timeout, new Error("Request Timeout"));
  });
};

export default class KairosAPI {
  constructor(auth, gallery, debug = false, baseUrl) {
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
      console.debug("kairosApi request:", { fullUrl, jsonBody, headers });
    return Promise.race([
      Timeout(timeout),
      fetch(fullUrl, { method, body: JSON.stringify(jsonBody), headers })
    ])
      .then(async res => {
        this.debug && console.debug("Response:", url, { res });
        return res.json();
      })
      .catch(e => {
        console.error("Error:", url, e, { jsonBody });
        throw e;
      });
  }

  enroll(userId, images: Array<string>) {
    return Promise.all(
      images.map(img =>
        this.baseQuery("/enroll", {
          image: images[0],
          subject_id: userId,
          gallery_name: this.gallery
        })
      )
    );
  }

  search(userId, image: string) {
    return this.baseQuery("/recognize", {
      image,
      gallery_name: this.gallery,
      selector: "liveness"
    });
  }

  verify(userId, image: string) {
    return this.baseQuery("/verify", {
      image,
      subject_id: userId,
      gallery_name: this.gallery,
      selector: "liveness"
    });
  }

  delete(userId) {
    return this.baseQuery("/gallery/remove_subject", {
      subject_id: userId,
      gallery_name: this.gallery
    });
  }

  removeGallery() {
    return this.baseQuery("/gallery/remove", {
      gallery_name: this.gallery
    });
  }
}
