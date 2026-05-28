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
}
