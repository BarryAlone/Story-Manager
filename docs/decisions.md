# Decyzje projektowe

## Architektura aplikacji

- Docelowym frontendem jest osobne React SPA rozwijane w katalogu `frontend/`.
- Laravel odpowiada za backend, logikę serwerową, dostęp do danych i API.
- Frontend komunikuje się z backendem przez API, a granica między warstwami ma pozostać czytelna.

## Uwierzytelnianie i sesja

- Uwierzytelnianie SPA wykorzystuje sesje cookie i Laravel Sanctum.
- Nie będą używane osobiste tokeny API ani własny mechanizm przechowywania tokenów po stronie przeglądarki.
- Ochrona API ma opierać się na sesji zalogowanego użytkownika, a dostęp do zasobów na sprawdzaniu ich właściciela.

## Warstwa przejściowa

- Istniejący frontend Inertia pozostaje tymczasowo, dopóki React SPA nie przejmie kompletnego przepływu rejestracji, logowania, stanu użytkownika i wylogowania.
- Po zakończeniu migracji auth warstwa Inertia ma zostać usunięta.

## Weryfikacja adresu e-mail

- Weryfikacja e-mail jest odłożona.
- Najpierw zostanie ustabilizowany podstawowy przepływ sesyjnego auth oraz autoryzacja zasobów.
