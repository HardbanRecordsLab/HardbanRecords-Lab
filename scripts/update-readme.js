// Uruchomienie: node scripts/update-readme.js

const fs = require('fs');
const path = require('path');

// --- Konfiguracja ---
// Lista zadań do oznaczenia jako ukończone.
// Wprowadź tutaj fragment dokładnego tekstu zadania z pliku README.md.
const completedTasks = [
    'Dodanie funkcji "cofnij" dla kluczowych operacji, takich jak zastąpienie tekstu przez AI.',
    '**Doświadczenie Nowego Użytkownika**',
    'Wdrożenie bardziej zaawansowanej walidacji formularzy (np. blokowanie znaków nienumerycznych w polach procentowych).',
    'Dodanie skrótów klawiszowych dla zaawansowanych użytkowników w edytorze Studio.',
    '**Zaawansowane Funkcje i Jakość**',
    'Zaimplementowanie rozwiązania do zarządzania stanem (np. Redux, Zustand) w celu lepszej obsługi w miarę rozrostu aplikacji.'
];

const readmePath = path.join(__dirname, '..', 'README.md');

// --- Logika skryptu ---
try {
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    const lines = readmeContent.split('\n');
    let changesMade = 0;

    const updatedLines = lines.map(line => {
        // Znajdź linie, które są niezaznaczonymi elementami listy
        const match = line.match(/^- \[\s\] (.*)/);
        if (match) {
            const taskText = match[1].trim();
            // Sprawdź, czy tekst zadania pasuje do któregokolwiek z ukończonych zadań
            if (completedTasks.some(completed => taskText.includes(completed))) {
                changesMade++;
                console.log(`Oznaczanie zadania jako ukończone: "${taskText}"`);
                return line.replace('- [ ]', '- [x]');
            }
        }
        return line;
    });

    if (changesMade > 0) {
        fs.writeFileSync(readmePath, updatedLines.join('\n'), 'utf8');
        console.log(`\nPomyślnie zaktualizowano README.md. Oznaczono ${changesMade} zadań jako ukończone.`);
    } else {
        console.log('\nNie znaleziono żadnych nowych zadań do zaktualizowania w README.md.');
        console.log('Upewnij się, że tekst zadania w tablicy `completedTasks` w skrypcie jest poprawny.');
    }

} catch (error) {
    console.error('\nWystąpił błąd podczas aktualizacji pliku README.md:', error);
}