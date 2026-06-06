import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (!process.env.SYNC_PASSCODE || req.headers["x-passcode"] !== process.env.SYNC_PASSCODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    if (req.method === "GET") {
      const data = await kv.get("sleepfit_data");
      return res.json(data ?? {});
    }
    if (req.method === "POST") {
      await kv.set("sleepfit_data", req.body);
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
