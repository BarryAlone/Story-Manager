# Status projektu Story Manager

## Opis

Story Manager to aplikacja webowa wspierająca tworzenie książek i komiksów. Porządkuje projekty narracyjne, rozdziały, postacie, ich atrybuty i relacje, wydarzenia oraz materiały graficzne.

## Stack i architektura

- Backend: PHP 8.3, Laravel 13, Eloquent i REST API.
- Frontend docelowy: osobne SPA w katalogu `frontend/`, oparte na React 19, React Router 7, Vite 8 i Tailwind CSS 4.
- Baza deweloperska: SQLite.
- Uwierzytelnianie: sesje cookie obsługiwane przez Laravel Sanctum; tokeny API nie są planowane.
- React SPA w katalogu `frontend/` jest jedynym interfejsem użytkownika; backend nie zawiera już warstwy Inertia ani rootowego buildu frontendowego.

## Stan obszarów

### Backend

Backend udostępnia chronione API dla projektów, rozdziałów, postaci, atrybutów projektowych i relacji między postaciami. Rozdziały przechowują synopsis, właściwą treść i zwykłe notatki, rozróżniają rękopis od szkiców oraz obsługują dwupoziomową hierarchię i techniczną kolejność. HTML właściwej treści jest przed zapisem oczyszczany po stronie serwera według jawnej listy elementów i wartości stylów zgodnej z funkcjami edytora. Para postaci może mieć tylko jedną relację, niezależnie od kolejności jej końców, a właściciel może zmienić nazwę istniejącej relacji. Przepływ konta obejmuje rejestrację, logowanie, wylogowanie, pobieranie i aktualizację użytkownika, zmianę hasła, usunięcie konta oraz reset hasła z linkiem kierującym do SPA.

### Frontend

SPA zawiera główne widoki Story Managera i komunikuje się z API przez współdzielony klient. Ma ekrany logowania, rejestracji, profilu i resetowania hasła, odtwarzanie bieżącej sesji, ochronę tras na poziomie UI, prezentację zalogowanego użytkownika i wylogowanie. Główny widok jest dashboardem użytkownika z podsumowaniem, listą projektów uporządkowaną według ostatniej edycji oraz stanami ładowania, błędu i pustej listy. Rozdziały korzystają z przestrzeni roboczej z drzewem rękopisu, jednym poziomem podrozdziałów i szkicami, centralnym edytorem TinyMCE oraz nakładanym panelem edytowalnego synopsis, notatek i metadanych. Podrozdział można utworzyć z menu rodzica, a użytkownik nadaje mu lokalny numer prezentowany razem z numerem rodzica. Strukturę można porządkować myszą lub klawiaturą przez uchwyty drag-and-drop: w obrębie grup, między szkicami i rękopisem oraz przez przypisanie szkicu do rozdziału głównego. Wspólny zapis sygnalizuje stan zmian, obsługuje skrót klawiaturowy i ostrzega przed utratą niezapisanej pracy. Graf relacji ma odchudzony pasek wyszukiwania i ustawień, wielokrotny filtr typów w legendzie nakładanej na canvas oraz minimalistyczny prawy panel. Pełna lista, relacje wybranej postaci i relacja wskazana na grafie korzystają ze wspólnego rozwijanego kafelka z edycją nazwy i potwierdzanym usuwaniem.

### Uwierzytelnianie

Mechanizmem są sesje cookie i Sanctum, bez tokenów API. SPA inicjalizuje ochronę CSRF dla operacji modyfikujących, wysyła cookies do backendu oraz usuwa lokalny stan użytkownika po odpowiedzi `401`. Link resetujący przechodzi przez nazwaną trasę backendu i przekierowuje do adresu SPA określonego przez `FRONTEND_URL`. Weryfikacja adresu e-mail pozostaje poza MVP.

### Autoryzacja

Endpoint bieżącego użytkownika i wszystkie istniejące endpointy domenowe są chronione przez `auth:sanctum`. Właściciela określa `Project.user_id`, a rozdziały, postacie, atrybuty i relacje dziedziczą własność przez projekt. Listy są ograniczone do danych zalogowanego użytkownika, nowe projekty otrzymują jego identyfikator, a bezpośrednia próba dostępu do cudzego zasobu zwraca `404`.

### CI

GitHub Actions udostępnia dwa checki: pełny PHPUnit dla backendu oraz lintowanie i build React SPA. Kontrole działają dla pull requestów, pushów do `main` i uruchomień ręcznych, korzystając z izolowanej bazy SQLite w pamięci oraz zależności określonych przez lockfile.

## Działające elementy

- relacyjny model danych i migracje;
- API dla głównych zasobów narracyjnych;
- podstawowe operacje na projektach, rozdziałach, postaciach, atrybutach i relacjach;
- backendowa struktura treści rozdziałów z notatkami, rękopisem, szkicami, kolejnością i jednym poziomem podrozdziałów;
- frontendowa przestrzeń rozdziałów z numeracją głównych rozdziałów podaną przez użytkownika, tworzeniem i zwijaniem podrozdziałów, oddzielnymi szkicami i nakładanym panelem informacji;
- transakcyjne porządkowanie struktury rozdziałów przez drag-and-drop z zachowaniem numeracji, hierarchii, treści i metadanych;
- edycja właściwej treści rozdziału w TinyMCE oraz wspólny zapis treści, synopsis i notatek z ochroną niezapisanych zmian;
- osobne SPA z widokami głównych obszarów produktu;
- backendowa rejestracja, logowanie, wylogowanie i odczyt bieżącego użytkownika;
- sesyjne logowanie, rejestracja i wylogowanie w SPA wraz z ochroną tras na poziomie UI;
- zarządzanie profilem, zmiana hasła i usunięcie konta w SPA;
- żądanie resetu i ustawienie nowego hasła przez formularze SPA;
- dashboard użytkownika z liczbą projektów, wyróżnieniem ostatnio edytowanych i obsługą stanów listy;
- graf relacji z avatarami, fallbackiem inicjałów, adaptacyjnymi etykietami, wyszukiwaniem, łączonymi filtrami grupy, sąsiedztwa i wielu typów, bezpośrednimi interakcjami, lokalnym zapisem układu oraz scenariuszami wydajnościowymi dostępnymi tylko w trybie developerskim;
- serwerowa ochrona istniejących endpointów domenowych i autoryzacja właściciela zasobów;
- automatyczne kontrole backendu i React SPA w GitHub Actions;
- testy podstawowego przepływu uwierzytelniania.

## Znane ograniczenia

- wydarzenia i osobne rekordy obrazów nie mają obecnie tras API;
- pliki zapisane na dysku `public` są dostępne poza kontrolerami i nie mają prywatnej kontroli dostępu;
- część tras frontendowych i backendowych wymaga ujednolicenia;
- weryfikacja e-mail pozostaje poza MVP i nie ma interfejsu w SPA.
- SPA nie udostępnia przenoszenia podrozdziałów bezpośrednio między różnymi rodzicami ani hierarchii głębszej niż dwa poziomy.

## Ostatnia aktualizacja

2026-10-20
