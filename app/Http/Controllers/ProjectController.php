<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::all();
        return response()->json($projects, 200); // format json($zmienna Request, komunikat HTTP: 200 - OK)
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        'name' => 'required|string|unique:projects|max:255',
        'description' => 'nullable',
        'description_long' => 'nullable',
        'project_image' => 'nullable|string|max:255'
        ]);

        //tymczasowo przypisuję user_id na sztywno, docelowo będzie pobierane z tokena autoryzacyjnego
        $validated['user_id'] = 1;

        $project = Project::create($validated);

        return response()->json($project, 201); // 201 - CREATED
    }
} 
