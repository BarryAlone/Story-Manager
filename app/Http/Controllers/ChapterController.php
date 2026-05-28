<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Chapter;
use Illuminate\Validation\Rule;

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
        'chapter_image' => 'nullable|string',
        'timeline_point_start' => 'nullable|integer',
        'timeline_point_end' => 'nullable|integer',
        'display_label' => 'nullable|string'
        ]);

        $chapter = Chapter::create($validated);
        
        return response()->json($chapter, 201);
    }
}
