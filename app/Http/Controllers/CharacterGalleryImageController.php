<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\CharacterGalleryImage;
use App\Services\PublicImageStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Throwable;

class CharacterGalleryImageController extends Controller
{
    public function __construct(private readonly PublicImageStorage $imageStorage) {}

    public function index(Character $character): JsonResponse
    {
        Gate::authorize('viewAny', [CharacterGalleryImage::class, $character]);

        return response()->json(
            $character->galleryImages->map(fn (CharacterGalleryImage $image): array => $this->imageResponse($image))
        );
    }

    public function store(Request $request, Character $character): JsonResponse
    {
        Gate::authorize('create', [CharacterGalleryImage::class, $character]);
        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'caption' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $caption = $this->normalizeCaption($validated['caption'] ?? null);
        $imagePath = null;

        try {
            $imagePath = $this->imageStorage->store($request->file('image'), 'character-gallery');

            $galleryImage = DB::transaction(function () use ($caption, $character, $imagePath): CharacterGalleryImage {
                $sortOrder = ($character->galleryImages()->max('sort_order') ?? -1) + 1;

                return $character->galleryImages()->create([
                    'image_path' => $imagePath,
                    'caption' => $caption,
                    'sort_order' => $sortOrder,
                ]);
            });
        } catch (Throwable $error) {
            $this->imageStorage->delete($imagePath);

            throw $error;
        }

        return response()->json($this->imageResponse($galleryImage), 201);
    }

    public function update(Request $request, CharacterGalleryImage $galleryImage): JsonResponse
    {
        Gate::authorize('update', $galleryImage);
        $validated = $request->validate([
            'caption' => ['present', 'nullable', 'string', 'max:255'],
        ]);

        DB::transaction(fn () => $galleryImage->update([
            'caption' => $this->normalizeCaption($validated['caption']),
        ]));

        return response()->json($this->imageResponse($galleryImage->refresh()));
    }

    public function reorder(Request $request, Character $character): JsonResponse
    {
        Gate::authorize('reorder', [CharacterGalleryImage::class, $character]);
        $validated = $request->validate([
            'image_ids' => ['present', 'array'],
            'image_ids.*' => ['required', 'integer'],
        ]);
        $requestedIds = array_map('intval', $validated['image_ids']);
        $galleryIds = $character->galleryImages()
            ->pluck('character_gallery_images.id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $uniqueRequestedIds = array_values(array_unique($requestedIds));
        $sortedRequestedIds = $uniqueRequestedIds;
        $sortedGalleryIds = $galleryIds;
        sort($sortedRequestedIds);
        sort($sortedGalleryIds);

        if (count($requestedIds) !== count($uniqueRequestedIds)
            || $sortedRequestedIds !== $sortedGalleryIds) {
            throw ValidationException::withMessages([
                'image_ids' => [
                    'Lista musi zawierać dokładnie raz wszystkie obrazy galerii postaci.',
                ],
            ]);
        }

        DB::transaction(function () use ($character, $requestedIds): void {
            foreach ($requestedIds as $sortOrder => $imageId) {
                $character->galleryImages()
                    ->whereKey($imageId)
                    ->update(['sort_order' => $sortOrder]);
            }
        });

        return response()->json(
            $character->galleryImages()->get()
                ->map(fn (CharacterGalleryImage $image): array => $this->imageResponse($image))
        );
    }

    public function destroy(CharacterGalleryImage $galleryImage): Response
    {
        Gate::authorize('delete', $galleryImage);
        $imagePath = $galleryImage->image_path;

        DB::transaction(fn () => $galleryImage->delete());
        $this->imageStorage->delete($imagePath);

        return response()->noContent();
    }

    private function normalizeCaption(?string $caption): ?string
    {
        $caption = $caption === null ? null : trim($caption);

        return $caption === '' ? null : $caption;
    }

    /** @return array<string, mixed> */
    private function imageResponse(CharacterGalleryImage $image): array
    {
        return [
            'id' => $image->id,
            'character_id' => $image->character_id,
            'image_url' => $this->imageStorage->url($image->image_path),
            'caption' => $image->caption,
            'sort_order' => $image->sort_order,
            'created_at' => $image->created_at,
            'updated_at' => $image->updated_at,
        ];
    }
}
