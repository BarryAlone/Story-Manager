# Decyzje projektowe

## Architektura aplikacji

- Docelowym frontendem jest osobne React SPA rozwijane w katalogu `frontend/`.
- Laravel odpowiada za backend, logikę serwerową, dostęp do danych i API.
- Frontend komunikuje się z backendem przez API, a granica między warstwami ma pozostać czytelna.

## Uwierzytelnianie i sesja

- Uwierzytelnianie SPA wykorzystuje sesje cookie i Laravel Sanctum.
- Nie będą używane osobiste tokeny API ani własny mechanizm przechowywania tokenów po stronie przeglądarki.
- Ochrona API ma opierać się na sesji zalogowanego użytkownika, a dostęp do zasobów na sprawdzaniu ich właściciela.

## Model własności zasobów

- `Project.user_id` jest źródłem informacji o właścicielu projektu.
- Zasoby zależne dziedziczą właściciela przez relację z projektem; nie otrzymują osobnego `user_id`.
- Listy domenowe są filtrowane według zalogowanego użytkownika, a operacje na konkretnym zasobie są sprawdzane przez Policies.
- Dostęp zalogowanego użytkownika do cudzego zasobu zwraca `404`, aby nie ujawniać jego istnienia. Kod `403` pozostaje dla przyszłych przypadków, w których istnienie zasobu jest jawne, ale rola nie pozwala na daną operację.

## Warstwa przejściowa

- Istniejący frontend Inertia pozostaje tymczasowo, dopóki React SPA nie przejmie kompletnego przepływu rejestracji, logowania, stanu użytkownika i wylogowania.
- Po zakończeniu migracji auth warstwa Inertia ma zostać usunięta.

## Weryfikacja adresu e-mail

- Weryfikacja e-mail jest odłożona.
- Najpierw zostanie ustabilizowany podstawowy przepływ sesyjnego auth oraz autoryzacja zasobów.
