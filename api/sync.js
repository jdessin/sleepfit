export default async function handler(req, res) {
  if (!process.env.SYNC_PASSCODE || req.headers["x-passcode"] !== process.env.SYNC_PASSCODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: "Storage not configured — add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel env vars" });
  }

  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${url}/get/sleepfit_data`, { headers: auth });
      const { result } = await r.json();
      return res.json(result ? JSON.parse(result) : {});
    }

    if (req.method === "POST") {
      await fetch(`${url}/set/sleepfit_data`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify(req.body),
      });
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
