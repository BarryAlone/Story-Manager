<?php

namespace App\Services;

use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\Visitor\AttributeSanitizer\AttributeSanitizerInterface;

final class ChapterStyleAttributeSanitizer implements AttributeSanitizerInterface
{
    private const ALLOWED_ELEMENTS = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'blockquote', 'ul', 'ol', 'li',
    ];

    private const ALLOWED_VALUES = [
        'background-color' => [
            '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9',
            '#efefef', '#f3f3f3', '#ffffff', '#980000', '#ff0000', '#ff9900', '#ffff00',
            '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff', '#e6b8af',
            '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3',
            '#d9d2e9', '#ead1dc',
        ],
        'color' => [
            '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9',
            '#efefef', '#f3f3f3', '#ffffff', '#980000', '#ff0000', '#ff9900', '#ffff00',
            '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff', '#e6b8af',
            '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3',
            '#d9d2e9', '#ead1dc',
        ],
        'font-size' => ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'],
        'line-height' => ['1', '1.15', '1.5', '1.75', '2'],
        'padding-left' => ['40px', '80px', '120px', '160px', '200px'],
        'text-align' => ['left', 'center', 'right', 'justify'],
    ];

    private const FONT_FAMILIES = [
        'arial, helvetica, sans-serif' => 'Arial, Helvetica, sans-serif',
        'courier new, courier, monospace' => "'Courier New', Courier, monospace",
        'georgia, serif' => 'Georgia, serif',
        'tahoma, arial, helvetica, sans-serif' => 'Tahoma, Arial, Helvetica, sans-serif',
        'times new roman, times, serif' => "'Times New Roman', Times, serif",
        'verdana, arial, helvetica, sans-serif' => 'Verdana, Arial, Helvetica, sans-serif',
    ];

    public function getSupportedElements(): ?array
    {
        return self::ALLOWED_ELEMENTS;
    }

    public function getSupportedAttributes(): ?array
    {
        return ['style'];
    }

    public function sanitizeAttribute(
        string $element,
        string $attribute,
        string $value,
        HtmlSanitizerConfig $config,
    ): ?string {
        $sanitized = [];

        foreach (explode(';', $value) as $declaration) {
            if (! str_contains($declaration, ':')) {
                continue;
            }

            [$property, $propertyValue] = array_map('trim', explode(':', $declaration, 2));
            $property = strtolower($property);
            $propertyValue = trim($propertyValue, " \t\n\r\0\x0B\"'");

            if ($property === 'font-family') {
                $normalizedFamily = str_replace(["'", '"'], '', $propertyValue);
                $normalizedFamily = strtolower(preg_replace('/\s+/', ' ', $normalizedFamily) ?? '');
                if (isset(self::FONT_FAMILIES[$normalizedFamily])) {
                    $sanitized[] = 'font-family: '.self::FONT_FAMILIES[$normalizedFamily];
                }
                continue;
            }

            $normalizedValue = strtolower($propertyValue);
            if (isset(self::ALLOWED_VALUES[$property])
                && in_array($normalizedValue, self::ALLOWED_VALUES[$property], true)) {
                $sanitized[] = $property.': '.$normalizedValue;
            }
        }

        return $sanitized === [] ? null : implode('; ', array_unique($sanitized)).';';
    }
}
