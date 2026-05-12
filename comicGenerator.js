/**
 * Comic Generator Service — FIXED
 * - BUG FIX #7: Typo "Guoah Misterius" → "Gua Misterius"
 * - Can be replaced with OpenAI / Gemini / Claude API
 */

const storyTemplates = {
  action: {
    titles: ['Kebangkitan Pahlawan', 'Badai di Kota Timur', 'Pertarungan Terakhir', 'Misi Rahasia', 'Lawan yang Tak Terduga', 'Kekuatan Baru'],
    panelThemes: ['Suasana kota malam yang mencekam', 'Pertarungan sengit di atas gedung pencakar langit', 'Pahlawan menyelamatkan warga dari ledakan', 'Kilas balik masa lalu pahlawan', 'Musuh utama muncul dengan kekuatan baru', 'Persiapan untuk pertempuran final'],
  },
  adventure: {
    titles: ['Harta Karun Terpendam', 'Jejak di Hutan Purba', 'Kutukan Pulau Hilang', 'Peta Kuno', 'Gua Misterius', 'Perjalanan ke Dunia Lain'], // BUG FIX #7
    panelThemes: ['Ekspedisi memasuki hutan lebat', 'Menemukan peta kuno yang tersembunyi', 'Menyeberangi jembatan tua yang rapuh', 'Menghadapi hewan buas di tengah malam', 'Mengungkap rahasia peradaban kuno', 'Menemukan harta karun yang didambakan'],
  },
  fantasy: {
    titles: ['Pedang Legendaris', 'Sihir yang Terlupakan', 'Panggilan Naga', 'Kerajaan Tersembunyi', 'Ramalan Kuno', 'Pertarungan Abadi'],
    panelThemes: ['Penyihir tua memberikan ramalan', 'Pedang sakti bersinar dengan cahaya biru', 'Naga terbang di atas istana', 'Penyihir jahat melontarkan kutukan', 'Perjalanan melalui hutan ajaib', 'Pertempuran antara kebaikan dan kejahatan'],
  },
  romance: {
    titles: ['Takdir yang Tertunda', 'Cinta di Musim Semi', 'Janji di Bawah Hujan', 'Surat Rahasia', 'Pertemuan Kembali', 'Kisah Kita'],
    panelThemes: ['Dua insan bertatapan di taman bunga', 'Berbagi payung di tengah hujan', 'Membaca surat cinta dengan hati berdebar', 'Kencan romantis di kafe', 'Cemburu kecil yang menggemaskan', 'Pengakuan cinta yang mengharukan'],
  },
  comedy: {
    titles: ['Hari yang Kacau', 'Salah Paham Lucu', 'Si Paling Brainrot', 'Petualangan Konyol', 'Terjebak Situasi Gokil', 'Komedi Kekacauan'],
    panelThemes: ['Tersandung lalu jatuh tertelungkup', 'Salah orang karena wajah mirip', 'Makanan pedas bikin kocak', 'Cosplay gagal total', 'Prank yang backfire', 'Dialog absurd penuh plesetan'],
  },
  horror: {
    titles: ['Bisikan di Kegelapan', 'Rumah Tua Berhantu', 'Boneka Terkutuk', 'Misteri Kuburan', 'Penampakan', 'Dibayang-bayangi'],
    panelThemes: ['Suara aneh dari balik pintu kamar', 'Bayangan misterius di cermin', 'Surat kabar lama tentang pembunuhan', 'Boneka bergerak sendiri', 'Lorong gelap tanpa ujung', 'Penampakan di tengah malam'],
  },
};

const defaultTemplates = {
  titles: ['Chapter Baru', 'Kelanjutan Cerita', 'Bab Berikutnya'],
  panelThemes: ['Adegan pembuka misterius', 'Konflik mulai memanas', 'Kejutan tak terduga'],
};

function generatePanel(theme, panelIndex, chapterNumber) {
  const imagePlaceholder = `https://picsum.photos/id/${(panelIndex * 37 + chapterNumber * 13) % 200}/400/300`;
  return {
    id: `${chapterNumber}-${panelIndex}`,
    imageUrl: imagePlaceholder,
    caption: `${theme} — Panel ${panelIndex + 1}`,
    dialogue: generateDialogue(panelIndex),
  };
}

function generateDialogue(panelIndex) {
  const dialogues = [
    '"Astaga, apa yang terjadi di sini?"',
    '"Kita harus segera bertindak!"',
    '"Aku tidak percaya ini nyata..."',
    '"Diam! Ada yang mendekat."',
    '"Hahaha, akhirnya kita bertemu lagi!"',
    '"Tolong... tolong aku..."',
  ];
  return dialogues[panelIndex % dialogues.length];
}

export async function generateComicChapter(genre, chapterNumber, previousChapters = []) {
  await new Promise(resolve => setTimeout(resolve, 800));

  const templates = storyTemplates[genre] || defaultTemplates;
  const titleIndex = (chapterNumber - 1) % templates.titles.length;
  const chapterTitle = templates.titles[titleIndex];
  const panelCount = 3 + (chapterNumber % 3);

  const panels = [];
  for (let i = 0; i < panelCount; i++) {
    const themeIndex = (chapterNumber * 2 + i) % templates.panelThemes.length;
    panels.push(generatePanel(templates.panelThemes[themeIndex], i, chapterNumber));
  }

  let continuationNote = '';
  if (previousChapters.length > 0) {
    const last = previousChapters[previousChapters.length - 1];
    continuationNote = `Lanjutan dari Chapter ${last.number}: "${last.title}"`;
    panels[0].caption = `[Lanjutan] ${panels[0].caption}`;
  }

  return { title: chapterTitle, panels, continuationNote };
}
