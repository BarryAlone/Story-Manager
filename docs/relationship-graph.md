# Moduł grafu relacji

Kod funkcji znajduje się w `frontend/src/features/relationships/`. Pliki `frontend/src/RelationshipList.jsx` i `frontend/src/RelationshipGraph.jsx` są wyłącznie zgodnymi wstecznie punktami wejścia.

## Główne elementy

- `RelationshipsPage` składa stronę, formularz, listę i przestrzeń roboczą.
- `RelationshipWorkspace` łączy panel boczny, toolbar, legendę i canvas.
- `useRelationshipCrud` obsługuje pobieranie postaci i relacji oraz tworzenie i usuwanie relacji.
- `useRelationshipGraphData` pobiera dane grafu albo ładuje scenariusz developerski.
- `useRelationshipGraphController` przechowuje lokalny stan filtrów, zaznaczenia, hovera, panelu i widoku rozszerzonego.
- `RelationshipCanvas` konfiguruje `ForceGraph2D`, cache obrazów, kamerę oraz zdarzenia wskaźnika.
- `relationshipGraphDrawing` zawiera funkcje rysujące avatary, inicjały, etykiety i opisy relacji.
- `GraphFilters`, `SelectionDetails`, `RelationshipForm` i `RelationshipListPanel` odpowiadają za osobne części panelu bocznego.
- `CharacterCombobox` jest wspólnym wyborem postaci dla wyszukiwarki grafu i formularza relacji.

## Przepływ danych

Dla rzeczywistych danych `useRelationshipGraphData` pobiera równolegle postacie i relacje z endpointów projektu. `buildRelationshipGraphData` zamienia odpowiedź API na węzły i krawędzie używane przez `ForceGraph2D`. Osobne pobranie w `useRelationshipCrud` zasila formularz i dostępną listę HTML. Po utworzeniu albo usunięciu relacji dane listy są pobierane ponownie, a zmiana `graphRevision` odświeża graf.

## Filtrowanie i zaznaczenie

`filterGraphData` jest czystą funkcją działającą poza Reactem. Stosuje kolejno filtr grupy, typu relacji i bezpośredniego sąsiedztwa. Każda widoczna krawędź zawsze ma oba widoczne końce. Kontroler wylicza również podświetlenia hovera i zaznaczenia bez modyfikowania danych źródłowych.

Wyszukanie postaci lub kliknięcie węzła ustawia zaznaczenie i kamerę. Widok sąsiedztwa zgłasza żądanie `zoomToFit`; canvas wykonuje szybkie kadrowanie oraz końcowe dopasowanie po zatrzymaniu symulacji. Zmiana hovera nie tworzy nowych danych grafu i nie uruchamia kadrowania.

## Renderowanie canvas

`RelationshipCanvas` przekazuje do `ForceGraph2D` stabilny, wcześniej przefiltrowany zestaw danych. Funkcje z `relationshipGraphDrawing` rysują okrągły obraz albo inicjały, adaptacyjną etykietę postaci oraz etykietę aktywnej relacji. Obiekty `Image` są przechowywane w cache według URL i nie są tworzone ponownie w każdej klatce. Osobne, szersze obszary wykrywania ułatwiają wskazywanie węzłów i cienkich linii.

## Dane rzeczywiste i scenariusze developerskie

Scenariusze 100/200 są generowane deterministycznie przez `relationshipGraphScenarios.js`. Import generatora i kontrolki scenariuszy są chronione przez `import.meta.env.DEV`. Dane syntetyczne nie są wysyłane do API, a formularz mutacji jest w tym trybie zastąpiony komunikatem tylko do odczytu. Sposób uruchomienia opisuje `docs/relationship-graph-scenarios.md`.

## Tworzenie i edycja relacji

Nowa relacja korzysta z istniejącego `POST /api/character-relationships`. Formularz przesyła identyfikatory dwóch różnych postaci i nazwę relacji, a błędy `422` pokazuje przy odpowiednich polach. Usunięcie korzysta z `DELETE /api/character-relationships/{id}` i wymaga potwierdzenia.

Kliknięcie istniejącej relacji wypełnia ten sam formularz w trybie podglądu edycji. Zapis zmian jest obecnie zablokowany, ponieważ routing API nie udostępnia metody `PUT` ani `PATCH`, mimo że kontroler zawiera metodę aktualizacji.

## Ograniczenia

- Pozycje węzłów nie są zapisywane między wizytami.
- Kolory są deterministycznie wyliczane z nazwy typu relacji i nie są przechowywane w bazie.
- Lista HTML i graf pobierają dane osobno, aby utrzymać niezależne stany błędu i odświeżania.
- Trwała edycja relacji wymaga uzupełnienia kontraktu backendowego.
