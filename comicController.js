import { generateComicChapter } from '../services/comicGenerator.js';

const GENRES = [
  { id: 'action',    name: 'Aksi',        icon: '⚡', description: 'Pertarungan seru & adrenalin' },
  { id: 'adventure', name: 'Petualangan', icon: '🗺️', description: 'Jelajahi dunia misterius' },
  { id: 'fantasy',   name: 'Fantasi',     icon: '🐉', description: 'Sihir & makhluk legendaris' },
  { id: 'romance',   name: 'Romantis',    icon: '💕', description: 'Kisah cinta mengharukan' },
  { id: 'comedy',    name: 'Komedi',      icon: '😂', description: 'Lucu & menghibur' },
  { id: 'horror',    name: 'Horor',       icon: '👻', description: 'Misteri & ketegangan' },
];

export const getGenres = (req, res) => {
  res.json({ genres: GENRES });
};

export const generateChapter = async (req, res) => {
  try {
    const { genre, chapterNumber, previousChapters = [] } = req.body;

    if (!genre) return res.status(400).json({ error: 'Genre tidak boleh kosong' });

    const validGenre = GENRES.find(g => g.id === genre);
    if (!validGenre) return res.status(400).json({ error: 'Genre tidak valid' });

    if (!chapterNumber || chapterNumber < 1)
      return res.status(400).json({ error: 'Chapter number harus >= 1' });

    if (chapterNumber > 20)
      return res.status(400).json({ error: 'Maksimal 20 chapter' });

    const chapter = await generateComicChapter(genre, chapterNumber, previousChapters);

    res.json({
      success: true,
      chapter: {
        number: chapterNumber,
        title: chapter.title,
        panels: chapter.panels,
        // BUG FIX #4: continuationNote was generated but never included in response
        continuationNote: chapter.continuationNote ?? '',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Generate chapter error:', error);
    res.status(500).json({ error: 'Gagal generate komik', details: error.message });
  }
};
