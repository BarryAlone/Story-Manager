<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProjectAttribute;
use Illuminate\Validation\Rule;

class ProjectAttributeController extends Controller
{
    public function index($projectId = null)
    {
        if ($projectId) {
            $projectAttributes = ProjectAttribute::where('project_id', $projectId)->get();
        } else {
            $projectAttributes = ProjectAttribute::all();
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

        $projectAttribute = ProjectAttribute::create($validated);

        return response()->json($projectAttribute, 201);
    }

    public function update(Request $request, $id)
    {
        $projectAttribute = ProjectAttribute::findOrFail($id);

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
        $projectAttribute->delete();

        return response()->json(['message' => 'Atrybut usunięty'], 200);
    }
}
