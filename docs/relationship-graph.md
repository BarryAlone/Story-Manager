# Moduł grafu relacji

Kod funkcji znajduje się w `frontend/src/features/relationships/`. Pliki `frontend/src/RelationshipList.jsx` i `frontend/src/RelationshipGraph.jsx` są wyłącznie zgodnymi wstecznie punktami wejścia.

## Główne elementy

- `RelationshipsPage` składa stronę, formularz, listę i przestrzeń roboczą.
- `RelationshipWorkspace` łączy wspólny toolbar, nakładany panel narzędzi i canvas z interaktywną legendą.
- `useRelationshipCrud` obsługuje pobieranie postaci i relacji oraz ich tworzenie, zmianę nazwy i usuwanie.
- `useRelationshipGraphData` pobiera dane grafu albo ładuje scenariusz developerski.
- `useRelationshipGraphController` przechowuje lokalny stan filtrów, zaznaczenia, hovera, trybu panelu, tworzenia relacji i widoku rozszerzonego.
- `RelationshipCanvas` konfiguruje `ForceGraph2D`, cache obrazów, kamerę oraz zdarzenia wskaźnika.
- `relationshipGraphDrawing` zawiera funkcje rysujące avatary, inicjały, etykiety i opisy relacji.
- `GraphFilters` udostępnia kontrolki zakresu i grupy, a `RelationshipLegend` obsługuje wielokrotny wybór typów relacji. `SelectionDetails`, `RelationshipForm` i `RelationshipListPanel` odpowiadają za zawartość panelu narzędzi.
- `RelationshipCard` jest wspólnym, rozwijanym kafelkiem pełnej listy, relacji wybranej postaci i relacji wskazanej na grafie.
- `CharacterCombobox` obsługuje wyszukiwanie postaci w grafie.
- `RelationshipIconButton` zapewnia lokalne przyciski ikonowe z etykietami i tooltipami dla panelu, widoku rozszerzonego oraz resetu układu.

## Układ przestrzeni roboczej

Ten sam górny toolbar jest renderowany w zwykłym i rozszerzonym widoku. Po lewej zawiera wyszukiwanie, przełącznik `Cały graf | Sąsiedztwo`, osobny wybór grupy i ikonową akcję czyszczenia filtrów z licznikiem, a po prawej liczniki, scenariusz developerski i sterowanie widokiem. Klikalny licznik relacji otwiera pełną listę w istniejącym panelu. Pionowa, przezroczysta legenda znajduje się przy lewej krawędzi canvasa i służy jako filtr jednego lub wielu typów relacji. Panel jest pozycjonowany absolutnie nad prawą częścią canvasa, dlatego jego otwarcie nie zmienia wymiarów grafu ani nie uruchamia ponownie symulacji. Wąski przełącznik jest przytwierdzony do bocznej krawędzi panelu i przesuwa się razem z nim, a reset układu pozostaje wyżej na canvasie i po otwarciu panelu znajduje się pod jego warstwą.

Panel ma jedno źródło stanu w kontrolerze i przechodzi między trybami: zamknięty, szczegóły postaci, wybór celu, formularz tworzenia, szczegóły istniejącej relacji oraz pełna lista. Lista jest otwierana przez licznik i ma własny scroll. Tylko jeden kafelek relacji może być rozwinięty, a niezapisana zmiana nazwy blokuje przypadkowe przełączenie kontekstu do czasu zapisu, anulowania lub użycia `Escape`.

## Przepływ danych

Dla rzeczywistych danych `useRelationshipGraphData` pobiera równolegle postacie i relacje z endpointów projektu. `buildRelationshipGraphData` zamienia odpowiedź API na węzły i krawędzie używane przez `ForceGraph2D`. Osobne pobranie w `useRelationshipCrud` zasila formularze i dostępną listę HTML. Po utworzeniu, zmianie nazwy albo usunięciu relacji dane listy są pobierane ponownie, a zmiana `graphRevision` odświeża graf.

## Filtrowanie i zaznaczenie

`filterGraphData` jest czystą funkcją działającą poza Reactem. Stosuje kolejno filtr grupy, zbiór wybranych typów relacji i bezpośrednie sąsiedztwo. Pusty zbiór typów oznacza wszystkie relacje, a każda widoczna krawędź zawsze ma oba widoczne końce. Kontroler wylicza również podświetlenia hovera i zaznaczenia bez modyfikowania danych źródłowych.

Legenda jest budowana z danych po filtrze grupy i zakresu, ale przed filtrem typu. Dzięki temu pozostałe opcje nie znikają po aktywowaniu jednego wpisu, zwykłe kliknięcia dodają lub usuwają kolejne typy, a `aria-pressed` przekazuje stan także użytkownikom klawiatury i technologii asystujących. Po aktywowaniu filtra wybrane typy pozostają wyraźne, a pozostałe są przygaszone. Ikonowa akcja obok wyboru grupy czyści frazę, grupę, typy oraz przywraca pełny zakres.

Kliknięcie węzła zmienia zaznaczenie bez poruszania kamery. Jawny wybór wyniku wyszukiwania może wycentrować postać, a widok sąsiedztwa zgłasza żądanie `zoomToFit`; canvas wykonuje szybkie kadrowanie oraz końcowe dopasowanie po zatrzymaniu symulacji. Zmiana hovera nie tworzy nowych danych grafu i nie uruchamia kadrowania.

## Renderowanie canvas

`RelationshipCanvas` przekazuje do `ForceGraph2D` stabilny, wcześniej przefiltrowany zestaw danych. Funkcje z `relationshipGraphDrawing` rysują okrągły obraz albo inicjały, adaptacyjną etykietę postaci oraz etykietę aktywnej relacji. Obiekty `Image` są przechowywane w cache według URL i nie są tworzone ponownie w każdej klatce. Osobne, szersze obszary wykrywania ułatwiają wskazywanie węzłów i cienkich linii.

Podczas wyboru celu `onRenderFramePost` dorysowuje statyczną, przerywaną linię między źródłem a postacią pod kursorem. Po wyborze celu linia korzysta z tych samych obiektów węzłów do czasu zapisu lub anulowania. Nie jest częścią `graphData`, więc nie trafia do API, listy, filtrów, `localStorage` ani symulacji. Dla pary z istniejącą relacją podgląd nie jest rysowany; kontroler wyróżnia zapisane połączenie i pokazuje komunikat w panelu.

## Dane rzeczywiste i scenariusze developerskie

Scenariusze 100/200 są generowane deterministycznie przez `relationshipGraphScenarios.js`. Import generatora i kontrolki scenariuszy są chronione przez `import.meta.env.DEV`. Dane syntetyczne nie są wysyłane do API, a formularz mutacji jest w tym trybie zastąpiony komunikatem tylko do odczytu. Sposób uruchomienia opisuje `docs/relationship-graph-scenarios.md`.

## Tworzenie i edycja relacji

Nowa relacja rozpoczyna się przez ponowne kliknięcie zaznaczonej postaci, wybór innej postaci jako celu i ręczne zatwierdzenie istniejącego formularza w tym samym panelu. Kontroler grafu przechowuje etap tego przepływu, a `Escape` lub anulowanie cofają o jeden etap. Zapis korzysta z istniejącego `POST /api/character-relationships`, przesyła identyfikatory dwóch różnych postaci i nazwę relacji, a błędy `422` pokazuje przy odpowiednich polach. SPA i backend traktują parę postaci jako nieuporządkowaną i blokują kolejną relację również wtedy, gdy jej końce podano w odwrotnej kolejności. Usunięcie korzysta z `DELETE /api/character-relationships/{id}` i wymaga potwierdzenia.

Kliknięcie istniejącej relacji rozwija wspólny kafelek bez względu na to, czy wejście nastąpiło z pełnej listy, relacji postaci czy linii na grafie. Edycja wysyła wyłącznie nazwę do `PATCH /api/character-relationships/{relationship}`; anulowanie odrzuca szkic i zwija kafelek, a usunięcie nadal wymaga potwierdzenia.

## Ograniczenia

- Pozycje węzłów są zapisywane lokalnie dla użytkownika i projektu, bez synchronizacji między urządzeniami.
- Kolory są deterministycznie wyliczane z nazwy typu relacji i nie są przechowywane w bazie.
- Lista HTML i graf pobierają dane osobno, aby utrzymać niezależne stany błędu i odświeżania.
