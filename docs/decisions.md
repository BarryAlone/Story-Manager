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
