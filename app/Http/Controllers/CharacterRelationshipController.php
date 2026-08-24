<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CharacterRelationship;
use App\Models\Character;
use App\Models\Project;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CharacterRelationshipController extends Controller
{
    public function index(Request $request, int $project)
    {
        $ownedProject = Project::whereKey($project)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $characterRelationships = CharacterRelationship::whereHas(
            'character1',
            fn ($query) => $query->where('project_id', $ownedProject->id)
        )->whereHas(
            'character2',
            fn ($query) => $query->where('project_id', $ownedProject->id)
        )->get();
        return response()->json($characterRelationships, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        
        'character_1_id' => 'required|integer|exists:characters,id',
        'character_2_id' => 'required|integer|exists:characters,id|different:character_1_id',
        'relation_name' => 'required|string|max:128'
        ]);

        $firstCharacter = Character::findOrFail($validated['character_1_id']);
        $secondCharacter = Character::findOrFail($validated['character_2_id']);
        Gate::authorize('view', $firstCharacter);
        Gate::authorize('view', $secondCharacter);

        if ($firstCharacter->project_id !== $secondCharacter->project_id) {
            throw ValidationException::withMessages([
                'character_2_id' => ['Postacie muszą należeć do tego samego projektu.'],
            ]);
        }

        $characterRelationship = CharacterRelationship::create($validated);

        return response()->json($characterRelationship, 201);
    }

    public function update(Request $request, $id)
    {
        $relationship = CharacterRelationship::findOrFail($id);
        Gate::authorize('update', $relationship);

        $validated = $request->validate([
            'character_1_id' => 'required|integer|exists:characters,id',
            // Laravel sprawdza, czy character_2_id istnieje i czy jest RÓŻNE od character_1_id
            'character_2_id' => 'required|integer|exists:characters,id|different:character_1_id',
            'relation_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $relationship->update($validated);

        return response()->json($relationship, 200);
    }

    public function destroy($id)
    {
        $relationship = CharacterRelationship::findOrFail($id);
        Gate::authorize('delete', $relationship);
        
        $relationship->delete();

        return response()->json(['message' => 'Relacja usunięta pomyślnie'], 200);
    }
}
