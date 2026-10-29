<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectInspiration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProjectInspirationController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->ownedProject($request, $project);

        return response()->json(
            $project->projectInspirations()->latest()->get()
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
                $imagePath = $request->file('image')->store('project-inspirations', 'public');
                $validated['image_path'] = $imagePath;
            }

            unset($validated['image'], $validated['remove_image']);

            $inspiration = DB::transaction(
                fn () => $project->projectInspirations()->create($validated)
            );
        } catch (Throwable $error) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $error;
        }

        return response()->json($inspiration->fresh(), 201);
    }

    public function show(ProjectInspiration $projectInspiration): JsonResponse
    {
        Gate::authorize('view', $projectInspiration);

        return response()->json($projectInspiration);
    }

    public function update(Request $request, ProjectInspiration $projectInspiration): JsonResponse
    {
        Gate::authorize('update', $projectInspiration);
        $this->normalizeText($request);

        $validated = $this->validatePayload($request, true);
        $removeImage = $request->boolean('remove_image');
        $hasNewImage = $request->hasFile('image');
        $nextTitle = array_key_exists('title', $validated) ? $validated['title'] : $projectInspiration->title;
        $nextContent = array_key_exists('content', $validated) ? $validated['content'] : $projectInspiration->content;
        $willHaveImage = $hasNewImage || ($projectInspiration->image_path && ! $removeImage);

        $this->ensureNotEmpty($nextTitle, $nextContent, (bool) $willHaveImage);

        $oldImagePath = $projectInspiration->image_path;
        $newImagePath = null;

        try {
            if ($hasNewImage) {
                $newImagePath = $request->file('image')->store('project-inspirations', 'public');
                $validated['image_path'] = $newImagePath;
            } elseif ($removeImage) {
                $validated['image_path'] = null;
            }

            unset($validated['image'], $validated['remove_image']);

            DB::transaction(function () use ($projectInspiration, $validated) {
                $projectInspiration->update($validated);
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

        return response()->json($projectInspiration->fresh());
    }

    public function destroy(ProjectInspiration $projectInspiration): Response
    {
        Gate::authorize('delete', $projectInspiration);

        $imagePath = $projectInspiration->image_path;
        $projectInspiration->delete();

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
            'inspiration' => ['Uzupełnij tytuł, treść albo dodaj zdjęcie.'],
        ]);
    }
}
