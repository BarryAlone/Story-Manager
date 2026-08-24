<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = $request->user()->projects()->get();
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

        $validated['user_id'] = $request->user()->id;

        $project = Project::create($validated);

        return response()->json($project, 201); // 201 - CREATED
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);
        Gate::authorize('update', $project);
        $validated = $request->validate([
        'name' => [
            'required',
            'string',
            'max:255',
            Rule::unique('projects')->ignore($id) // added ignore($id to prevent unique validation for id in form 
        ],
        'description' => 'nullable|string',
        'description_long' => 'nullable|string',
        'project_image' => 'nullable|image|max:2048'
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
        Gate::authorize('delete', $project);
    
        if ($project->project_image) {
            Storage::disk('public')->delete($project->project_image);
        }
        
        $project->delete();

        return response()->json(['message' => 'Projekt usunięty'], 200);
    }

    public function show($id)
    {
        $project = Project::findOrFail($id);
        Gate::authorize('view', $project);
        
            return response()->json([
                'project' => $project
            ], 200);
    }
} 
