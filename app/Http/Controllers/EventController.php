<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;


class EventController extends Controller
{
    public function index($projectId)
    {
        $events = Event::where('project_id', $projectId)->get();
    
        return response()->json([
            'events' => $events,
        ], 200);
    }

    public function store(Request $request)
    {
        
        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'chapter_id' => 'nullable|integer|exists:chapters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('events')->where('project_id', $request->project_id)
            ],
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'event_image' => 'nullable|image|max:2048',
            'timeline_point_start' => 'nullable|integer',
            'timeline_point_end' => 'nullable|integer',
            'display_label' => 'nullable|string'
        ]);

        if ($request->hasFile('event_image')) {
            $path = $request->file('event_image')->store('events', 'public');
            $validated['event_image'] = $path; 
        }

        $event = Event::create($validated);

        return response()->json($event, 201);
    }

    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'chapter_id' => 'nullable|integer|exists:chapters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('events')->where('project_id', $request->project_id)->ignore($event->id) // added ignore($event->id) to prevent validation errors in form 
            ],
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'event_image' => 'nullable|image|max:2048',
            'timeline_point_start' => 'nullable|integer',
            'timeline_point_end' => 'nullable|integer',
            'display_label' => 'nullable|string'
        ]);

        if ($request->hasFile('event_image')) {
            $path = $request->file('event_image')->store('events', 'public');
            $validated['event_image'] = $path;
        }

        $event->update($validated);

        return response()->json($event, 200);
    }

    public function destroy($id)
    {
        $event = Event::findOrFail($id);
    
        if ($event->event_image) {
            Storage::disk('public')->delete($event->event_image);
        }
        
        $event->delete();

        return response()->json(['message' => 'Wydarzenie usunięte'], 200);
    }

    public function show($id)
    {
        $event = Event::findOrFail($id);
            
            return response()->json([
                'event' => $event,
            ], 200);
    }
}