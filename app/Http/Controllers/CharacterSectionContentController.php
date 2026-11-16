<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\CharacterSectionContent;
use App\Models\CharacterSectionDefinition;
use App\Services\ChapterContentSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CharacterSectionContentController extends Controller
{
    public function __construct(
        private readonly ChapterContentSanitizer $contentSanitizer,
    ) {}

    public function index(Character $character): JsonResponse
    {
        Gate::authorize('view', $character);

        $definitions = $character->project
            ->characterSectionDefinitions()
            ->with(['contents' => fn ($query) => $query->where('character_id', $character->id)])
            ->get();

        return response()->json($definitions->map(function (CharacterSectionDefinition $definition): array {
            $content = $definition->contents->first();

            return [
                'id' => $definition->id,
                'title' => $definition->title,
                'sort_order' => $definition->sort_order,
                'content_id' => $content?->id,
                'content' => $content?->content,
            ];
        }));
    }

    public function upsert(
        Request $request,
        Character $character,
        CharacterSectionDefinition $definition,
    ): JsonResponse {
        Gate::authorize('view', $character);
        Gate::authorize('view', $definition);
        $this->ensureSameProject($character, $definition);

        $validated = $request->validate([
            'content' => [
                'required',
                'string',
                'max:'.ChapterContentSanitizer::MAX_CONTENT_LENGTH,
            ],
        ]);
        $sanitizedContent = $this->contentSanitizer->sanitize($validated['content']);

        if (! $this->hasMeaningfulContent($sanitizedContent)) {
            throw ValidationException::withMessages([
                'content' => ['Treść sekcji po oczyszczeniu jest pusta. Użyj operacji usuwania, aby wyczyścić sekcję.'],
            ]);
        }

        $existingContent = CharacterSectionContent::query()
            ->where('character_id', $character->id)
            ->where('character_section_definition_id', $definition->id)
            ->first();

        $existingContent
            ? Gate::authorize('update', $existingContent)
            : Gate::authorize('create', [CharacterSectionContent::class, $character]);

        $content = DB::transaction(function () use (
            $character,
            $definition,
            $existingContent,
            $sanitizedContent,
        ): CharacterSectionContent {
            $content = $existingContent ?? new CharacterSectionContent([
                'character_id' => $character->id,
                'character_section_definition_id' => $definition->id,
            ]);
            $content->content = $sanitizedContent;
            $content->save();

            return $content;
        });

        return response()->json($this->contentResponse($content), $existingContent ? 200 : 201);
    }

    public function destroy(
        Character $character,
        CharacterSectionDefinition $definition,
    ): Response {
        Gate::authorize('view', $character);
        Gate::authorize('view', $definition);
        $this->ensureSameProject($character, $definition);

        $content = CharacterSectionContent::query()
            ->where('character_id', $character->id)
            ->where('character_section_definition_id', $definition->id)
            ->first();

        if ($content) {
            Gate::authorize('delete', $content);
            DB::transaction(fn () => $content->delete());
        }

        return response()->noContent();
    }

    private function ensureSameProject(
        Character $character,
        CharacterSectionDefinition $definition,
    ): void {
        if ((int) $character->project_id !== (int) $definition->project_id) {
            throw ValidationException::withMessages([
                'definition' => ['Definicja sekcji i postać muszą należeć do tego samego projektu.'],
            ]);
        }
    }

    private function hasMeaningfulContent(?string $html): bool
    {
        if ($html === null) {
            return false;
        }

        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $textWithoutWhitespace = preg_replace('/[\s\p{Z}\x{00a0}]+/u', '', $text);

        return $textWithoutWhitespace !== null && $textWithoutWhitespace !== '';
    }

    /** @return array<string, mixed> */
    private function contentResponse(CharacterSectionContent $content): array
    {
        return [
            'id' => $content->id,
            'character_section_definition_id' => $content->character_section_definition_id,
            'character_id' => $content->character_id,
            'content' => $content->content,
            'created_at' => $content->created_at,
            'updated_at' => $content->updated_at,
        ];
    }
}
