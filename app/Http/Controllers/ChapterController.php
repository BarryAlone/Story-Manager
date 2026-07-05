<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Chapter;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class ChapterController extends Controller
{
    public function index()
    {
        $chapters = Chapter::all();
        return response()->json($chapters, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        'project_id' => 'required|integer|exists:projects,id',

        'chapter_number' => [
            'nullable',
            'integer',
            Rule::unique('chapters')->where('project_id', $request->project_id)
            ],
        
        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('chapters')->where('project_id', $request->project_id)
        ],
    
        'description' => 'nullable|string',
        'description_long' => 'nullable|string',
        'chapter_image' => 'nullable|image|max:2048',
        'timeline_point_start' => 'nullable|integer',
        'timeline_point_end' => 'nullable|integer',
        'display_label' => 'nullable|string'
        ]);

        if ($request->hasFile('chapter_image')) {
            $path = $request->file('chapter_image')->store('chapters', 'public');
            $validated['chapter_image'] = $path;
        }

        $chapter = Chapter::create($validated);
        
        return response()->json($chapter, 201);
    }

    public function update(Request $request, $id)
    {
        $chapter = Chapter::findOrFail($id);
        
        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',

        'chapter_number' => [
            'nullable',
            'integer',
            Rule::unique('chapters')->where('project_id', $request->project_id)->ignore($id)
            ],
        
        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('chapters')->where('project_id', $request->project_id)->ignore($id)
        ],
    
        'description' => 'nullable|string',
        'description_long' => 'nullable|string',
        'chapter_image' => 'nullable|image|max:2048',
        'timeline_point_start' => 'nullable|integer',
        'timeline_point_end' => 'nullable|integer',
        'display_label' => 'nullable|string'
        ]);

        if ($request->hasFile('chapter_image')) {
            if ($chapter->chapter_image) {
                Storage::disk('public')->delete($chapter->chapter_image);
            }
            $path = $request->file('chapter_image')->store('chapters', 'public');
            $validated['chapter_image'] = $path;
        }

        $chapter->update($validated);

        return response()->json($chapter, 200);
    }

    public function destroy($id)
    {
        $chapter = Chapter::findOrFail($id);
    
        if ($chapter->chapter_image) {
            Storage::disk('public')->delete($chapter->chapter_image);
        }
        
        $chapter->delete();

        return response()->json(['message' => 'Rozdział usunięty'], 200);
    }

    public function show($id)
    {
        $chapter = Chapter::findOrFail($id);
        
            return response()->json([
                'chapter' => $chapter,
            ], 200);
    }
}
