<?php

namespace App\Services;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

class ChapterContentSanitizer
{
    public const MAX_CONTENT_LENGTH = 2_000_000;

    private const MAX_CONTENT_BYTES = 8_000_000;

    private HtmlSanitizer $sanitizer;

    public function __construct()
    {
        $config = (new HtmlSanitizerConfig())
            ->allowElement('p', ['style'])
            ->allowElement('h1', ['style'])
            ->allowElement('h2', ['style'])
            ->allowElement('h3', ['style'])
            ->allowElement('h4', ['style'])
            ->allowElement('h5', ['style'])
            ->allowElement('h6', ['style'])
            ->allowElement('strong')
            ->allowElement('b')
            ->allowElement('em')
            ->allowElement('i')
            ->allowElement('u')
            ->allowElement('s')
            ->allowElement('sub')
            ->allowElement('sup')
            ->allowElement('span', ['style'])
            ->allowElement('ul', ['style'])
            ->allowElement('ol', ['style'])
            ->allowElement('li', ['style'])
            ->allowElement('blockquote', ['style'])
            ->allowElement('br')
            ->allowElement('hr')
            ->allowElement('a', ['href', 'title', 'target'])
            ->blockElement('div')
            ->blockElement('font')
            ->allowLinkSchemes(['http', 'https', 'mailto'])
            ->allowRelativeLinks()
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->withAttributeSanitizer(new ChapterStyleAttributeSanitizer())
            ->withMaxInputLength(self::MAX_CONTENT_BYTES);

        $this->sanitizer = new HtmlSanitizer($config);
    }

    public function sanitize(?string $html): ?string
    {
        return $html === null ? null : $this->sanitizer->sanitize($html);
    }
}
