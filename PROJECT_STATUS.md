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

SPA zawiera główne widoki Story Managera i komunikuje się z API. Nie ma jeszcze kompletnej integracji sesyjnego logowania, stanu bieżącego użytkownika, ochrony widoków i wylogowania.

### Uwierzytelnianie

Docelowym mechanizmem są sesje cookie i Sanctum. Podstawowe testy backendowe uwierzytelniania zakończyły się wynikiem 15 zaliczonych testów i 80 asercji. Weryfikacja adresu e-mail jest odłożona.

### Autoryzacja

Endpoint bieżącego użytkownika jest chroniony przez `auth:sanctum`. Endpointy domenowe pozostają obecnie publiczne. Nie wdrożono jeszcze sprawdzania właściciela projektu ani autoryzacji zasobów powiązanych.

## Działające elementy

- relacyjny model danych i migracje;
- API dla głównych zasobów narracyjnych;
- podstawowe operacje na projektach, rozdziałach, postaciach, atrybutach i relacjach;
- osobne SPA z widokami głównych obszarów produktu;
- backendowa rejestracja, logowanie, wylogowanie i odczyt bieżącego użytkownika;
- testy podstawowego przepływu uwierzytelniania.

## Znane ograniczenia

- SPA nie korzysta jeszcze w pełni z sesyjnego uwierzytelniania;
- endpointy domenowe nie wymagają zalogowania;
- brak autoryzacji właściciela projektów i zasobów powiązanych;
- tworzenie projektu nadal przypisuje `user_id = 1`;
- część tras frontendowych i backendowych wymaga ujednolicenia;
- Inertia dubluje część warstwy frontendowej i ma zostać usunięta po przejęciu auth przez SPA;
- weryfikacja e-mail nie należy do bieżącego zakresu.

## Ostatnia aktualizacja

2026-08-18
