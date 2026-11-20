<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectNote;
use App\Services\ChapterContentSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ProjectNoteController extends Controller
{
    private const TITLE_MAX_LENGTH = 160;

    public function __construct(private readonly ChapterContentSanitizer $contentSanitizer) {}

    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $notes = $project->projectNotes()
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (ProjectNote $note): array => $this->noteResponse($note, includeContent: false));

        return response()->json($notes);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);
        $validated = $request->validate($this->rules(false));
        $validated['title'] = $this->normalizeTitle($validated['title']);
        $validated['content'] = array_key_exists('content', $validated)
            ? $this->contentSanitizer->sanitize($validated['content'])
            : null;
        $validated['is_pinned'] ??= false;

        $note = DB::transaction(fn (): ProjectNote => $project->projectNotes()->create($validated));

        return response()->json($this->noteResponse($note), 201);
    }

    public function show(ProjectNote $projectNote): JsonResponse
    {
        Gate::authorize('view', $projectNote);

        return response()->json($this->noteResponse($projectNote));
    }

    public function update(Request $request, ProjectNote $projectNote): JsonResponse
    {
        Gate::authorize('update', $projectNote);
        $validated = $request->validate($this->rules(true));

        if (array_key_exists('title', $validated)) {
            $validated['title'] = $this->normalizeTitle($validated['title']);
        }
        if (array_key_exists('content', $validated)) {
            $validated['content'] = $this->contentSanitizer->sanitize($validated['content']);
        }

        DB::transaction(fn () => $projectNote->update($validated));

        return response()->json($this->noteResponse($projectNote->refresh()));
    }

    public function destroy(ProjectNote $projectNote): Response
    {
        Gate::authorize('delete', $projectNote);
        DB::transaction(fn () => $projectNote->delete());

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function rules(bool $partial): array
    {
        $titlePresence = $partial ? 'sometimes' : 'required';

        return [
            'title' => [$titlePresence, 'string', 'max:'.self::TITLE_MAX_LENGTH],
            'content' => ['sometimes', 'nullable', 'string', 'max:'.ChapterContentSanitizer::MAX_CONTENT_LENGTH],
            'is_pinned' => ['sometimes', 'boolean'],
        ];
    }

    private function normalizeTitle(string $title): string
    {
        $normalized = trim($title);
        if ($normalized === '') {
            throw ValidationException::withMessages([
                'title' => ['Tytuł notatki jest wymagany.'],
            ]);
        }

        return $normalized;
    }

    /** @return array<string, mixed> */
    private function noteResponse(ProjectNote $note, bool $includeContent = true): array
    {
        $response = [
            'id' => $note->id,
            'project_id' => $note->project_id,
            'title' => $note->title,
            'is_pinned' => $note->is_pinned,
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
        ];

        if ($includeContent) {
            $response['content'] = $note->content;
        }

        return $response;
    }
}
