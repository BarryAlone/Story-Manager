<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Chapter;
use App\Models\Project;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ChapterController extends Controller
{
    public function index(Request $request, ?int $project = null)
    {
        if ($project) {
            $ownedProject = Project::whereKey($project)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
            $chapters = $ownedProject->chapters()->get();
        } else {
            $chapters = Chapter::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
        }

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

        Project::whereKey($validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

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
        Gate::authorize('update', $chapter);
        
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

        Project::whereKey($validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

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
        Gate::authorize('delete', $chapter);
    
        if ($chapter->chapter_image) {
            Storage::disk('public')->delete($chapter->chapter_image);
        }
        
        $chapter->delete();

        return response()->json(['message' => 'Rozdział usunięty'], 200);
    }

    public function show($id)
    {
        $chapter = Chapter::findOrFail($id);
        Gate::authorize('view', $chapter);
        
            return response()->json([
                'chapter' => $chapter,
            ], 200);
    }

    public function swap(Request $request, Chapter $chapter)
{
    Gate::authorize('update', $chapter);

    $validated = $request->validate([
        'target_id' => 'nullable|exists:chapters,id',
        'direction' => 'nullable|in:up,down',
    ]);

    // Sprawdzamy, czy w ogóle jest numer do zamiany (nie przesuwamy szkiców)
    if (!$chapter->chapter_number) {
        return response()->json(['message' => 'Szkiców nie można przesuwać.'], 400);
    }

    $targetChapter = null;

    // SCENARIUSZ A: Wybrano konkretny rozdział do zamiany (Z modala Swap)
    if ($request->filled('target_id')) {
        $targetChapter = Chapter::findOrFail($validated['target_id']);
        Gate::authorize('update', $targetChapter);
        abort_unless($targetChapter->project_id === $chapter->project_id, 404);
    } 
    // SCENARIUSZ B: Kliknięto strzałkę w górę (szukamy sąsiada wyżej)
    elseif ($request->input('direction') === 'up') {
        $targetChapter = Chapter::where('project_id', $chapter->project_id)
                                ->where('chapter_number', '<', $chapter->chapter_number)
                                ->orderBy('chapter_number', 'desc')
                                ->first();
    } 
    // SCENARIUSZ C: Kliknięto strzałkę w dół (szukamy sąsiada niżej)
    elseif ($request->input('direction') === 'down') {
        $targetChapter = Chapter::where('project_id', $chapter->project_id)
                                ->where('chapter_number', '>', $chapter->chapter_number)
                                ->orderBy('chapter_number', 'asc')
                                ->first();
    }

    if (!$targetChapter || !$targetChapter->chapter_number) {
        return response()->json(['message' => 'Nie znaleziono rozdziału do zamiany.'], 400);
    }

    // Dokonujemy zamiany numerów w bezpiecznej transakcji
    DB::transaction(function () use ($chapter, $targetChapter) {
        $tempNumber = $chapter->chapter_number;
        $chapter->update(['chapter_number' => $targetChapter->chapter_number]);
        $targetChapter->update(['chapter_number' => $tempNumber]);
    });

    return response()->json(['message' => 'Kolejność została zaktualizowana.']);
}
}
