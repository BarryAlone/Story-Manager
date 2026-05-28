<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProjectAttribute;
use Illuminate\Validation\Rule;

class ProjectAttributeController extends Controller
{
    public function index()
    {
        $projectAttributes = ProjectAttribute::all();
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
}
