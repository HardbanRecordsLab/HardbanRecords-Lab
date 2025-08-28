// Plik: backend/server.js

// --- Krok 1: Importujemy potrzebne narzędzia ---
const express = require('express');
const cors = require('cors'); // Importujemy CORS
const db = require('./db');
require('dotenv').config();

// --- Krok 2: Inicjalizujemy aplikację i dodajemy middleware ---
const app = express();
app.use(cors()); // Używamy CORS, aby zezwolić na żądania z innego portu (naszego frontendu)
app.use(express.json()); // Pozwala serwerowi rozumieć dane w formacie JSON wysyłane z frontendu

// --- Krok 3: Definiujemy port ---
const PORT = process.env.PORT || 3001;

// --- Krok 4: Definiujemy nasze "endpoints" ---

// Endpoint testowy, który stworzyliśmy wcześniej
app.get('/api', (req, res) => {
  res.json({ message: "Serwer HardbanRecords Lab działa poprawnie!" });
});

// Endpoint do testowania połączenia z bazą danych
app.get('/api/db-test', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.json({
      success: true,
      message: "Połączenie z bazą danych PostgreSQL jest aktywne.",
      dbTime: rows[0].now,
    });
  } catch (error) {
    console.error("Błąd połączenia z bazą danych:", error);
    res.status(500).json({ success: false, message: "Nie udało się połączyć z bazą danych.", error: error.message });
  }
});

// Helper do bezpiecznego formatowania dat do 'YYYY-MM-DD'
const formatDate = (date) => {
    if (!date) return undefined; // Zwróć undefined dla pól opcjonalnych (JSON pominie ten klucz)
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return undefined;
    }
    return d.toISOString().split('T')[0];
};

// Helper do formatowania daty, która jest wymagana jako string w frontendzie
const formatRequiredDate = (date) => {
    if (!date) return ''; // Zwróć pusty string, jeśli data jest null
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return '';
    }
    return d.toISOString().split('T')[0];
};


// Helper do transformacji snake_case na camelCase dla zadań
const transformTask = (task) => ({
    id: task.id,
    text: task.text,
    completed: task.completed,
    dueDate: formatRequiredDate(task.due_date), // Używamy nowego, bezpiecznego formatera
});

// GŁÓWNY ENDPOINT DO POBIERANIA WSZYSTKICH DANYCH
app.get('/api/data', async (req, res) => {
  try {
    const [
      musicReleasesRes,
      musicSplitsRes,
      musicTasksRes,
      booksRes,
      bookSplitsRes,
      bookChaptersRes,
      bookIllustrationsRes,
      publishingTasksRes,
      appConfigRes
    ] = await Promise.all([
      db.query('SELECT * FROM music_releases ORDER BY id'),
      db.query('SELECT * FROM music_release_splits'),
      db.query('SELECT * FROM music_tasks ORDER BY id'),
      db.query('SELECT * FROM books ORDER BY id'),
      db.query('SELECT * FROM book_splits'),
      db.query('SELECT * FROM book_chapters ORDER BY book_id, chapter_order'),
      db.query('SELECT * FROM book_illustrations'),
      db.query('SELECT * FROM publishing_tasks ORDER BY id'),
      db.query('SELECT onboarding_complete FROM app_config WHERE id = 1')
    ]);

    const musicSplitsMap = musicSplitsRes.rows.reduce((acc, split) => {
      if (!acc[split.release_id]) acc[split.release_id] = [];
      acc[split.release_id].push({ name: split.name, share: String(split.share) });
      return acc;
    }, {});

    const bookSplitsMap = bookSplitsRes.rows.reduce((acc, split) => {
      if (!acc[split.book_id]) acc[split.book_id] = [];
      acc[split.book_id].push({ name: split.name, share: String(split.share) });
      return acc;
    }, {});

    const bookChaptersMap = bookChaptersRes.rows.reduce((acc, chapter) => {
      if (!acc[chapter.book_id]) acc[chapter.book_id] = [];
      acc[chapter.book_id].push({ title: chapter.title, content: chapter.content });
      return acc;
    }, {});

    const bookIllustrationsMap = bookIllustrationsRes.rows.reduce((acc, illustration) => {
      if (!acc[illustration.book_id]) acc[illustration.book_id] = [];
      acc[illustration.book_id].push({ url: illustration.url, prompt: illustration.prompt });
      return acc;
    }, {});

    const releasesWithSplits = musicReleasesRes.rows.map(release => ({
      id: release.id,
      title: release.title,
      artist: release.artist,
      status: release.status || 'Processing',
      genre: release.genre,
      releaseDate: formatDate(release.release_date), // Używamy nowego, bezpiecznego formatera
      splits: musicSplitsMap[release.id] || []
    }));

    const booksWithDetails = booksRes.rows.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: book.status || 'Draft',
      blurb: book.blurb || '',
      keywords: book.keywords || '',
      rights: {
        territorial: !!book.rights_territorial,
        translation: !!book.rights_translation,
        adaptation: !!book.rights_adaptation,
        audio: !!book.rights_audio,
        drm: !!book.rights_drm,
      },
      splits: bookSplitsMap[book.id] || [],
      chapters: bookChaptersMap[book.id] || [],
      illustrations: bookIllustrationsMap[book.id] || [],
      coverImageUrl: book.cover_image_url || '',
    }));

    const fullState = {
      music: {
        releases: releasesWithSplits,
        tasks: musicTasksRes.rows.map(transformTask),
      },
      publishing: {
        books: booksWithDetails,
        tasks: publishingTasksRes.rows.map(transformTask),
      },
      onboardingComplete: appConfigRes.rows.length > 0 ? appConfigRes.rows[0].onboarding_complete : false,
    };
    
    res.json(fullState);

  } catch (error) {
    console.error("Błąd podczas pobierania danych aplikacji:", error);
    res.status(500).json({ success: false, message: "Nie udało się pobrać danych aplikacji.", error: error.message });
  }
});


// --- Krok 5: Uruchamiamy serwer ---
app.listen(PORT, () => {
  console.log(`Serwer działa i nasłuchuje na porcie ${PORT}`);
});