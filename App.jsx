import { useState, useCallback } from "react";

const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  .genre-btn:hover { border-color:#f5c300!important; background:#1e1c0a!important; transform:translateY(-2px); }
  .chapter-tab:hover { background:#222!important; }
  .action-btn:hover:not(:disabled) { filter:brightness(1.15); transform:translateY(-1px); }
`;
document.head.appendChild(styleTag);

const GENRES = [
  { id:"action",    name:"Aksi",        icon:"⚡", desc:"Pertarungan seru & adrenalin",  color:"#ef4444", keywords:"action battle city warrior combat explosion night dramatic" },
  { id:"adventure", name:"Petualangan", icon:"🗺️", desc:"Jelajahi dunia misterius",      color:"#f97316", keywords:"adventure jungle ancient ruins expedition treasure discovery" },
  { id:"fantasy",   name:"Fantasi",     icon:"🐉", desc:"Sihir & makhluk legendaris",    color:"#a855f7", keywords:"fantasy magic dragon castle wizard mystical enchanted forest" },
  { id:"romance",   name:"Romantis",    icon:"💕", desc:"Kisah cinta mengharukan",        color:"#ec4899", keywords:"romance love couple garden spring flowers cafe cherry blossom" },
  { id:"comedy",    name:"Komedi",      icon:"😂", desc:"Lucu & menghibur",              color:"#eab308", keywords:"comedy funny cartoon exaggerated slapstick humorous expression" },
  { id:"horror",    name:"Horor",       icon:"👻", desc:"Misteri & ketegangan",          color:"#6b7280", keywords:"horror dark ghost shadow fog haunted spine chilling eerie" },
];

// Pollinations.ai — free, no API key needed
const getPanelImage = (theme, genreId, panelIdx, chapterNum) => {
  const seed = panelIdx * 37 + chapterNum * 13 + genreId.charCodeAt(0) * 7;
  const g = GENRES.find(x => x.id === genreId);
  const style = genreId === "horror" ? "dark atmospheric ink illustration" : "manga comic panel ink art";
  const prompt = `${style}, ${g?.keywords ?? ""}, ${theme}, high contrast dramatic lighting`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=480&height=320&nologo=true&seed=${seed}`;
};

// Calls our Vercel serverless function — no CORS, no exposed API key
const generateChapterFromAPI = async (genre, chapterNumber, previousChapters) => {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genre, chapterNumber, previousChapters }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data;
};

// ─── Panel Card with skeleton loading ───
function PanelCard({ panel, idx }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  return (
    <div style={{ background:"#0a0a0a", border:"2px solid #1f1f1f", overflow:"hidden", animation:"fadeIn 0.4s ease forwards", animationDelay:`${idx*0.08}s`, opacity:0 }}>
      <div style={{ position:"relative", aspectRatio:"3/2", background:"#111", overflow:"hidden" }}>
        {!loaded && (
          <div style={{ position:"absolute", inset:0, background:"#111", animation:"pulse 1.5s ease infinite", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:28, opacity:0.3 }}>🖼</span>
          </div>
        )}
        <img
          src={errored ? `https://picsum.photos/seed/${idx*99}/480/320` : panel.imageUrl}
          alt={`Panel ${idx+1}`}
          onLoad={() => setLoaded(true)}
          onError={() => { setErrored(true); setLoaded(true); }}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", opacity:loaded?1:0, transition:"opacity 0.4s ease" }}
        />
        <span style={{ position:"absolute", top:6, left:6, background:"rgba(0,0,0,0.85)", color:"#f5c300", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4 }}>
          {idx+1}
        </span>
      </div>
      <div style={{ padding:"10px 12px" }}>
        <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#ddd", lineHeight:1.4 }}>{panel.caption}</p>
        {panel.dialogue && (
          <div style={{ marginTop:7, padding:"6px 10px", background:"#141414", borderLeft:"2px solid #f5c300", borderRadius:"0 4px 4px 0" }}>
            <p style={{ margin:0, fontSize:11, color:"#a0a0a0", fontStyle:"italic" }}>{panel.dialogue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComicViewer({ chapter }) {
  return (
    <div style={{ background:"#161616", borderRadius:10, overflow:"hidden", border:"1px solid #252525", marginBottom:16, animation:"fadeIn 0.35s ease" }}>
      <div style={{ background:"#f5c300", padding:"14px 20px" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:"#00000088", textTransform:"uppercase", marginBottom:2 }}>Chapter {chapter.number}</div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"#000", lineHeight:1.2 }}>{chapter.title}</h2>
        <div style={{ fontSize:10, color:"#00000066", marginTop:4 }}>
          {new Date(chapter.createdAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
      {chapter.continuationNote && (
        <div style={{ padding:"8px 20px", background:"#0f0f0f", borderBottom:"1px solid #1f1f1f", fontSize:11, color:"#666", fontStyle:"italic", display:"flex", gap:6 }}>
          <span>📖</span><span>{chapter.continuationNote}</span>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:2, padding:2, background:"#000" }}>
        {chapter.panels.map((p,i) => <PanelCard key={p.id} panel={p} idx={i} />)}
      </div>
    </div>
  );
}

function ChapterTabs({ chapters, currentIdx, onSelect }) {
  if (chapters.length <= 1) return null;
  return (
    <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", padding:"2px 0" }}>
      {chapters.map((ch,i) => (
        <button key={ch.number} className="chapter-tab" onClick={() => onSelect(i)}
          style={{ padding:"5px 12px", fontSize:11, fontWeight:i===currentIdx?700:400, background:i===currentIdx?"#f5c300":"#181818", color:i===currentIdx?"#000":"#888", border:`1px solid ${i===currentIdx?"#f5c300":"#2a2a2a"}`, borderRadius:6, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
          Ch.{ch.number} — {ch.title.length>14?ch.title.slice(0,14)+"…":ch.title}
        </button>
      ))}
    </div>
  );
}

function NavButtons({ hasChapters, isLoading, onGenerate, onFinish, nextNum, atMax }) {
  const base = { border:"none", borderRadius:8, padding:"12px 24px", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" };
  const Spin = () => <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.25)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />;
  return (
    <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginTop:4 }}>
      {!atMax ? (
        <button className="action-btn" onClick={onGenerate} disabled={isLoading}
          style={{ ...base, background:hasChapters?"#166534":"#1d4ed8", color:"#fff", opacity:isLoading?0.65:1 }}>
          {isLoading ? <><Spin/>Generating AI Chapter…</> : hasChapters ? `⏩ Lanjut Chapter ${nextNum}` : "🎬 Generate Chapter 1"}
        </button>
      ) : (
        <div style={{ padding:"10px 16px", background:"#1a1a1a", border:"1px solid #333", borderRadius:8, color:"#666", fontSize:13 }}>
          📚 Sudah 20 chapter — maksimum tercapai!
        </div>
      )}
      {hasChapters && (
        <button className="action-btn" onClick={onFinish} disabled={isLoading}
          style={{ ...base, background:"#1a1a1a", color:"#aaa", border:"1px solid #333", opacity:isLoading?0.5:1 }}>
          🏁 Selesai Baca
        </button>
      )}
    </div>
  );
}

function FinishedScreen({ count, onReset }) {
  return (
    <div style={{ textAlign:"center", padding:"4rem 1.5rem", animation:"fadeIn 0.5s ease" }}>
      <div style={{ fontSize:80, marginBottom:16 }}>🎉</div>
      <h2 style={{ color:"#f5c300", fontSize:32, fontWeight:700, margin:"0 0 8px" }}>Tamat!</h2>
      <p style={{ color:"#666", marginBottom:28, fontSize:15 }}>
        Kamu telah membaca <strong style={{ color:"#ddd" }}>{count} chapter</strong>. Luar biasa!
      </p>
      <button onClick={onReset}
        style={{ background:"#f5c300", color:"#000", border:"none", borderRadius:8, padding:"14px 32px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
        📚 Baca Komik Lain
      </button>
    </div>
  );
}

function GenreSelector({ genres, onSelect }) {
  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <h1 style={{ fontSize:30, fontWeight:700, color:"#f5c300", margin:"0 0 8px", letterSpacing:-0.5 }}>Pilih Genre Komik</h1>
        <p style={{ color:"#555", fontSize:13, margin:0 }}>Chapter di-generate AI · Gambar dari Pollinations.ai (gratis, tanpa API key)</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12 }}>
        {genres.map((g,i) => (
          <button key={g.id} className="genre-btn" onClick={() => onSelect(g)}
            style={{ background:"#181818", border:"2px solid #252525", borderRadius:12, padding:"22px 14px", cursor:"pointer", textAlign:"center", color:"#f0f0f0", transition:"all 0.18s", animation:"fadeIn 0.4s ease forwards", animationDelay:`${i*0.06}s`, opacity:0 }}>
            <div style={{ fontSize:38, marginBottom:10 }}>{g.icon}</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{g.name}</div>
            <div style={{ width:28, height:2, background:g.color, margin:"6px auto", borderRadius:2 }} />
            <div style={{ fontSize:11, color:"#555", lineHeight:1.4 }}>{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function ComicApp() {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [chapters, setChapters]           = useState([]);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [isFinished, setIsFinished]       = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre); setChapters([]); setCurrentIdx(0);
    setIsFinished(false); setError(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedGenre || isLoading) return;
    const next = chapters.length + 1;
    if (next > 20) { setError("Sudah mencapai batas maksimal 20 chapter."); return; }
    setIsLoading(true); setError(null);
    try {
      const data = await generateChapterFromAPI(
        selectedGenre.id, next,
        chapters.map(c => ({ number: c.number, title: c.title }))
      );
      const chapter = {
        number: next,
        title: data.title ?? `Chapter ${next}`,
        panels: (data.panels ?? []).map((p,i) => ({
          id: `${next}-${i}`,
          imageUrl: getPanelImage(p.theme ?? "manga scene", selectedGenre.id, i, next),
          caption: p.caption ?? "",
          dialogue: p.dialogue ?? "",
        })),
        continuationNote: data.continuationNote ?? "",
        createdAt: new Date().toISOString(),
      };
      setChapters(prev => { const u=[...prev,chapter]; setCurrentIdx(u.length-1); return u; });
    } catch (err) {
      setError(`Gagal generate: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenre, chapters, isLoading]);

  const handleFinish = () => {
    setFinishedCount(chapters.length);
    setIsFinished(true); setSelectedGenre(null);
    setChapters([]); setCurrentIdx(0);
  };

  const handleReset = () => {
    setSelectedGenre(null); setChapters([]); setCurrentIdx(0);
    setIsFinished(false); setError(null); setFinishedCount(0);
  };

  const currentChapter = chapters[currentIdx] ?? null;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#f0f0f0", fontFamily:"'Georgia', serif" }}>
      <header style={{ background:"#111", borderBottom:"3px solid #f5c300", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22, fontWeight:700, color:"#f5c300", letterSpacing:-0.5 }}>📚 ComicGen</span>
          {selectedGenre && <span style={{ fontSize:12, color:"#555", borderLeft:"1px solid #333", paddingLeft:12 }}>{selectedGenre.icon} {selectedGenre.name}</span>}
        </div>
        {selectedGenre && (
          <button onClick={handleReset} style={{ background:"none", border:"1px solid #333", color:"#888", padding:"5px 12px", borderRadius:6, cursor:"pointer", fontSize:11 }}>← Ganti Genre</button>
        )}
      </header>

      <main style={{ maxWidth:920, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {error && (
          <div style={{ background:"#1f0a0a", border:"1px solid #5c1f1f", color:"#f87171", padding:"12px 16px", borderRadius:8, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:20, lineHeight:1 }}>×</button>
          </div>
        )}

        {!selectedGenre && !isFinished && <GenreSelector genres={GENRES} onSelect={handleSelectGenre} />}

        {selectedGenre && !isFinished && (
          <div>
            <ChapterTabs chapters={chapters} currentIdx={currentIdx} onSelect={setCurrentIdx} />
            {chapters.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ flex:1, height:3, background:"#1f1f1f", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:"#f5c300", borderRadius:2, width:`${(chapters.length/20)*100}%`, transition:"width 0.5s ease" }} />
                </div>
                <span style={{ fontSize:11, color:"#555", whiteSpace:"nowrap" }}>{chapters.length}/20 chapter</span>
              </div>
            )}
            {currentChapter ? <ComicViewer chapter={currentChapter} /> : (
              <div style={{ background:"#161616", border:"2px dashed #252525", borderRadius:10, padding:"3rem 2rem", textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:48, marginBottom:10, opacity:0.6 }}>🎬</div>
                <p style={{ color:"#555", margin:0 }}>Klik tombol di bawah untuk generate chapter pertamamu!</p>
              </div>
            )}
            <NavButtons hasChapters={chapters.length>0} isLoading={isLoading} onGenerate={handleGenerate} onFinish={handleFinish} nextNum={chapters.length+1} atMax={chapters.length>=20} />
          </div>
        )}

        {isFinished && <FinishedScreen count={finishedCount} onReset={handleReset} />}
      </main>

      <footer style={{ borderTop:"1px solid #1a1a1a", padding:"16px 20px", textAlign:"center", marginTop:40 }}>
        <p style={{ margin:0, fontSize:11, color:"#333" }}>Story: Claude AI (Anthropic) · Images: Pollinations.ai · ComicGen</p>
      </footer>
    </div>
  );
}
