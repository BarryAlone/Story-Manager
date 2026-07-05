<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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
        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('projects')
        ],
        'description' => 'nullable|string',
        'description_long' => 'nullable|string',
        'project_image' => 'nullable|image|max:255'
        ]);

        if ($request->hasFile('project_image')) {
            $path = $request->file('project_image')->store('projects', 'public');
            $validated['project_image'] = $path; // Do bazy zapisujemy tylko ścieżkę
        }

        //tymczasowo przypisuję user_id na sztywno, docelowo będzie pobierane z tokena autoryzacyjnego
        $validated['user_id'] = 1;

        $project = Project::create($validated);

        return response()->json($project, 201); // 201 - CREATED
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);
        $validated = $request->validate([
        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('projects')->ignore($id) // added ignore($id to prevent unique validation for id in form 
        ],
        'description' => 'nullable|string',
        'description_long' => 'nullable|string',
        'project_image' => 'nullable|image|max:255'
        ]);

        if ($request->hasFile('project_image')) {
            if ($project->project_image) {
                Storage::disk('public')->delete($project->project_image);
            }
            $path = $request->file('project_image')->store('projects', 'public');
            $validated['project_image'] = $path;
        }

        $project->update($validated);

        return response()->json($project, 200);
    }

    public function destroy($id)
    {
        $project = Project::findOrFail($id);
    
        if ($project->project_image) {
            Storage::disk('public')->delete($project->project_image);
        }
        
        $project->delete();

        return response()->json(['message' => 'Projekt usunięty'], 200);
    }

    public function show($id)
    {
        $project = Project::findOrFail($id);
        
            return response()->json([
                'project' => $project
            ], 200);
    }
} 
