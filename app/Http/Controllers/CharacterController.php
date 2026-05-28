<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Character;
use Illuminate\Validation\Rule;

class CharacterController extends Controller
{
    public function index()
    {
        $characters = Character::all();
        return response()->json($characters, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        'project_id' => 'required|integer|exists:projects,id',

        'chapter_id' => 'nullable|integer|exists:chapters,id',

        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('characters')->where('project_id', $request->project_id)
            ],

        'description' =>'nullable|string',
        'character_image' => 'nullable|string',
        'attributes' => 'nullable|array' 
        ]);

        $character = Character::create($validated);

        return response()->json($character, 201);
    }
}
