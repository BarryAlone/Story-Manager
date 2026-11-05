<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use JsonException;
use stdClass;

class AttributeValuesInputParser
{
    /**
     * @return array{present: bool, values: array<int|string, mixed>}
     *
     * @throws ValidationException
     */
    public function parse(Request $request): array
    {
        if (! $request->exists('attribute_values')) {
            return ['present' => false, 'values' => []];
        }

        if ($request->isJson()) {
            return [
                'present' => true,
                'values' => $this->parseJsonRequest($request),
            ];
        }

        $rawValues = $request->input('attribute_values');

        if (! is_string($rawValues)) {
            $this->invalidPayload();
        }

        try {
            $decoded = json_decode($rawValues, false, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->invalidPayload();
        }

        if (! $decoded instanceof stdClass) {
            $this->invalidPayload();
        }

        return [
            'present' => true,
            'values' => get_object_vars($decoded),
        ];
    }

    /** @return array<int|string, mixed> */
    private function parseJsonRequest(Request $request): array
    {
        try {
            $document = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->invalidPayload();
        }

        if (
            ! $document instanceof stdClass
            || ! property_exists($document, 'attribute_values')
            || ! $document->attribute_values instanceof stdClass
        ) {
            $this->invalidPayload();
        }

        return get_object_vars($document->attribute_values);
    }

    /** @throws ValidationException */
    private function invalidPayload(): never
    {
        throw ValidationException::withMessages([
            'attribute_values' => [
                'Wartości atrybutów muszą być obiektem JSON indeksowanym identyfikatorami definicji.',
            ],
        ]);
    }
}
