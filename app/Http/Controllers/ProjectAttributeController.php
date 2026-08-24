<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProjectAttribute;
use App\Models\Project;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Gate;

class ProjectAttributeController extends Controller
{
    public function index(Request $request, ?int $projectId = null)
    {
        if ($projectId) {
            $project = Project::whereKey($projectId)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
            $projectAttributes = $project->projectAttributes()->get();
        } else {
            $projectAttributes = ProjectAttribute::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
        }

        return response()->json($projectAttributes, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
        'project_id' => 'required|integer|exists:projects,id',
        'type' => 'required|string',
        'name' => [
            'string',
            'required',
            'max:128',
            Rule::unique('project_attributes')->where('project_id', $request->project_id)
            ]
        ]);

        Project::whereKey($validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $projectAttribute = ProjectAttribute::create($validated);

        return response()->json($projectAttribute, 201);
    }

    public function update(Request $request, $id)
    {
        $projectAttribute = ProjectAttribute::findOrFail($id);
        Gate::authorize('update', $projectAttribute);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:128',
                Rule::unique('project_attributes')
                    ->where('project_id', $projectAttribute->project_id)
                    ->ignore($projectAttribute->id)
            ],
            'type' => 'required|string'
        ]);

        $projectAttribute->update($validated);

        return response()->json($projectAttribute, 200);
    }

    public function destroy($id)
    {
        $projectAttribute = ProjectAttribute::findOrFail($id);
        Gate::authorize('delete', $projectAttribute);
        $projectAttribute->delete();

        return response()->json(['message' => 'Atrybut usunięty'], 200);
    }
}
