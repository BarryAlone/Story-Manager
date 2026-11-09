<?php

use App\Http\Controllers\AttributeDefinitionController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ChapterController;
use App\Http\Controllers\ChapterStructureController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\CharacterRelationshipController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectInspirationController;
use App\Http\Controllers\WorldElementCategoryController;
use App\Http\Controllers\WorldElementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Project
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::get('/projects/{project}/characters', [CharacterController::class, 'index']);
    Route::put('/projects/{id}', [ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

    // WorldElementCategory
    Route::get('/projects/{project}/world-element-categories', [WorldElementCategoryController::class, 'index']);
    Route::post('/projects/{project}/world-element-categories', [WorldElementCategoryController::class, 'store']);
    Route::patch('/world-element-categories/{category}', [WorldElementCategoryController::class, 'update']);
    Route::delete('/world-element-categories/{category}', [WorldElementCategoryController::class, 'destroy']);

    // WorldElement
    Route::get('/world-element-categories/{category}/world-elements', [WorldElementController::class, 'index']);
    Route::post('/world-element-categories/{category}/world-elements', [WorldElementController::class, 'store']);
    Route::get('/world-elements/{element}', [WorldElementController::class, 'show']);
    Route::patch('/world-elements/{element}', [WorldElementController::class, 'update']);
    Route::delete('/world-elements/{element}', [WorldElementController::class, 'destroy']);

    // Shared attribute definitions
    Route::get('/projects/{project}/character-attribute-definitions', [AttributeDefinitionController::class, 'indexCharacters']);
    Route::post('/projects/{project}/character-attribute-definitions', [AttributeDefinitionController::class, 'storeCharacter']);
    Route::get('/world-element-categories/{category}/attribute-definitions', [AttributeDefinitionController::class, 'indexWorldElements']);
    Route::post('/world-element-categories/{category}/attribute-definitions', [AttributeDefinitionController::class, 'storeWorldElement']);
    Route::patch('/attribute-definitions/{definition}', [AttributeDefinitionController::class, 'update']);
    Route::delete('/attribute-definitions/{definition}', [AttributeDefinitionController::class, 'destroy']);

    // ProjectInspiration
    Route::get('/projects/{project}/inspirations', [ProjectInspirationController::class, 'index']);
    Route::post('/projects/{project}/inspirations', [ProjectInspirationController::class, 'store']);
    Route::get('/project-inspirations/{projectInspiration}', [ProjectInspirationController::class, 'show']);
    Route::patch('/project-inspirations/{projectInspiration}', [ProjectInspirationController::class, 'update']);
    Route::delete('/project-inspirations/{projectInspiration}', [ProjectInspirationController::class, 'destroy']);

    // Chapter
    Route::get('/chapters', [ChapterController::class, 'index']);
    Route::post('/chapters', [ChapterController::class, 'store']);
    Route::get('/chapters/{project}/chapters', [ChapterController::class, 'index']);
    Route::put('/chapters/{id}', [ChapterController::class, 'update']);
    Route::get('/chapters/{id}', [ChapterController::class, 'show']);
    Route::delete('/chapters/{id}', [ChapterController::class, 'destroy']);
    Route::post('/chapters/{chapter}/swap', [ChapterController::class, 'swap']);
    Route::patch('/projects/{project}/chapter-structure', [ChapterStructureController::class, 'update']);

    // Character
    Route::get('/characters', [CharacterController::class, 'index']);
    Route::post('/characters', [CharacterController::class, 'store']);
    Route::delete('/characters/{id}', [CharacterController::class, 'destroy']);
    Route::put('/characters/{id}', [CharacterController::class, 'update']);
    Route::get('/projects/{project}/characters/{id}', [CharacterController::class, 'showInProject']);
    Route::get('/characters/{id}', [CharacterController::class, 'show']);

    // CharacterRelationship
    Route::get('/projects/{project}/character-relationships', [CharacterRelationshipController::class, 'index']);
    Route::post('/character-relationships', [CharacterRelationshipController::class, 'store']);
    Route::patch('/character-relationships/{relationship}', [CharacterRelationshipController::class, 'update']);
    Route::delete('/character-relationships/{id}', [CharacterRelationshipController::class, 'destroy']);

    // User
    Route::get('/user', function (Request $request) {
        return response()->json(
            $request->user()->only(['id', 'name', 'email'])
        );
    });
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::delete('/profile', [ProfileController::class, 'destroy']);
    Route::put('/password', [PasswordController::class, 'update']);
});
