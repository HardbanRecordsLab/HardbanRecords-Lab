// --- Krok 1: Importujemy potrzebne narzędzia ---
// 'pg' to biblioteka (sterownik), która pozwala Node.js komunikować się z bazą danych PostgreSQL.
// Będziemy używać obiektu 'Pool' do zarządzania pulą połączeń, co jest wydajniejsze niż tworzenie nowego połączenia dla każdego zapytania.
const { Pool } = require('pg');

// --- Krok 2: Konfiguracja połączenia ---
// Tworzymy nową instancję puli połączeń.
// Biblioteka 'pg' jest na tyle inteligentna, że automatycznie wykryje zmienną środowiskową DATABASE_URL,
// jeśli jest dostępna, i użyje jej do konfiguracji. Dlatego nie musimy tutaj podawać żadnych danych.
const pool = new Pool();

// --- Krok 3: Eksportujemy funkcję do wykonywania zapytań ---
// Tworzymy i eksportujemy obiekt, który zawiera jedną metodę 'query'.
// Ta metoda będzie opakowaniem dla pool.query. Dzięki temu w innych częściach aplikacji
// będziemy mogli w prosty sposób wykonywać zapytania do bazy, nie martwiąc się o zarządzanie połączeniami.
module.exports = {
  query: (text, params) => pool.query(text, params),
};
