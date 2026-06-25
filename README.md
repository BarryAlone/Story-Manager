# Story Manager

![Status](https://img.shields.io/badge/Status-In_Development_(MVP)-orange)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=flat&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)

Zaawansowane narzędzie dla pisarzy i twórców do zarządzania światem przedstawionym, postaciami oraz linią czasu wydarzeń. Projekt realizowany jako część pracy inżynierskiej oraz osobisty projekt MVP.

---

## Spis treści
1. [O projekcie](#-o-projekcie)
2. [Architektura i Technologie](#-architektura-i-technologie)
3. [Status Projektu i Roadmapa](#-status-projektu-i-roadmapa)
4. [Uruchomienie Lokalne (Development)](#-uruchomienie-lokalne-development)

---

## O projekcie
Story Manager to aplikacja webowa rozwiązująca problem zarządzania skomplikowaną strukturą opowieści i światów fikcyjnych. Zastępuje dziesiątki luźnych notatek i plików tekstowych jednym, spójnym systemem relacyjnym. 

**Główne możliwości (Core Features):**
* Zarządzanie wieloma projektami (światami) i ich rozdziałami.
* Rozbudowane profile postaci z konfigurowalnymi atrybutami, globalnymi dla danego projektu.
* Dodawanie avatara do danego elementu projektu, oraz obrazów pomocniczych pełniących funkcję galerii.
* Moduł Osi Czasu pozwalający na chronologiczne układanie wydarzeń.
* Graf relaci postaci reprezentujący typy relacji między postaciami. 

---

## Architektura i Technologie
Aplikacja została zbudowana w architekturze rozdzielonej (Headless/API-First).

* **Frontend:** React.js
* **Backend:** Laravel (PHP) działający jako REST API
* **Baza danych:** SQLite (wersja deweloperska)
* **Autoryzacja:** Laravel Sanctum (Token-based authentication - *W trakcie wdrażania*)

---

## Status Projektu i Roadmapa
Projekt jest w fazie aktywnego rozwoju. Obecna wersja to MVP 1.0 skupiająca się na architekturze bazy danych oraz dowiezieniem minimalnej wersji frontendu.

- [x] Projekt relacyjnej bazy danych i wdrożenie migracji (Laravel).
- [x] Opracowanie logiki relacji Wiele-do-Wielu oraz powiązań między elementami projektu.
- [x] Wstępne połączenie backendu z frontendem, aby móc działać na danych z bazy oraz testować API.
- [x] Wprowadzenie seederów do generowania danych testowych.  
- [ ] Zmiana statycznego przypisywania `user_id` na uwierzytelnianie przez tokeny (Sanctum).
- [ ] Pełna integracja formularzy React z nowymi endpointami API.
- [ ] Stworzenie funkcjonalnej i skalowalnej wersji grafu relacji.
- [ ] Stworzenie w pełni funkcjonalnej (zgodnej z założeniami projektu) wersji osi czasu.
- [ ] Deployment wersji demonstracyjnej.

> **Ważna uwaga dla testujących:** Obecnie system logowania jest wstrzymany na rzecz prac nad architekturą. Interfejs automatycznie przypisuje testowego użytkownika o ID 1.

---

## Uruchomienie Lokalne (Development)

Instrukcja uruchomienia dwóch osobnych środowisk na maszynie deweloperskiej.

### Wymagania (Prerequisites)
* Node.js & npm
* PHP (min. 8.1) & Composer

### Krok 1: Backend (Laravel API)
```bash
# Sklonuj repozytorium i przejdź do folderu backendu
git clone [https://github.com/TwojaNazwa/Story-Manager.git](https://github.com/TwojaNazwa/Story-Manager.git)
cd Story-Manager/backend

# Zainstaluj zależności i przygotuj plik środowiskowy
composer install
cp .env.example .env
php artisan key:generate

# Zbuduj i zasiej bazę danych testowymi danymi
php artisan migrate:fresh --seed

# Uruchom serwer API
php artisan serve
```

---

## Skrypty w aplikacji
*Sekcja zostanie w pełni uzupełniona po ostatecznej konfiguracji środowiska.*

**Frontend (React):**
* `npm start` - Uruchamia aplikację w trybie deweloperskim.
* `npm run build` - Buduje zoptymalizowaną aplikację gotową na produkcję.
* `npm run dev` - Uruchamia frontend. NALEŻY GO URUCHOMIĆ BĘDĄC W FOLDERZE 'frontend' PROJEKTU

**Backend (Laravel):**
* `php artisan serve` - Uruchamia lokalny serwer testowy.
* `php artisan migrate:fresh --seed` - Resetuje bazę danych i wypełnia ją danymi testowymi.

---

> **SEKCJE W PRZYGOTOWANIU (Wdrożenie po fazie MVP)** 🚧

## Wersja Live (Live Demo)
Wersja demonstracyjna (produkcyjna) nie jest jeszcze dostępna publicznie. Link pojawi się tutaj po zakończeniu prac nad integracją API i bezpiecznym systemem autoryzacji (Sanctum).

## Dostępy (Test Credentials)
Gdy aplikacja zostanie opublikowana, w tym miejscu znajdą się dane do specjalnego konta testowego (Demo User), które umożliwi rekruterom i testerom szybkie sprawdzenie funkcjonalności bez konieczności rejestracji.

## Co zostało zrobione?
*(Zostanie zaktualizowane przed publikacją. Obecnie postęp prac można śledzić w sekcji "Status Projektu i Roadmapa").*

## Plany na przyszłość (Future Features)
Poza realizacją głównych celów MVP z Roadmapy, w przyszłości rozważane jest dodanie:
* Unowoczesnienie i aktualizacja UX/UI
* Dodanie modułu AI do rozpoznawania obrazów w celu automatycznej kategoryzacji atrybutów/opisów
* Automatyczne generowanie konspektu/edycja tekstu (krok w stronę klasycznych managerów tekstowych dla podonych projektów)
---

## Kontakt
Projekt tworzony z pasją. Jeśli masz pytania, sugestie lub chcesz porozmawiać o kodzie, zapraszam do kontaktu:

* **GitHub:** [@BarryAlone](https://github.com/BarryAlone) 
* **LinkedIn:** [Kacper Chwałkowski](https://www.linkedin.com/in/kacper-chwalkowski-836148337/)
* **Email:** kac.chw.1994@gmail.com