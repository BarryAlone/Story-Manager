# Rejestr zmian

Kolejne wpisy należy dodawać na początku pliku według układu: data, zakres, wynik i testy.

## 2026-08-24 — GitHub Actions CI

- Zakres: workflow dla pull requestów, pushów do `main` i uruchomień ręcznych, obejmujący backend Laravel, docelowe React SPA i tymczasowy frontend Inertia.
- Wynik: dodano trzy niezależne kontrole z minimalnymi uprawnieniami, anulowaniem starszych uruchomień, instalacją zależności z lockfile oraz SQLite w pamięci dla testów backendowych.
- Testy: pełny PHPUnit zakończony powodzeniem — 45 testów i 243 asercje; lint i build React SPA oraz build Inertia zakończone powodzeniem. Build SPA nadal zgłasza nieblokujące ostrzeżenie o chunku większym niż 500 kB.

## 2026-08-21 — Autoryzacja zasobów domenowych

- Zakres: ochrona istniejących tras domenowych przez `auth:sanctum`, własność projektów, dziedziczona własność zasobów zależnych, filtrowanie list i Policies dla operacji bezpośrednich.
- Wynik: gość otrzymuje `401`, zalogowany użytkownik widzi i modyfikuje tylko własne dane, nowe projekty otrzymują jego `user_id`, a dostęp do cudzego zasobu zwraca `404`.
- Testy: celowany zestaw autoryzacji zakończony powodzeniem — 11 testów i 114 asercji; pełny PHPUnit zakończony powodzeniem — 45 testów i 243 asercje. Frontend nie był zmieniany, więc lintowania i buildu nie uruchamiano.

## 2026-08-18 — Rejestracja w React SPA

- Zakres: publiczna trasa i formularz rejestracji, sesja cookie, inicjalizacja CSRF, walidacja `422` oraz przejścia między logowaniem i rejestracją.
- Wynik: poprawna rejestracja zapisuje użytkownika w stanie auth i otwiera chronioną część aplikacji; po błędzie hasła są czyszczone, a nazwa i e-mail pozostają w formularzu.
- Testy: `npm run lint` i `npm run build` zakończone powodzeniem; 15 backendowych testów auth zakończonych powodzeniem, 80 asercji.

## 2026-08-18 — Menu użytkownika w nagłówku

- Zakres: dostępne menu rozwijane otwierane przez avatar w obu layoutach SPA.
- Wynik: nazwa i e-mail są widoczne w menu razem z wylogowaniem; menu zamyka się po ponownym kliknięciu, kliknięciu poza nim, użyciu `Escape` i poprawnym wylogowaniu.
- Testy: `npm run lint` i `npm run build` zakończone powodzeniem; interakcje menu pozostawiono do ręcznej weryfikacji w przeglądarce.

## 2026-08-18 — Sesyjne uwierzytelnianie w React SPA

- Zakres: klient API, inicjalizacja CSRF, logowanie, odtwarzanie sesji, ochrona tras na poziomie UI, bieżący użytkownik i wylogowanie.
- Wynik: docelowe SPA korzysta z sesji cookie i Sanctum; endpointy domenowe oraz autoryzacja właściciela pozostają poza zakresem tej zmiany.
- Testy: `npm run lint` i `npm run build` zakończone powodzeniem; 15 backendowych testów auth zakończonych powodzeniem, 80 asercji.

## 2026-08-18 — Dokumentacja bazowa

- Zakres: status projektu, zadania, decyzje architektoniczne, rejestr zmian i obsługa prywatnych notatek.
- Wynik: utworzono minimalny zestaw dokumentacji opisujący aktualny stan oraz ustaloną kolejność prac.
- Testy: nie uruchamiano testów aplikacji; zmiany dotyczą wyłącznie dokumentacji i konfiguracji ignorowanych plików.

---

## RRRR-MM-DD — Nazwa zadania

- Zakres:
- Wynik:
- Testy:
