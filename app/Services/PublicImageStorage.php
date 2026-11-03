<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PublicImageStorage
{
    public function store(UploadedFile $image, string $directory): string
    {
        $path = $image->store($directory, 'public');

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('Nie udało się zapisać obrazu.');
        }

        return $path;
    }

    public function delete(?string $path): bool
    {
        if (! $path) {
            return true;
        }

        try {
            $deleted = Storage::disk('public')->delete($path);
        } catch (Throwable $error) {
            Log::warning('Nie udało się usunąć obrazu z dysku publicznego.', [
                'path' => $path,
                'exception' => $error,
            ]);

            return false;
        }

        if (! $deleted) {
            Log::warning('Nie udało się usunąć obrazu z dysku publicznego.', [
                'path' => $path,
            ]);
        }

        return $deleted;
    }

    /** @param array<int, string|null> $paths */
    public function deleteMany(array $paths): bool
    {
        $uniquePaths = array_values(array_unique(array_filter($paths)));
        $deleted = true;

        foreach ($uniquePaths as $path) {
            $deleted = $this->delete($path) && $deleted;
        }

        return $deleted;
    }
}
