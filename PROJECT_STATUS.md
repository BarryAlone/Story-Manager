# Status projektu Story Manager

## Opis

Story Manager to aplikacja webowa wspierająca tworzenie książek i komiksów. Porządkuje projekty narracyjne, rozdziały, postacie, ich atrybuty i relacje, wydarzenia oraz materiały graficzne.

## Stack i architektura

- Backend: PHP 8.3, Laravel 13, Eloquent i REST API.
- Frontend docelowy: osobne SPA w katalogu `frontend/`, oparte na React 19, React Router 7, Vite 8 i Tailwind CSS 4.
- Baza deweloperska: SQLite.
- Uwierzytelnianie: sesje cookie obsługiwane przez Laravel Sanctum; tokeny API nie są planowane.
- Warstwa Inertia pozostaje przejściowo na potrzeby istniejącego przepływu uwierzytelniania.

## Stan obszarów

### Backend

Backend udostępnia API dla projektów, rozdziałów, postaci, atrybutów projektowych i relacji między postaciami. Podstawowy przepływ rejestracji, logowania, wylogowania i pobierania bieżącego użytkownika jest zaimplementowany.

### Frontend

SPA zawiera główne widoki Story Managera i komunikuje się z API przez współdzielony klient. Ma podstawowy ekran logowania, odtwarzanie bieżącej sesji, ochronę tras na poziomie UI, prezentację zalogowanego użytkownika i wylogowanie.

### Uwierzytelnianie

Mechanizmem są sesje cookie i Sanctum, bez tokenów API. SPA inicjalizuje ochronę CSRF, wysyła cookies do backendu i usuwa lokalny stan użytkownika po odpowiedzi `401`. Podstawowe testy backendowe uwierzytelniania zakończyły się wynikiem 15 zaliczonych testów i 80 asercji. Weryfikacja adresu e-mail jest odłożona.

### Autoryzacja

Endpoint bieżącego użytkownika jest chroniony przez `auth:sanctum`. Endpointy domenowe pozostają obecnie publiczne. Nie wdrożono jeszcze sprawdzania właściciela projektu ani autoryzacji zasobów powiązanych.

## Działające elementy

- relacyjny model danych i migracje;
- API dla głównych zasobów narracyjnych;
- podstawowe operacje na projektach, rozdziałach, postaciach, atrybutach i relacjach;
- osobne SPA z widokami głównych obszarów produktu;
- backendowa rejestracja, logowanie, wylogowanie i odczyt bieżącego użytkownika;
- podstawowa integracja sesyjnego auth w SPA wraz z ochroną tras na poziomie UI;
- testy podstawowego przepływu uwierzytelniania.

## Znane ograniczenia

- endpointy domenowe nie wymagają zalogowania;
- brak autoryzacji właściciela projektów i zasobów powiązanych;
- tworzenie projektu nadal przypisuje `user_id = 1`;
- ochrona tras SPA nie zastępuje zabezpieczenia endpointów ani autoryzacji danych;
- pełny przepływ cookie i CSRF wymaga jeszcze ręcznej weryfikacji w przeglądarce;
- część tras frontendowych i backendowych wymaga ujednolicenia;
- Inertia dubluje część warstwy frontendowej i ma zostać usunięta po przejęciu auth przez SPA;
- weryfikacja e-mail nie należy do bieżącego zakresu.

## Ostatnia aktualizacja

2026-08-18
