<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CharacterRelationship;

class CharacterRelationshipController extends Controller
{
    public function index()
    {
        $characterRelationships = CharacterRelationship::all();
        return response()->json($characterRelationships, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        
        'character_1_id' => 'required|integer|exists:characters,id',
        'character_2_id' => 'required|integer|exists:characters,id|different:character_1_id',
        'relation_name' => 'required|string|max:128'
        ]);

        $characterRelationship = CharacterRelationship::create($validated);

        return response()->json($characterRelationship, 201);
    }

    public function update(Request $request, $id)
    {
        $relationship = CharacterRelationship::findOrFail($id);

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
        
        $relationship->delete();

        return response()->json(['message' => 'Relacja usunięta pomyślnie'], 200);
    }
}
