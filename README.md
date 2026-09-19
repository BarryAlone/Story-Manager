# Story Manager

Story Manager to aplikacja wspierająca organizowanie projektów narracyjnych: książek, komiksów, rozdziałów, postaci, ich atrybutów i relacji.

## Architektura

- Backend: PHP 8.3, Laravel 13, Eloquent i JSON API.
- Frontend: React 19 SPA w katalogu `frontend/`, budowane przez Vite 8.
- Baza deweloperska: SQLite.
- Uwierzytelnianie: sesje cookie i Laravel Sanctum, bez tokenów API.

Katalog `frontend/` zawiera jedyny interfejs użytkownika. Laravel odpowiada za API, sesję, CSRF, autoryzację zasobów i przekierowanie linku resetowania hasła do SPA.

## Aktualny zakres

Aplikacja obsługuje logowanie, rejestrację, wylogowanie, odtwarzanie sesji, profil użytkownika, zmianę hasła, usunięcie konta oraz żądanie i wykonanie resetu hasła. Endpointy domenowe są chronione, a dane projektów są ograniczone do właściciela.

Weryfikacja adresu e-mail pozostaje poza aktualnym MVP.

## Wymagania

- PHP 8.3 lub nowsze w ramach wersji 8.x;
- Composer 2;
- Node.js 24 i npm — wersja Node używana również w CI;
- wymagane rozszerzenia PHP, w tym SQLite.

## Instalacja lokalna

W katalogu głównym repozytorium:

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan storage:link
npm --prefix frontend ci
```

Domyślna konfiguracja korzysta z SQLite. Przed migracją upewnij się, że istnieje plik `database/database.sqlite`.

## Konfiguracja adresów

Utwórz lokalny plik `frontend/.env`:

```ini
VITE_API_URL=http://localhost:8000
```

W głównym `.env` ustaw odpowiednio:

```ini
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

SPA i backend muszą używać tej samej nazwy hosta. Używaj konsekwentnie wszędzie `localhost` albo wszędzie `127.0.0.1`; mieszanie tych nazw uniemożliwia prawidłową obsługę cookies sesji i `XSRF-TOKEN`. Jeśli wybierzesz `127.0.0.1`, zmień wszystkie trzy powyższe adresy.

Lokalnych plików `.env` nie należy dodawać do Git.

## Uruchamianie

Backend:

```bash
php artisan serve --host=localhost --port=8000
```

React SPA, w osobnym terminalu:

```bash
npm --prefix frontend run dev -- --host localhost
```

SPA będzie dostępne pod `http://localhost:5173`.

## Testy i kontrola jakości

Pełne testy backendu:

```bash
./vendor/bin/phpunit --do-not-cache-result
```

Lint i produkcyjny build React SPA:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

GitHub Actions wykonuje te kontrole dla pull requestów, pushów do `main` oraz uruchomień ręcznych.

## Dodatkowa dokumentacja

- `PROJECT_STATUS.md` — aktualny stan implementacji i ograniczenia;
- `TASKS.md` — krótka kolejka prac;
- `docs/decisions.md` — decyzje architektoniczne;
- `docs/worklog.md` — rejestr wykonanych zmian.
