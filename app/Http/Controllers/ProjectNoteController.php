<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProjectNoteController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->ownedProject($request, $project);

        return response()->json(
            $project->projectNotes()->latest()->get()
        );
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->ownedProject($request, $project);
        $this->normalizeText($request);

        $validated = $this->validatePayload($request);
        $this->ensureNotEmpty(
            $validated['title'] ?? null,
            $validated['content'] ?? null,
            $request->hasFile('image')
        );

        $imagePath = null;

        try {
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('project-notes', 'public');
                $validated['image_path'] = $imagePath;
            }

            unset($validated['image'], $validated['remove_image']);

            $note = DB::transaction(
                fn () => $project->projectNotes()->create($validated)
            );
        } catch (Throwable $error) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $error;
        }

        return response()->json($note->fresh(), 201);
    }

    public function show(ProjectNote $projectNote): JsonResponse
    {
        Gate::authorize('view', $projectNote);

        return response()->json($projectNote);
    }

    public function update(Request $request, ProjectNote $projectNote): JsonResponse
    {
        Gate::authorize('update', $projectNote);
        $this->normalizeText($request);

        $validated = $this->validatePayload($request, true);
        $removeImage = $request->boolean('remove_image');
        $hasNewImage = $request->hasFile('image');
        $nextTitle = array_key_exists('title', $validated) ? $validated['title'] : $projectNote->title;
        $nextContent = array_key_exists('content', $validated) ? $validated['content'] : $projectNote->content;
        $willHaveImage = $hasNewImage || ($projectNote->image_path && ! $removeImage);

        $this->ensureNotEmpty($nextTitle, $nextContent, (bool) $willHaveImage);

        $oldImagePath = $projectNote->image_path;
        $newImagePath = null;

        try {
            if ($hasNewImage) {
                $newImagePath = $request->file('image')->store('project-notes', 'public');
                $validated['image_path'] = $newImagePath;
            } elseif ($removeImage) {
                $validated['image_path'] = null;
            }

            unset($validated['image'], $validated['remove_image']);

            DB::transaction(function () use ($projectNote, $validated) {
                $projectNote->update($validated);
            });
        } catch (Throwable $error) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $error;
        }

        if ($oldImagePath && ($newImagePath || $removeImage)) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return response()->json($projectNote->fresh());
    }

    public function destroy(ProjectNote $projectNote): Response
    {
        Gate::authorize('delete', $projectNote);

        $imagePath = $projectNote->image_path;
        $projectNote->delete();

        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->noContent();
    }

    private function ownedProject(Request $request, Project $project): Project
    {
        abort_unless($project->user_id === $request->user()->id, 404);

        return $project;
    }

    private function normalizeText(Request $request): void
    {
        foreach (['title', 'content', 'source'] as $field) {
            if (! $request->exists($field)) {
                continue;
            }

            $value = $request->input($field);

            if (is_string($value)) {
                $value = trim($value);
                $request->merge([$field => $value === '' ? null : $value]);
            }
        }
    }

    /** @return array<string, mixed> */
    private function validatePayload(Request $request, bool $updating = false): array
    {
        $presence = $updating ? 'sometimes|' : '';

        return $request->validate([
            'title' => $presence.'nullable|string|max:120',
            'content' => $presence.'nullable|string|max:10000',
            'source' => $presence.'nullable|string|max:500',
            'image' => $presence.'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'remove_image' => $presence.'nullable|boolean',
        ]);
    }

    private function ensureNotEmpty(?string $title, ?string $content, bool $hasImage): void
    {
        if ($title || $content || $hasImage) {
            return;
        }

        throw ValidationException::withMessages([
            'note' => ['Uzupełnij tytuł, treść albo dodaj zdjęcie.'],
        ]);
    }
}
