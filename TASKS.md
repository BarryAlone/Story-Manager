# Zadania

## Teraz

- [ ] Ujednolicić niespójne trasy między SPA i API.

## Następne

- [ ] Dodać kierunkowość relacji jako osobny kontrakt danych i interfejs.

## Później

- [ ] Zaplanować kontrolowany dostęp do plików obrazów przed wprowadzeniem prywatnych materiałów.
- [ ] Po MVP zdecydować, czy i kiedy wdrożyć weryfikację adresu e-mail.

## Zakończone

- [x] Utworzono bazową strukturę backendu i API dla głównych zasobów.
- [x] Dodano podstawowy backendowy przepływ rejestracji, logowania, wylogowania i bieżącego użytkownika.
- [x] Zintegrowano sesyjne uwierzytelnianie cookie + Sanctum z React SPA, obejmując logowanie, bieżącego użytkownika, ochronę widoków i wylogowanie.
- [x] Dodano rejestrację użytkownika w React SPA wraz z obsługą walidacji formularza.
- [x] Zabezpieczono endpointy domenowe i powiązano projekty oraz zasoby zależne z zalogowanym właścicielem.
- [x] Dodano GitHub Actions CI dla backendowego PHPUnit oraz lintowania i buildu React SPA.
- [x] Przekształcono główny widok projektów w dashboard zalogowanego użytkownika.
- [x] Przeniesiono profil, zmianę hasła, usunięcie konta i reset hasła do React SPA.
- [x] Usunięto przejściowy frontend Inertia, jego zależności i rootowy build oraz pozostawiono React SPA jako jedyny interfejs.
- [x] Dodano dwukolumnową przestrzeń roboczą grafu relacji: avatary, wspólny combobox, widok sąsiedztwa, filtry, interakcje bezpośrednie, tryb rozszerzony i lokalne scenariusze 100/200 postaci.
- [x] Dodano lokalne zapisywanie i resetowanie układu grafu osobno dla użytkownika, projektu i scenariusza developerskiego.
- [x] Dodano etapowy wybór źródła i celu relacji bezpośrednio na grafie, z anulowaniem, obsługą `Escape` i ochroną przed duplikowaniem par postaci.
- [x] E1: Ukończono spójny interfejs grafu relacji obejmujący odchudzony toolbar, legendę-filtr na canvasie i kontekstowy prawy panel.
- [x] T2: Ujednolicono szczegóły, formularz i pełną listę relacji w jednym kontekstowym panelu grafu.
- [x] T4: Dodano tymczasową linię podglądu podczas wyboru i zatwierdzania nowej relacji.
- [x] Dodano właścicielską zmianę nazwy relacji w API i podłączono ją do wspólnego kafelka edycji w SPA.
- [x] E2: Dodano backendowy model treści i dwupoziomowej struktury rozdziałów z migracją istniejących danych.
- [x] E2: Dodano frontendową przestrzeń roboczą rozdziałów z drzewem rękopisu, szkicami i panelem informacji.
- [x] E2: Dodano edycję treści rozdziału w TinyMCE, wspólny zapis synopsis i notatek oraz serwerową sanitację HTML.
- [x] E2: Dodano tworzenie, zwijanie, edycję i usuwanie jednego poziomu podrozdziałów z lokalną numeracją użytkownika.
- [x] E2: Dodano transakcyjne porządkowanie rękopisu, podrozdziałów i szkiców metodą drag-and-drop.
- [x] Potwierdzono podstawowy przepływ auth zestawem 15 testów i 80 asercji.
- [x] Utworzono bazową dokumentację statusu, decyzji, zadań i rejestru zmian.
