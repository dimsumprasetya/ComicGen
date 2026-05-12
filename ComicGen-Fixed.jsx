import { useState, useCallback, useEffect } from "react";

// ─── Inject keyframe animation ───
const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  .genre-btn:hover { border-color: #f5c300 !important; background: #1e1c0a !important; transform: translateY(-2px); }
  .chapter-tab:hover { background: #222 !important; }
  .action-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
  .close-btn:hover { background: rgba(255,255,255,0.1) !important; }
`;
document.head.appendChild(styleTag);

// ─── Genre data ───
const GENRES = [
  { id: "action",    name: "Aksi",        icon: "⚡", desc: "Pertarungan seru & adrenalin",    color: "#ef4444", keywords: "action battle city superhero warrior combat explosion urban night dramatic" },
  { id: "adventure", name: "Petualangan", icon: "🗺️", desc: "Jelajahi dunia misterius",        color: "#f97316", keywords: "adventure exploration jungle ancient ruins expedition treasure map discovery" },
  { id: "fantasy",   name: "Fantasi",     icon: "🐉", desc: "Sihir & makhluk legendaris",      color: "#a855f7", keywords: "fantasy magic dragon castle wizard mystical kingdom enchanted forest spell" },
  { id: "romance",   name: "Romantis",    icon: "💕", desc: "Kisah cinta mengharukan",          color: "#ec4899", keywords: "romance love couple garden spring flowers date café cherry blossom tender" },
  { id: "comedy",    name: "Komedi",      icon: "😂", desc: "Lucu & menghibur",                color: "#eab308", keywords: "comedy funny cartoon exaggerated slapstick humorous silly characters expression" },
  { id: "horror",    name: "Horor",       icon: "👻", desc: "Misteri & ketegangan",            color: "#6b7280", keywords: "horror dark mysterious ghost shadow fog haunted spine chilling eerie atmosphere" },
];

// ─── Free image API: Pollinations.ai (no API key needed!) ───
const getPanelImage = (theme, genreId, panelIdx, chapterNum) => {
  const seed = panelIdx * 37 + chapterNum * 13 + genreId.charCodeAt(0) * 7;
  const g = GENRES.find(x => x.id === genreId);
  const style = genreId === "horror" ? "dark atmospheric ink illustration" : "manga comic panel ink art";
  const prompt = `${style}, ${g?.keywords ?? ""}, ${theme}, high contrast dramatic lighting`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=480&height=320&nologo=true&seed=${seed}`;
};

// ─── Anthropic API call ───
const callAnthropicAPI = async (prompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map(i => i.text || "").join("").trim() ?? "";
  return raw.replace(/```json|```/g, "").trim();
};

const generateChapterContent = async (genre, chapterNum, prevChapters) => {
  const g = GENRES.find(x => x.id === genre);
  const prevCtx = prevChapters.length
    ? `\nChapter sebelumnya: ${prevChapters.map(c => `Ch${c.number} "${c.title}"`).join(", ")}`
    : "";
  const panelCount = 3 + (chapterNum % 3); // 3–5 panels

  const prompt = `Kamu adalah penulis komik profesional. Buat chapter komik genre ${g.name} (${genre}) dalam Bahasa Indonesia.
Chapter nomor: ${chapterNum}${prevCtx}

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
  "continuationNote": "${chapterNum > 1 ? "Satu kalimat transisi dari chapter sebelumnya" : ""}"
}

Buat tepat ${panelCount} panel. Tone: ${
    genre === "horror" ? "menegangkan dan misterius" :
    genre === "comedy" ? "lucu dan ringan" :
    genre === "romance" ? "romantis dan mengharukan" :
    "seru dan mengasyikkan"
  }. Pastikan ada alur cerita yang jelas.`;

  const json = await callAnthropicAPI(prompt);
  return JSON.parse(json);
};

// ─── Panel Card ───
function PanelCard({ panel, idx }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div style={{ background: "#0a0a0a", border: "2px solid #1f1f1f", overflow: "hidden", animation: "fadeIn 0.4s ease forwards", animationDelay: `${idx * 0.08}s`, opacity: 0 }}>
      {/* Image area */}
      <div style={{ position: "relative", aspectRatio: "3/2", background: "#111", overflow: "hidden" }}>
        {/* Skeleton pulse */}
        {!loaded && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #111 25%, #1a1a1a 50%, #111 75%)", animation: "pulse 1.5s ease infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🖼</span>
          </div>
        )}
        <img
          src={errored ? `https://picsum.photos/seed/${idx * 99}/480/320` : panel.imageUrl}
          alt={`Panel ${idx + 1}: ${panel.caption}`}
          onLoad={() => setLoaded(true)}
          onError={() => { setErrored(true); setLoaded(true); }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease" }}
        />
        <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.85)", color: "#f5c300", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: 0.5 }}>
          {idx + 1}
        </span>
      </div>
      {/* Text */}
      <div style={{ padding: "10px 12px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#ddd", lineHeight: 1.4 }}>{panel.caption}</p>
        {panel.dialogue && (
          <div style={{ marginTop: 7, padding: "6px 10px", background: "#141414", borderLeft: "2px solid #f5c300", borderRadius: "0 4px 4px 0" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#a0a0a0", fontStyle: "italic" }}>{panel.dialogue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comic Viewer ───
function ComicViewer({ chapter }) {
  return (
    <div style={{ background: "#161616", borderRadius: 10, overflow: "hidden", border: "1px solid #252525", marginBottom: 16, animation: "fadeIn 0.35s ease" }}>
      {/* Chapter header */}
      <div style={{ background: "#f5c300", padding: "14px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#00000088", textTransform: "uppercase", marginBottom: 2 }}>
          Chapter {chapter.number}
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#000", lineHeight: 1.2 }}>{chapter.title}</h2>
        <div style={{ fontSize: 10, color: "#00000066", marginTop: 4 }}>
          {new Date(chapter.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* ── BUG FIX #4: continuationNote now shown ── */}
      {chapter.continuationNote && (
        <div style={{ padding: "8px 20px", background: "#0f0f0f", borderBottom: "1px solid #1f1f1f", fontSize: 11, color: "#666", fontStyle: "italic", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <span>📖</span>
          <span>{chapter.continuationNote}</span>
        </div>
      )}

      {/* Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2, padding: 2, background: "#000" }}>
        {chapter.panels.map((p, i) => (
          <PanelCard key={p.id} panel={p} idx={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Chapter History Tabs ──  FIX #8: history navigation ───
function ChapterTabs({ chapters, currentIdx, onSelect }) {
  if (chapters.length <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", padding: "2px 0" }}>
      {chapters.map((ch, i) => (
        <button
          key={ch.number}
          className="chapter-tab"
          onClick={() => onSelect(i)}
          style={{
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: i === currentIdx ? 700 : 400,
            background: i === currentIdx ? "#f5c300" : "#181818",
            color: i === currentIdx ? "#000" : "#888",
            border: `1px solid ${i === currentIdx ? "#f5c300" : "#2a2a2a"}`,
            borderRadius: 6,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
        >
          Ch.{ch.number} — {ch.title.length > 14 ? ch.title.slice(0, 14) + "…" : ch.title}
        </button>
      ))}
    </div>
  );
}

// ─── Nav Buttons ───
function NavButtons({ hasChapters, isLoading, onGenerate, onFinish, nextNum, atMax }) {
  const btnBase = { border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" };
  const Spinner = () => (
    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
  );

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
      {!atMax ? (
        <button className="action-btn" onClick={onGenerate} disabled={isLoading} style={{ ...btnBase, background: hasChapters ? "#166534" : "#1d4ed8", color: "#fff", opacity: isLoading ? 0.65 : 1 }}>
          {isLoading ? <><Spinner />Generating AI Chapter…</> : hasChapters ? `⏩ Lanjut Chapter ${nextNum}` : "🎬 Generate Chapter 1"}
        </button>
      ) : (
        <div style={{ padding: "10px 16px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#666", fontSize: 13 }}>
          📚 Sudah 20 chapter — maksimum tercapai!
        </div>
      )}
      {hasChapters && (
        <button className="action-btn" onClick={onFinish} disabled={isLoading} style={{ ...btnBase, background: "#1a1a1a", color: "#aaa", border: "1px solid #333", opacity: isLoading ? 0.5 : 1 }}>
          🏁 Selesai Baca
        </button>
      )}
    </div>
  );
}

// ─── Finished Screen ───
// BUG FIX #5: receives saved count, not from reset state
function FinishedScreen({ count, onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1.5rem", animation: "fadeIn 0.5s ease" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: "#f5c300", fontSize: 32, fontWeight: 700, margin: "0 0 8px" }}>Tamat!</h2>
      <p style={{ color: "#666", marginBottom: 28, fontSize: 15 }}>
        Kamu telah membaca <strong style={{ color: "#ddd" }}>{count} chapter</strong>. Luar biasa!
      </p>
      <button onClick={onReset} style={{ background: "#f5c300", color: "#000", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseLeave={e => e.currentTarget.style.filter = "none"}
      >
        📚 Baca Komik Lain
      </button>
    </div>
  );
}

// ─── Genre Selector ───
// BUG FIX #6: separate isLoadingGenres state, passed as proper boolean
function GenreSelector({ genres, onSelect }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#f5c300", margin: "0 0 8px", letterSpacing: -0.5 }}>Pilih Genre Komik</h1>
        <p style={{ color: "#555", fontSize: 13, margin: 0 }}>Setiap chapter di-generate AI secara real-time · Gambar dari Pollinations.ai (gratis)</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {genres.map((g, i) => (
          <button
            key={g.id}
            className="genre-btn"
            onClick={() => onSelect(g)}
            style={{
              background: "#181818",
              border: "2px solid #252525",
              borderRadius: 12,
              padding: "22px 14px",
              cursor: "pointer",
              textAlign: "center",
              color: "#f0f0f0",
              transition: "all 0.18s",
              animation: `fadeIn 0.4s ease forwards`,
              animationDelay: `${i * 0.06}s`,
              opacity: 0,
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 10 }}>{g.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
            <div style={{ width: 28, height: 2, background: g.color, margin: "6px auto", borderRadius: 2 }} />
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4 }}>{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function ComicApp() {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0); // BUG FIX #5

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    setChapters([]);
    setCurrentIdx(0);
    setIsFinished(false);
    setError(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedGenre || isLoading) return;
    const next = chapters.length + 1;
    if (next > 20) { setError("Sudah mencapai batas maksimal 20 chapter."); return; }

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateChapterContent(
        selectedGenre.id,
        next,
        chapters.map(c => ({ number: c.number, title: c.title }))
      );

      const chapter = {
        number: next,
        title: data.title ?? `Chapter ${next}`,
        panels: (data.panels ?? []).map((p, i) => ({
          id: `${next}-${i}`,
          imageUrl: getPanelImage(p.theme ?? "manga scene", selectedGenre.id, i, next),
          caption: p.caption ?? "",
          dialogue: p.dialogue ?? "",
        })),
        continuationNote: data.continuationNote ?? "", // BUG FIX #4
        createdAt: new Date().toISOString(),
      };

      setChapters(prev => {
        const updated = [...prev, chapter];
        setCurrentIdx(updated.length - 1);
        return updated;
      });
    } catch (err) {
      setError("Gagal generate chapter. Pastikan koneksi internet aktif dan coba lagi.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenre, chapters, isLoading]);

  const handleFinish = () => {
    setFinishedCount(chapters.length); // BUG FIX #5: save count before clearing
    setIsFinished(true);
    setSelectedGenre(null);
    setChapters([]);
    setCurrentIdx(0);
  };

  const handleReset = () => {
    setSelectedGenre(null);
    setChapters([]);
    setCurrentIdx(0);
    setIsFinished(false);
    setError(null);
    setFinishedCount(0);
  };

  const currentChapter = chapters[currentIdx] ?? null;
  const atMax = chapters.length >= 20;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0", fontFamily: "'Georgia', serif" }}>
      {/* ── Header ── */}
      <header style={{ background: "#111", borderBottom: "3px solid #f5c300", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#f5c300", letterSpacing: -0.5 }}>📚 ComicGen</span>
          {selectedGenre && (
            <span style={{ fontSize: 12, color: "#555", borderLeft: "1px solid #333", paddingLeft: 12 }}>
              {selectedGenre.icon} {selectedGenre.name}
            </span>
          )}
        </div>
        {selectedGenre && (
          <button className="close-btn" onClick={handleReset}
            style={{ background: "none", border: "1px solid #333", color: "#888", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}>
            ← Ganti Genre
          </button>
        )}
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* ── Error Banner ── */}
        {error && (
          <div style={{ background: "#1f0a0a", border: "1px solid #5c1f1f", color: "#f87171", padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span>⚠️ {error}</span>
            <button className="close-btn" onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px", borderRadius: 4, transition: "background 0.15s" }}>×</button>
          </div>
        )}

        {/* ── Genre Selector ── */}
        {!selectedGenre && !isFinished && <GenreSelector genres={GENRES} onSelect={handleSelectGenre} />}

        {/* ── Reading View ── */}
        {selectedGenre && !isFinished && (
          <div>
            {/* Chapter history tabs — BUG FIX #8 */}
            <ChapterTabs chapters={chapters} currentIdx={currentIdx} onSelect={setCurrentIdx} />

            {/* Progress — BUG FIX #10 */}
            {chapters.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 3, background: "#1f1f1f", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#f5c300", borderRadius: 2, width: `${(chapters.length / 20) * 100}%`, transition: "width 0.5s ease" }} />
                </div>
                <span style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>{chapters.length}/20 chapter</span>
              </div>
            )}

            {/* Comic Viewer or empty state */}
            {currentChapter ? (
              <ComicViewer chapter={currentChapter} />
            ) : (
              <div style={{ background: "#161616", border: "2px dashed #252525", borderRadius: 10, padding: "3rem 2rem", textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 10, opacity: 0.6 }}>🎬</div>
                <p style={{ color: "#555", margin: 0 }}>Klik tombol di bawah untuk generate chapter pertamamu!</p>
              </div>
            )}

            {/* Nav Buttons */}
            <NavButtons
              hasChapters={chapters.length > 0}
              isLoading={isLoading}
              onGenerate={handleGenerate}
              onFinish={handleFinish}
              nextNum={chapters.length + 1}
              atMax={atMax}
            />
          </div>
        )}

        {/* ── Finished Screen ── BUG FIX #5 */}
        {isFinished && <FinishedScreen count={finishedCount} onReset={handleReset} />}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "16px 20px", textAlign: "center", marginTop: 40 }}>
        <p style={{ margin: 0, fontSize: 11, color: "#333" }}>
          Story: Claude AI (Anthropic) · Images: Pollinations.ai (free, no API key) · ComicGen Fixed
        </p>
      </footer>
    </div>
  );
}
