import express from "express";
import { KairosAPI } from "../kairosApi";
import { HumanAPI } from "../humanApi";
import { ProcessCallback, CallbackData } from "../types";

const startServer = (api: KairosAPI, human: HumanAPI) => {
  const app = express();

  app.use(express.json({ limit: "100mb", extended: true }));

  app.get("/fv/ping", (req, res) => {
    res.json({ ok: 1 });
  });
  app.get("/fv/reset", async (req, res) => {
    await api.removeGallery();
    res.json({ ok: 1 });
  });

  app.post("/fv/enroll", async (req, res) => {
    const { userId, sessionId, images, stream = false } = req.body;
    let streamStarted = false;
    const enrollStreamHandler = (userId, sessionId, data) => {
      if (streamStarted === false) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");
        res.status(data.ok === 0 ? 400 : 200);
        streamStarted = true;
      }
      res.write(JSON.stringify(data) + "\n");
      if (data.ok === 0 || data.ok === 1) res.end();
    };
    let result = {};
    const enrollHandler = (userId, sessionId, data) => {
      Object.assign(result, data);
      if (data.ok === 0 || data.ok === 1) res.json(result);
    };
    if (
      userId === undefined ||
      sessionId === undefined ||
      images === undefined ||
      images.length < human.settings.minEnrollImages
    ) {
      return res.status(400).send({ ok: 0, error: "invalid input" });
    }

    const enrolled = await human.addIfUniqueAndAlive(
      userId,
      sessionId,
      images,
      stream ? enrollStreamHandler : enrollHandler
    );
  });

  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });

  const server = app.listen(3000);
  console.log("app rundddning on port ", 3000);

  return { app, server };
};

export default startServer;
