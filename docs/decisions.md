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

## Warstwa interfejsu

- React SPA w katalogu `frontend/` jest jedynym interfejsem użytkownika i obsługuje rejestrację, logowanie, stan użytkownika, profil oraz resetowanie hasła.
- Warstwa Inertia, jej zależności i rootowy build frontendowy zostały usunięte po zapewnieniu równoważnych funkcji w SPA.
- Nazwana trasa backendowa resetu hasła pozostaje mostem wymaganym przez Laravel Password Broker i przekierowuje do skonfigurowanego adresu SPA.

## Weryfikacja adresu e-mail

- Weryfikacja e-mail pozostaje poza zakresem MVP.
- SPA nie otrzymuje na tym etapie interfejsu weryfikacji, a trasy produktu nie korzystają z middleware `verified`.
- Powrót do tej funkcji wymaga osobnej decyzji produktowej po ustabilizowaniu MVP.

## Struktura rozdziałów

- `description` pozostaje synopsisem, `description_long` właściwą treścią, a `notes` przechowuje zwykłe notatki.
- Hierarchia ma maksymalnie dwa poziomy: element najwyższego poziomu i jego bezpośrednie dzieci. Rodzic i dziecko muszą należeć do tego samego projektu oraz tej samej sekcji; zachowanie hierarchii w szkicach pozwala przenosić cały rozdział bez utraty struktury.
- `chapter_number` jest numerem nadawanym przez użytkownika, wyświetlanym bez przeliczania i stanowiącym podstawową kolejność rozdziałów rękopisu.
- `chapter_number` podrozdziału jest dodatnim lokalnym numerem nadawanym przez użytkownika. Interfejs łączy go z numerem rodzica, np. lokalny numer `2` pod rodzicem `3` wyświetla jako `3.2`.
- Numer główny jest unikalny wśród głównych rozdziałów projektu, a numer lokalny podrozdziału tylko wśród dzieci tego samego rodzica. Luki są dozwolone i usunięcie elementu nie przenumerowuje pozostałych.
- `sort_order` pozostaje technicznym polem struktury i kolejnością zapasową dla elementów bez właściwego numeru; nie zastępuje numeracji użytkownika. Listy rękopisu są prezentowane rosnąco według `chapter_number`.
- Zmiana struktury przez drag-and-drop korzysta z jednej autoryzowanej operacji transakcyjnej. Przy zmianie kolejności rękopisu zachowywany jest istniejący uporządkowany zestaw numerów, który zostaje przypisany elementom zgodnie z nową pozycją; szkice zachowują przechowywane numery poza aktywną numeracją.
- Rozdział posiadający dzieci nie jest usuwany kaskadowo. API blokuje taką operację odpowiedzią `409 Conflict`, dopóki dzieci nie zostaną przeniesione lub usunięte jawnie.

## Treść HTML rozdziałów

- Właściwa treść rozdziału pozostaje HTML-em w polu `description_long` i jest edytowana w SPA przez TinyMCE Cloud bez dodatków premium i bez obrazów osadzanych w treści.
- TinyMCE działa jako komponent niekontrolowany: React przechowuje stan zmiany, a HTML jest pobierany z instancji dopiero podczas jawnego zapisu.
- Backend oczyszcza nową i aktualizowaną treść przez `symfony/html-sanitizer` według jawnej listy obejmującej akapity, nagłówki, podstawowe formatowanie, listy, cytaty, łamania wiersza i bezpieczne odnośniki.
- Style czcionki, rozmiaru, interlinii, wyrównania, wcięcia i kolorów są zachowywane wyłącznie dla wartości udostępnionych przez edytor. Pozostałe właściwości CSS, skrypty, ramki, atrybuty zdarzeń i niebezpieczne schematy adresów nie są zapisywane. Istniejące rekordy nie są przepisywane migracją.

## Elementy świata

- Kategorie elementów świata są przechowywane w `world_element_categories`, a należące do nich obiekty w `world_elements`.
- Własność elementu wynika z kategorii i projektu; element nie otrzymuje osobnego `project_id` ani `user_id`.
- Nazwa kategorii jest unikalna w projekcie bez uwzględniania wielkości liter i otaczających spacji. Nazwy elementów mogą się powtarzać.
- Obecny system atrybutów postaci pozostaje oddzielony od pierwszego etapu elementów świata. Wspólne definicje i wartości atrybutów wymagają osobnego kontraktu i migracji zachowującej istniejące dane.
- Element świata przechowuje jeden opcjonalny `image_path`. API zapisuje pliki w `world-elements/` przez `PublicImageStorage`, usuwa zastępowane pliki dopiero po udanym zapisie bazy i sprząta obrazy elementów podczas usuwania projektu. Galerie pozostają poza tym etapem.
- Kategorie „Lokalizacje”, „Przedmioty” i „Magia” nie powstają automatycznie. Przyszły interfejs pokaże je jako propozycje wymagające świadomej akcji użytkownika.
- API nie usuwa kategorii zawierającej elementy i zwraca wtedy `409 Conflict`; kaskada bazy pozostaje potrzebna wyłącznie do usuwania całego projektu oraz operacji infrastrukturalnych.

## Wspólny system atrybutów

- Definicje atrybutów postaci i kategorii elementów świata korzystają ze wspólnej tabeli `attribute_definitions`; ich zakres rozróżniają `target_type`, kategoria i techniczny `scope_key`.
- Nazwa definicji jest unikalna po normalizacji w obrębie zakresu: całego projektu dla postaci albo pojedynczej kategorii dla elementów świata.
- Wartości postaci i elementów świata korzystają ze wspólnej tabeli `attribute_values`. Dokładnie jedna encja i dokładnie jedna kolumna wartości muszą być ustawione.
- MVP obsługuje typy `text` i `number`; liczby są przechowywane jako `DECIMAL(20,6)`, bez użycia typu zmiennoprzecinkowego.
- Starsze `project_attributes` i JSON `characters.attributes` pozostają tymczasowo bez zmian. Dane testowe nie są migrowane, a stary mechanizm zostanie usunięty dopiero po przełączeniu API i formularzy.
- Definicje są zarządzane przez jedno API z dwoma kontekstami: projekt określa zakres postaci, a kategoria określa zakres elementów świata. Klient nie może ustawiać pól zakresu ani kolejności.
- Typ używanej definicji nie jest automatycznie konwertowany. Zmiana typu i zwykłe usunięcie są blokowane odpowiedzią `409`, jeśli istnieją wartości; wymuszone usunięcie wymaga jawnego `force=true` i usuwa wartości kaskadowo.
- Nowe definicje otrzymują kolejny `sort_order` w swoim zakresie. Ręczne porządkowanie definicji pozostaje poza bieżącym etapem.
- Synchronizacja wartości przyjmuje pełną mapę `definition_id => value` dla jednej encji. Wartość `null`, pusty tekst, tekst złożony z białych znaków oraz pominięcie definicji usuwają jej dotychczasową wartość. Brak całego pola `attribute_values` oznacza, że kontroler nie wywołuje synchronizacji i pozostawia wartości bez zmian.
- Cały payload jest walidowany przed zapisem, a zapis odbywa się w jednej transakcji. Postać może używać wyłącznie definicji `character` swojego projektu, a element świata wyłącznie definicji `world_element` swojego projektu i bieżącej kategorii.
- Tekst ma limit 10 000 znaków. Liczby są przyjmowane jako liczby całkowite albo zwykłe ciągi dziesiętne, mają najwyżej 14 cyfr części całkowitej i 6 miejsc po przecinku oraz są normalizowane bez użycia `float`, zgodnie z `DECIMAL(20,6)`.
- API encji przyjmuje `attribute_values` jako obiekt w żądaniu JSON, a w `multipart/form-data` jako string zawierający obiekt JSON. Brak pola zachowuje wartości, obecna mapa jest pełną synchronizacją, a `{}` usuwa wszystkie wartości encji.
- Szczegóły, utworzenie i aktualizacja encji zwracają `attribute_values` jako obiekt `definition_id => value`; liczby pozostają stringami. Lekkie listy nie dołączają wartości.
- Dane encji i wartości są zapisywane w jednej transakcji. Nowy obraz jest sprzątany po dowolnym błędzie, a poprzedni plik jest usuwany dopiero po powodzeniu całej transakcji.
