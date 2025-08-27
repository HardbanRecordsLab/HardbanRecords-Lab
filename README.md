# HardbanRecords Lab - Platforma Kreatywna

HardbanRecords Lab to kompleksowa, oparta na AI platforma dla muzyków i autorów, zaprojektowana w celu usprawnienia całego cyklu twórczego – od koncepcji, przez produkcję i dystrybucję, aż po monetyzację i analitykę.

## Lista Zadań Projektu

Poniższa lista śledzi ukończone funkcje oraz kolejne kroki w rozwoju platformy.

### Struktura Podstawowa i Rdzeń Aplikacji
- [x] Inicjalizacja projektu w oparciu o React i TypeScript.
- [x] Skonfigurowanie i integracja klienta Gemini API.
- [x] Zbudowanie głównego pulpitu nawigacyjnego.
- [x] Stworzenie modułowego systemu widoków dla "Music Publishing" i "Digital Publishing".
- [x] Zaprojektowanie spójnego, ciemnego motywu interfejsu użytkownika (UI/UX).
- [x] Implementacja komponentów nagłówka i głównego układu aplikacji.

### Moduł: Music Publishing
- [x] **Zakładka: Studio**
  - [x] Formularz tworzenia nowego wydania (Artysta, Tytuł, Gatunek).
  - [x] Asystent Metadanych AI (Nastrój, Tagi).
  - [x] Sugerowanie Daty Wydania przez AI.
  - [x] Generator Okładek AI (`imagen-4.0-generate-001`).
  - [x] Symulowany Web DAW ("Final Touch").
  - [x] Symulowane narzędzie do mintowania NFT.
- [x] **Zakładka: Wydania (Releases)**
  - [x] Wyświetlanie listy wszystkich wydawnictw muzycznych ze statusem.
- [x] **Zakładka: Analityka**
  - [x] Statyczne karty analityczne (Przychody, Streamy, Platformy).
  - [x] Narzędzie Prognozy Przychodów AI.
  - [x] Zaawansowana Analityka Słuchaczy AI (dane demograficzne).
- [x] **Zakładka: Podziały (Splits)**
  - [x] Zarządzanie podziałami tantiem dla każdego wydania.
  - [x] Dodawanie/edycja współpracowników i ich udziałów.
  - [x] Walidacja sumy udziałów (musi wynosić 100%).
  - [x] Asystent Prawny AI do generowania umowy o podziale (Split Sheet).
- [x] **Zakładka: Synchronizacja (Sync)**
  - [x] Wyświetlanie listy dostępnych zleceń synchronizacji (briefów).
  - [x] Wyszukiwarka Dopasowań AI do analizy zgodności utworu z briefem.
- [x] **Zakładka: Kariera**
  - [x] Zwiadowca A&R AI do doradztwa zawodowego.
  - [x] Asystent Finansowania AI do wyszukiwania grantów.
  - [x] Wyszukiwarka Współpracowników AI.
- [x] **Zakładka: Zadania**
  - [x] Zintegrowany menedżer zadań dla projektów muzycznych.

### Moduł: Digital Publishing
- [x] **Rdzeń Funkcjonalności**
  - [x] Modal i funkcjonalność "Stwórz Nową Książkę".
  - [x] Widok biblioteki z możliwością wyboru książki.
  - [x] Obsługa pustego stanu dla nowych użytkowników.
- [x] **Zakładka: Studio**
  - [x] Edytor manuskryptu.
  - [x] Zarządzanie rozdziałami (przeglądanie, dodawanie).
  - [x] Możliwość wgrania istniejącego manuskryptu (.txt).
  - [x] Asystent Pisania AI (Korekta, Analiza Fabuły, Wzbogacanie Prozy).
  - [x] Generator Okładek AI (`imagen-4.0-generate-001`).
  - [x] Asystent Ilustracji AI (`imagen-4.0-generate-001`) z galerią.
- [x] **Zakładka: Dystrybucja**
  - [x] Wyświetlanie biblioteki książek ze statusem.
  - [x] Symulowana konwersja do formatów (EPUB, MOBI, PDF) jednym kliknięciem.
- [x] **Zakładka: Analityka**
  - [x] Statyczne karty analityczne (Sprzedaż, Przychody, Sprzedawcy).
  - [x] Narzędzie Prognozy Sprzedaży AI.
- [x] **Zakładka: Prawa i Podziały (Rights & Splits)**
  - [x] Zarządzanie prawami do publikacji za pomocą przełączników.
  - [x] Zarządzanie podziałami tantiem ze współpracownikami.
  - [x] Wyszukiwarka Praw AI do znajdowania okazji licencyjnych.
- [x] **Zakładka: Marketing**
  - [x] Generator Opisów (Blurb) AI na podstawie manuskryptu.
  - [x] Generator Słów Kluczowych AI.
  - [x] Generator Materiałów Marketingowych AI (posty do mediów społecznościowych).
  - [x] Symulowany kreator sprzedaży bezpośredniej i edycji specjalnych.
- [x] **Zakładka: Audiobook**
  - [x] Wybór głosu AI i generowanie próbki audiobooka (symulowane).
- [x] **Zakładka: Budowanie Świata (World-building)**
  - [x] Edytor "biblii" świata przedstawionego.
  - [x] Kontroler Spójności AI porównujący "biblię" z manuskryptem.
- [x] **Zakładka: Zadania**
  - [x] Zintegrowany menedżer zadań dla projektów pisarskich.

### Do Zrobienia / Kolejne Kroki
- [ ] **Udoskonalenia UI/UX**
  - [ ] Wdrożenie nieinwazyjnych powiadomień "toast" w celu informowania użytkownika o wykonanych akcjach (np. zapisaniu zmian).
  - [x] Ulepszenie obsługi błędów, aby wyświetlać przyjazne komunikaty w aplikacji zamiast generycznych alert().
  - [ ] Dodanie funkcji "cofnij" dla kluczowych operacji, takich jak zastąpienie tekstu przez AI.
- [ ] **Doświadczenie Nowego Użytkownika**
  - [x] Stworzenie interaktywnego przewodnika (onboarding tour) dla nowych użytkowników, prezentującego kluczowe moduły.
  - [ ] Dodanie podpowiedzi (tooltipów) lub dedykowanej sekcji pomocy, aby wyjaśnić działanie złożonych narzędzi AI.
- [ ] **Zaawansowane Funkcje i Jakość**
  - [ ] Wdrożenie bardziej zaawansowanej walidacji formularzy (np. blokowanie znaków nienumerycznych w polach procentowych).
  - [ ] Dodanie skrótów klawiszowych dla zaawansowanych użytkowników w edytorze Studio.
  - [ ] Zaimplementowanie rozwiązania do zarządzania stanem (np. Redux, Zustand) w celu lepszej obsługi w miarę rozrostu aplikacji.
  - [ ] Napisanie testów jednostkowych i integracyjnych w celu zapewnienia jakości kodu i zapobiegania regresjom.
- [ ] **Backend i Wdrożenie**
  - [ ] Podłączenie symulowanych funkcji (mintowanie NFT, Web DAW, konwersja formatów) do rzeczywistych usług backendowych.
  - [ ] Skonfigurowanie potoku CI/CD do automatycznego testowania i wdrażania.
  - [ ] Implementacja bazy danych do przechowywania danych użytkowników (wydania, książki, zadania).