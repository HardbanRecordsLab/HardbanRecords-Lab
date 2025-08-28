# HardbanRecords Lab - Backend To-Do Lista

Ten plik śledzi zadania i postępy w rozwoju warstwy backendowej aplikacji.

### Krok 1: Podstawowa Konfiguracja Serwera
- [x] Zainicjowanie projektu Node.js w folderze `backend`.
- [x] Instalacja frameworka Express.js.
- [x] Stworzenie podstawowego pliku `server.js`.
- [x] Uruchomienie serwera i stworzenie testowego endpointu `GET /api`.

### Krok 2: Połączenie z Bazą Danych (AWS RDS)
- [x] Instalacja biblioteki `pg` do obsługi PostgreSQL.
- [x] Stworzenie modułu konfiguracji połączenia z bazą danych.
- [x] Implementacja bezpiecznego zarządzania danymi dostępowymi (DATABASE_URL) przy użyciu zmiennych środowiskowych (`.env`).
- [x] Stworzenie endpointu testującego połączenie z bazą danych.

### Krok 3: Implementacja API (Endpoints)
- [x] **Pobieranie danych:** Stworzenie endpointu `GET /api/data` do pobierania całego stanu aplikacji (książki, wydania, zadania).
- [ ] **Moduł Muzyczny:**
  - [ ] `POST /api/music/releases` - do dodawania nowego wydania.
  - [ ] `PATCH /api/music/releases/:id/splits` - do aktualizacji podziałów tantiem.
  - [ ] `POST /api/music/tasks` - do dodawania nowego zadania.
  - [ ] `PATCH /api/music/tasks/:id` - do zmiany statusu zadania.
- [ ] **Moduł Wydawniczy:**
  - [ ] `POST /api/publishing/books` - do dodawania nowej książki.
  - [ ] `PATCH /api/publishing/books/:id` - do aktualizacji danych książki.
  - [ ] `PATCH /api/publishing/books/:id/chapters/:chapterIndex` - do aktualizacji treści rozdziału.
  - [ ] `POST /api/publishing/tasks` - do dodawania nowego zadania.
  - [ ] `PATCH /api/publishing/tasks/:id` - do zmiany statusu zadania.

### Krok 4: Integracja z AWS S3 (Przesyłanie Plików)
- [ ] Instalacja `aws-sdk`.
- [ ] Stworzenie endpointu `GET /api/s3-presigned-url`, który generuje bezpieczny, tymczasowy link do przesyłania plików.
- [ ] Implementacja logiki po stronie frontendu do przesyłania plików bezpośrednio do S3 przy użyciu wygenerowanego linku.

### Krok 5: Refaktoryzacja i Ulepszenia
- [x] Implementacja mechanizmu CORS, aby umożliwić komunikację między frontendem a backendem.
- [ ] Dodanie podstawowej walidacji przychodzących danych.
- [ ] Zorganizowanie kodu w moduły (np. osobne pliki dla `routes`, `controllers`).

### Krok 6: Wdrożenie (Deployment)
- [ ] Przygotowanie aplikacji do wdrożenia na darmowej platformie (np. Vercel, Render).
- [ ] Konfiguracja zmiennych środowiskowych na platformie docelowej.
- [ ] Wdrożenie aplikacji i przeprowadzenie testów na środowisku produkcyjnym.