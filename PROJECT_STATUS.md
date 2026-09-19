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

Backend udostępnia chronione API dla projektów, rozdziałów, postaci, atrybutów projektowych i relacji między postaciami. Przepływ konta obejmuje rejestrację, logowanie, wylogowanie, pobieranie i aktualizację użytkownika, zmianę hasła, usunięcie konta oraz reset hasła z linkiem kierującym do SPA.

### Frontend

SPA zawiera główne widoki Story Managera i komunikuje się z API przez współdzielony klient. Ma ekrany logowania, rejestracji, profilu i resetowania hasła, odtwarzanie bieżącej sesji, ochronę tras na poziomie UI, prezentację zalogowanego użytkownika i wylogowanie. Główny widok jest dashboardem użytkownika z podsumowaniem, listą projektów uporządkowaną według ostatniej edycji oraz stanami ładowania, błędu i pustej listy.

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
- osobne SPA z widokami głównych obszarów produktu;
- backendowa rejestracja, logowanie, wylogowanie i odczyt bieżącego użytkownika;
- sesyjne logowanie, rejestracja i wylogowanie w SPA wraz z ochroną tras na poziomie UI;
- zarządzanie profilem, zmiana hasła i usunięcie konta w SPA;
- żądanie resetu i ustawienie nowego hasła przez formularze SPA;
- dashboard użytkownika z liczbą projektów, wyróżnieniem ostatnio edytowanych i obsługą stanów listy;
- serwerowa ochrona istniejących endpointów domenowych i autoryzacja właściciela zasobów;
- automatyczne kontrole backendu i React SPA w GitHub Actions;
- testy podstawowego przepływu uwierzytelniania.

## Znane ograniczenia

- wydarzenia i osobne rekordy obrazów nie mają obecnie tras API;
- pliki zapisane na dysku `public` są dostępne poza kontrolerami i nie mają prywatnej kontroli dostępu;
- część tras frontendowych i backendowych wymaga ujednolicenia;
- weryfikacja e-mail pozostaje poza MVP i nie ma interfejsu w SPA.

## Ostatnia aktualizacja

2026-09-20
