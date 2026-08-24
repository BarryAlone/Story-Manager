<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Character;
use App\Models\Chapter;
use App\Models\Project;
use App\Models\ProjectAttribute;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;

class CharacterController extends Controller
{
    public function index(Request $request, ?int $project = null)
    {
        if ($project) {
            $ownedProject = Project::whereKey($project)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
            $characters = $ownedProject->characters()->get();
            $attributes = $ownedProject->projectAttributes()->get();
        } else {
            $characters = Character::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
            $attributes = ProjectAttribute::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
        }
        
        return response()->json([
            'characters' => $characters,
            'attributes' => $attributes
        ], 200);
    }

    public function store(Request $request)
    {
        $attributesInput = $request->input('attributes');

        if (!is_null($attributesInput) && !is_array($attributesInput)) {
            $decoded = json_decode($attributesInput, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $request->merge(['attributes' => $decoded]);
            } else {
                $request->merge(['attributes' => null]);
            }
        }

        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'chapter_id' => 'nullable|integer|exists:chapters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('characters')->where('project_id', $request->project_id)
            ],
            'group_name' => 'nullable|string|max:128',
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'character_image' => 'nullable|image|max:2048', 
            'attributes' => 'nullable' 
        ]);

        Project::whereKey($validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (!empty($validated['chapter_id'])) {
            $chapter = Chapter::findOrFail($validated['chapter_id']);
            Gate::authorize('view', $chapter);
            abort_unless($chapter->project_id === (int) $validated['project_id'], 404);
        }

        if ($request->hasFile('character_image')) {
            $path = $request->file('character_image')->store('characters', 'public');
            $validated['character_image'] = $path; // Do bazy zapisujemy tylko ścieżkę
        }

        $character = Character::create($validated);

        return response()->json($character, 201);
    }

    public function update(Request $request, $id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('update', $character);
        $attributesInput = $request->input('attributes');

        if (!is_null($attributesInput) && !is_array($attributesInput)) {
            $decoded = json_decode($attributesInput, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $request->merge(['attributes' => $decoded]);
            } else {
                $request->merge(['attributes' => null]);
            }
        }

        $validated = $request->validate([
            'character_id' => 'nullable|integer|exists:characters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('characters')->where('project_id', $character->project_id)->ignore($character->id)
            ],
            'group_name' => 'nullable|string|max:128',
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'character_image' => 'nullable|image|max:2048',
            'attributes' => 'nullable'
        ]);

        if ($request->hasFile('character_image')) {
            if ($character->character_image) {
                Storage::disk('public')->delete($character->character_image);
            }
            $path = $request->file('character_image')->store('characters', 'public');
            $validated['character_image'] = $path;
        }

        $character->update($validated);

        return response()->json($character, 200);
    }

    public function destroy($id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('delete', $character);
    
        if ($character->character_image) {
            Storage::disk('public')->delete($character->character_image);
        }
        
        $character->delete();

        return response()->json(['message' => 'Postać usunięta'], 200);
    }

    public function show($id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('view', $character);
            $projectAttributes = ProjectAttribute::where('project_id', $character->project_id)->get();
        
            return response()->json([
                'character' => $character,
                'attributes' => $projectAttributes
            ], 200);
    }

    public function showInProject(Request $request, int $project, int $id)
    {
        Project::whereKey($project)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $character = Character::whereKey($id)
            ->where('project_id', $project)
            ->firstOrFail();
        Gate::authorize('view', $character);

        $projectAttributes = ProjectAttribute::where('project_id', $project)->get();

        return response()->json([
            'character' => $character,
            'attributes' => $projectAttributes,
        ], 200);
    }
}
