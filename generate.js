// api/generate.js — Vercel Serverless Function
// Proxies Anthropic API call server-side (hides API key from browser)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in Vercel environment variables" });
  }

  try {
    const { genre, chapterNumber, previousChapters = [] } = req.body;

    if (!genre || !chapterNumber) {
      return res.status(400).json({ error: "genre dan chapterNumber wajib diisi" });
    }

    const genreNames = {
      action: "Aksi", adventure: "Petualangan", fantasy: "Fantasi",
      romance: "Romantis", comedy: "Komedi", horror: "Horor",
    };
    const genreName = genreNames[genre] ?? genre;
    const panelCount = 3 + (chapterNumber % 3);
    const prevCtx = previousChapters.length
      ? `\nChapter sebelumnya: ${previousChapters.map(c => `Ch${c.number} "${c.title}"`).join(", ")}`
      : "";

    const prompt = `Kamu adalah penulis komik profesional. Buat chapter komik genre ${genreName} (${genre}) dalam Bahasa Indonesia.
Chapter nomor: ${chapterNumber}${prevCtx}

Balas HANYA dengan JSON valid (tanpa teks lain, tanpa markdown fence):
{
  "title": "Judul chapter max 5 kata",
  "panels": [
    {
      "theme": "Scene description in English for image generation, max 8 words",
      "caption": "Deskripsi panel dalam Bahasa Indonesia, max 12 kata",
      "dialogue": "Dialog karakter dalam tanda kutip, max 15 kata"
    }
  ],
  "continuationNote": "${chapterNumber > 1 ? "Satu kalimat transisi dari chapter sebelumnya" : ""}"
}

Buat tepat ${panelCount} panel. Tone: ${
      genre === "horror" ? "menegangkan dan misterius" :
      genre === "comedy" ? "lucu dan ringan" :
      genre === "romance" ? "romantis dan mengharukan" :
      "seru dan mengasyikkan"
    }. Pastikan ada alur cerita yang jelas.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // haiku = cheaper & faster for this task
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "Gagal memanggil AI", details: errText });
    }

    const data = await anthropicRes.json();
    const rawText = data.content?.map(b => b.text ?? "").join("").trim() ?? "";
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
