<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\WorldElement;
use App\Services\PublicImageStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Throwable;

class ProjectController extends Controller
{
    public function __construct(private readonly PublicImageStorage $imageStorage)
    {
    }

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
        'project_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120'
        ]);

        $validated['user_id'] = $request->user()->id;
        $newImagePath = null;

        try {
            if ($request->hasFile('project_image')) {
                $newImagePath = $this->imageStorage->store($request->file('project_image'), 'projects');
                $validated['project_image'] = $newImagePath;
            }

            $project = DB::transaction(fn () => Project::create($validated));
        } catch (Throwable $error) {
            $this->imageStorage->delete($newImagePath);

            throw $error;
        }

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
        'project_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120'
        ]);

        $oldImagePath = $project->project_image;
        $newImagePath = null;

        try {
            if ($request->hasFile('project_image')) {
                $newImagePath = $this->imageStorage->store($request->file('project_image'), 'projects');
                $validated['project_image'] = $newImagePath;
            }

            DB::transaction(fn () => $project->update($validated));
        } catch (Throwable $error) {
            $this->imageStorage->delete($newImagePath);

            throw $error;
        }

        if ($newImagePath) {
            $this->imageStorage->delete($oldImagePath);
        }

        return response()->json($project, 200);
    }

    public function destroy($id)
    {
        $project = Project::findOrFail($id);
        Gate::authorize('delete', $project);

        $imagePaths = [
            $project->project_image,
            ...$project->characters()->whereNotNull('character_image')->pluck('character_image')->all(),
            ...$project->chapters()->whereNotNull('chapter_image')->pluck('chapter_image')->all(),
            ...$project->projectInspirations()->whereNotNull('image_path')->pluck('image_path')->all(),
            ...$project->events()->whereNotNull('event_image')->pluck('event_image')->all(),
            ...WorldElement::query()
                ->whereHas('worldElementCategory', fn ($query) => $query->where('project_id', $project->id))
                ->whereNotNull('image_path')
                ->pluck('image_path')
                ->all(),
        ];

        DB::transaction(fn () => $project->delete());
        $this->imageStorage->deleteMany($imagePaths);

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
