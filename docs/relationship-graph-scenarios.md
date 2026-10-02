# Lokalne scenariusze grafu relacji

Scenariusze służą wyłącznie do ręcznej oceny czytelności i płynności grafu. Dane są generowane deterministycznie w przeglądarce, nie są wysyłane do API ani zapisywane w bazie. Kontrolki i generator są dostępne tylko przez serwer developerski Vite; build produkcyjny ignoruje parametr scenariusza i korzysta z rzeczywistych danych.

## Uruchomienie

1. Uruchom backend i React SPA zgodnie z `README.md`.
2. Zaloguj się i wybierz istniejący projekt należący do użytkownika.
3. Otwórz jeden z poniższych adresów, zastępując `{projectId}` identyfikatorem projektu. Scenariusze można też przełączać listą „Scenariusz” nad grafem.

| Scenariusz | Adres | Węzły | Relacje |
| --- | --- | ---: | ---: |
| 100 postaci, graf rzadki | `/project/{projectId}/relationships?graphScenario=100-sparse` | 100 | 100 |
| 100 postaci, graf gęstszy | `/project/{projectId}/relationships?graphScenario=100-dense` | 100 | 500 |
| 200 postaci, graf rzadki | `/project/{projectId}/relationships?graphScenario=200-sparse` | 200 | 200 |
| 200 postaci, graf gęstszy | `/project/{projectId}/relationships?graphScenario=200-dense` | 200 | 1000 |

Usunięcie parametru `graphScenario` albo wybranie „Dane API” przywraca graf projektu. Pasek nad grafem pokazuje bieżącą liczbę węzłów i relacji oraz oznacza dane testowe.

W trybie testowym wyszukiwanie, widok bezpośrednich relacji oraz filtry typu i grupy działają na danych syntetycznych. Operacje tworzenia, edycji i usuwania są ukryte albo zastąpione informacją „tylko odczyt”, więc przełączanie scenariuszy nie zapisuje danych projektu.

## Ręczna ocena

- Porównaj płynność przeciągania, przesuwania i zoomowania we wszystkich czterech scenariuszach.
- Sprawdź, czy przy oddaleniu pozostają tylko priorytetowe etykiety, a po przybliżeniu pojawiają się nazwy postaci i typy relacji.
- Kliknij kilka węzłów i sprawdź wyróżnienie oraz dane wybranej postaci w panelu bocznym.
- Zwiń panel, rozszerz graf i dwukrotnie użyj `Escape`: pierwszy raz do zamknięcia panelu, drugi do wyjścia z widoku rozszerzonego.
- Wyszukaj postać klawiaturą, wybierz wynik i sprawdź wycentrowanie, przybliżenie oraz panel szczegółów.
- Włącz widok bezpośrednich relacji, a następnie filtry typu i grupy; kontroluj liczniki widocznych elementów oraz pusty stan.
- Najedź na postać i relację, sprawdzając wyróżnienie sąsiadów, pogrubienie linii i opis końców relacji.
- Kliknij relację i sprawdź panel tylko do odczytu; w scenariuszu syntetycznym nie mogą być dostępne operacje zapisu.
- Potwierdź czytelność inicjałów, linii i legendy na jasnym tle.
- Wróć do rzeczywistych danych i sprawdź postać z obrazem, postać bez obrazu oraz niedostępny URL obrazu.
