<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Character;
use App\Models\ProjectAttribute;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class CharacterController extends Controller
{
    public function index($projectId)
    {
        $characters = Character::where('project_id', $projectId)->get();
        $attributes = ProjectAttribute::where('project_id', $projectId)->get();
        
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
            'character_image' => 'nullable|image|max:2048', 
            'attributes' => 'nullable' 
        ]);

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
    
        if ($character->character_image) {
            Storage::disk('public')->delete($character->character_image);
        }
        
        $character->delete();

        return response()->json(['message' => 'Postać usunięta'], 200);
    }

    public function show($id)
    {
        $character = Character::findOrFail($id);
            $projectAttributes = ProjectAttribute::where('project_id', $character->project_id)->get();
        
            return response()->json([
                'character' => $character,
                'attributes' => $projectAttributes
            ], 200);
    }
}