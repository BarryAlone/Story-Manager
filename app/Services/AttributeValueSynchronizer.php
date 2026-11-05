<?php

namespace App\Services;

use App\Models\AttributeDefinition;
use App\Models\AttributeValue;
use App\Models\Character;
use App\Models\WorldElement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttributeValueSynchronizer
{
    public const MAX_TEXT_LENGTH = 10_000;

    private const NUMBER_INTEGER_DIGITS = 14;

    private const NUMBER_DECIMAL_PLACES = 6;

    /**
     * Synchronize the complete attribute value set submitted for an entity.
     *
     * @param  array<int|string, mixed>  $submittedValues
     * @return Collection<int, AttributeValue>
     *
     * @throws ValidationException
     */
    public function sync(
        Character|WorldElement $entity,
        array $submittedValues,
    ): Collection {
        $validatedValues = $this->validateCompleteSet($entity, $submittedValues);

        return DB::transaction(function () use ($entity, $validatedValues): Collection {
            $definitionIds = array_keys($validatedValues);

            if ($definitionIds === []) {
                $entity->attributeValues()->delete();
            } else {
                $entity->attributeValues()
                    ->whereNotIn('attribute_definition_id', $definitionIds)
                    ->delete();
            }

            foreach ($validatedValues as $definitionId => $value) {
                $entity->attributeValues()->updateOrCreate(
                    ['attribute_definition_id' => $definitionId],
                    $value,
                );
            }

            return $entity->attributeValues()
                ->with('definition')
                ->get()
                ->sortBy([
                    ['definition.sort_order', 'asc'],
                    ['definition.id', 'asc'],
                ])
                ->values();
        });
    }

    /**
     * @param  array<int|string, mixed>  $submittedValues
     * @return array<int, array{value_text: ?string, value_number: ?string}>
     *
     * @throws ValidationException
     */
    private function validateCompleteSet(
        Character|WorldElement $entity,
        array $submittedValues,
    ): array {
        $errors = [];
        $entries = [];

        foreach ($submittedValues as $rawDefinitionId => $rawValue) {
            $field = 'attribute_values.'.$rawDefinitionId;
            $definitionId = filter_var(
                $rawDefinitionId,
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 1]]
            );

            if ($definitionId === false) {
                $errors[$field][] = 'Identyfikator definicji atrybutu jest nieprawidłowy.';

                continue;
            }

            if (array_key_exists($definitionId, $entries)) {
                $errors[$field][] = 'Definicja atrybutu występuje więcej niż raz.';

                continue;
            }

            $entries[$definitionId] = $rawValue;
        }

        $definitions = AttributeDefinition::query()
            ->whereKey(array_keys($entries))
            ->get()
            ->keyBy('id');
        [$projectId, $targetType, $categoryId] = $this->entityScope($entity);
        $validated = [];

        foreach ($entries as $definitionId => $rawValue) {
            $field = 'attribute_values.'.$definitionId;
            /** @var AttributeDefinition|null $definition */
            $definition = $definitions->get($definitionId);

            if (! $definition) {
                $errors[$field][] = 'Wybrana definicja atrybutu nie istnieje.';

                continue;
            }

            if ((int) $definition->project_id !== $projectId) {
                $errors[$field][] = 'Definicja atrybutu nie należy do projektu tej encji.';

                continue;
            }

            if ($definition->target_type !== $targetType) {
                $errors[$field][] = 'Definicja atrybutu ma niewłaściwy typ celu.';

                continue;
            }

            if (
                $targetType === AttributeDefinition::TARGET_WORLD_ELEMENT
                && (int) $definition->world_element_category_id !== $categoryId
            ) {
                $errors[$field][] = 'Definicja atrybutu nie należy do kategorii tego elementu.';

                continue;
            }

            if ($this->isEmptyValue($rawValue)) {
                continue;
            }

            $normalized = $this->normalizeValue($definition, $rawValue, $field, $errors);

            if ($normalized !== null) {
                $validated[$definitionId] = $normalized;
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $validated;
    }

    /** @return array{int, string, ?int} */
    private function entityScope(Character|WorldElement $entity): array
    {
        if ($entity instanceof Character) {
            return [
                (int) $entity->project_id,
                AttributeDefinition::TARGET_CHARACTER,
                null,
            ];
        }

        $entity->loadMissing('worldElementCategory');

        return [
            (int) $entity->worldElementCategory->project_id,
            AttributeDefinition::TARGET_WORLD_ELEMENT,
            (int) $entity->world_element_category_id,
        ];
    }

    private function isEmptyValue(mixed $value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '');
    }

    /**
     * @param  array<string, list<string>>  $errors
     * @return array{value_text: ?string, value_number: ?string}|null
     */
    private function normalizeValue(
        AttributeDefinition $definition,
        mixed $value,
        string $field,
        array &$errors,
    ): ?array {
        if ($definition->value_type === AttributeDefinition::TYPE_TEXT) {
            if (! is_string($value)) {
                $errors[$field][] = 'Wartość tekstowa musi być tekstem.';

                return null;
            }

            if (mb_strlen($value) > self::MAX_TEXT_LENGTH) {
                $errors[$field][] = 'Wartość tekstowa nie może przekraczać 10000 znaków.';

                return null;
            }

            return ['value_text' => $value, 'value_number' => null];
        }

        $number = $this->normalizeNumber($value);

        if ($number === null) {
            $errors[$field][] = 'Wartość liczbowa musi mieścić się w DECIMAL(20,6).';

            return null;
        }

        return ['value_text' => null, 'value_number' => $number];
    }

    private function normalizeNumber(mixed $value): ?string
    {
        if (is_int($value)) {
            $value = (string) $value;
        }

        if (! is_string($value)) {
            return null;
        }

        $number = trim($value);

        if (! preg_match('/^([+-]?)(\d+)(?:\.(\d+))?$/D', $number, $matches)) {
            return null;
        }

        $sign = $matches[1];
        $integer = ltrim($matches[2], '0');
        $fraction = $matches[3] ?? '';
        $integer = $integer === '' ? '0' : $integer;

        if (
            strlen($integer) > self::NUMBER_INTEGER_DIGITS
            || strlen($fraction) > self::NUMBER_DECIMAL_PLACES
        ) {
            return null;
        }

        $isZero = $integer === '0' && ($fraction === '' || trim($fraction, '0') === '');
        $normalizedSign = $sign === '-' && ! $isZero ? '-' : '';

        return $normalizedSign.$integer.($fraction !== '' ? '.'.$fraction : '');
    }
}
