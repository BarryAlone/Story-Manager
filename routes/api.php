<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ChapterController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\CharacterRelationshipController;
use App\Http\Controllers\ProjectAttributeController;

//Project
Route::get('/projects', [ProjectController::class, 'index']);

Route::post('/projects', [ProjectController::class, 'store']);

Route::get('/projects/{project}/characters', [CharacterController::class, 'index']);

//Chapter
Route::get('/chapters', [ChapterController::class, 'index']);

Route::post('/chapters', [ChapterController::class, 'store']);

Route::get('/chapters/{project}/chapters', [ChapterController::class, 'index']);

//Character
Route::get('/characters', [CharacterController::class, 'index']);

Route::post('/characters', [CharacterController::class, 'store']);

Route::delete('/characters/{id}', [CharacterController::class, 'destroy']);

Route::put('/characters/{id}', [CharacterController::class, 'update']);

Route::get('/projects/{project}/characters/{id}', [CharacterController::class, 'index']);

Route::get('/characters/{id}', [CharacterController::class, 'show']);

//ProjectAttribute
Route::get('/project-attributes', [ProjectAttributeController::class, 'index']);

Route::post('/project-attributes', [ProjectAttributeController::class, 'store']);

Route::get('/projects/{projectId}/attributes', [ProjectAttributeController::class, 'index']);

Route::put('/project-attributes/{id}', [ProjectAttributeController::class, 'update']);

Route::delete('/project-attributes/{id}', [ProjectAttributeController::class, 'destroy']);

//CharacterRelationship

Route::get('/projects/{project}/character-relationships', [CharacterRelationshipController::class, 'index']);

Route::post('/character-relationships', [CharacterRelationshipController::class, 'store']);

Route::delete('/character-relationships/{id}', [CharacterRelationshipController::class, 'destroy']);


