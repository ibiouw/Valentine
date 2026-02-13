import express from "express";
import { connectMongo, MemeModel } from "./_db.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const DEFAULT_MEMES = [
  { title: "Cuddle mode: ON 😽", src: "/date1.jpeg" },
  { title: "A heart just for you 💗", src: "/date2.png" },
  { title: "Officially your Valentine 😋", src: "/date3.jpeg" },
];

// Make Express routing robust in Vercel (sometimes req.url includes the full /api/memes path)
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/memes")) {
    req.url = req.url.replace("/api/memes", "") || "/";
  }
  next();
});

app.get(["/", ""], async (_req, res) => {
  try {
    const conn = await connectMongo();
    if (!conn) {
      return res.status(200).json(DEFAULT_MEMES);
    }

    const docs = await MemeModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
    if (!docs.length) {
      // Seed defaults if empty
      await MemeModel.insertMany(DEFAULT_MEMES.map((m) => ({ ...m })));
      const seeded = await MemeModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
      return res.status(200).json(seeded.map(({ title, src }) => ({ title, src })));
    }

    return res.status(200).json(docs.map(({ title, src }) => ({ title, src })));
  } catch (e) {
    return res.status(200).json(DEFAULT_MEMES);
  }
});

app.post(["/", ""], async (req, res) => {
  try {
    const conn = await connectMongo();
    if (!conn) {
      return res.status(400).json({
        error: "MongoDB not configured. Add MONGODB_URI in Vercel environment variables.",
      });
    }

    const { title, src } = req.body || {};
    if (!title || !src) {
      return res.status(400).json({ error: "Missing title or src" });
    }

    const created = await MemeModel.create({ title, src });
    return res.status(201).json({ title: created.title, src: created.src });
  } catch (e) {
    return res.status(500).json({ error: "Failed to create meme" });
  }
});

export default function handler(req, res) {
  return app(req, res);
}
