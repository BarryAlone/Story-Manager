<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Project;
use App\Models\User;
use App\Services\ChapterContentSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChapterWritingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_save_allowed_chapter_html_synopsis_and_notes(): void
    {
        [$user, $project, $chapter] = $this->chapterFixture();
        $html = '<h2>Heading</h2>'
            .'<p style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; '
            .'line-height: 1.5; text-align: justify;">Hello <strong>world</strong> <em>today</em>.</p>'
            .'<blockquote>Quote</blockquote><ul><li>One</li></ul>'
            .'<p><span style="color: #ff0000;">Important</span> '
            .'<a href="https://example.com" title="Source">Link</a></p>';

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'description' => 'Updated synopsis',
            'description_long' => $html,
            'notes' => "First note\nSecond note",
        ])->assertOk()
            ->assertJsonPath('description', 'Updated synopsis')
            ->assertJsonPath('notes', "First note\nSecond note")
            ->assertJsonPath('description_long', fn (string $value) => str_contains($value, '<h2>Heading</h2>')
                && str_contains($value, '<strong>world</strong>')
                && str_contains($value, 'font-size: 18px')
                && str_contains($value, 'text-align: justify')
                && str_contains($value, 'color: #ff0000')
                && str_contains($value, 'href="https://example.com"'));

        $this->assertDatabaseHas('chapters', [
            'id' => $chapter->id,
            'description' => 'Updated synopsis',
            'notes' => "First note\nSecond note",
        ]);
    }

    public function test_dangerous_html_is_removed_before_chapter_content_is_saved(): void
    {
        [$user, $project, $chapter] = $this->chapterFixture();
        $html = '<p onclick="alert(1)" style="position: fixed; background-image: '
            .'url(javascript:alert(4)); font-size: 999px; color: #ff0000;">'
            .'Visible<script>alert(1)</script>'
            .'<a href="javascript:alert(2)" onmouseover="alert(3)">unsafe link</a></p>'
            .'<iframe src="https://example.com"></iframe><style>body{display:none}</style>';

        $response = $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'description_long' => $html,
        ])->assertOk();

        $savedHtml = $response->json('description_long');

        $this->assertStringContainsString('>Visible<a', $savedHtml);
        $this->assertStringNotContainsString('script', $savedHtml);
        $this->assertStringNotContainsString('iframe', $savedHtml);
        $this->assertStringNotContainsString('<style', $savedHtml);
        $this->assertStringNotContainsString('onclick', $savedHtml);
        $this->assertStringNotContainsString('onmouseover', $savedHtml);
        $this->assertStringNotContainsString('javascript:', $savedHtml);
        $this->assertStringNotContainsString('position', $savedHtml);
        $this->assertStringNotContainsString('background-image', $savedHtml);
        $this->assertStringNotContainsString('999px', $savedHtml);
        $this->assertStringContainsString('color: #ff0000', $savedHtml);
    }

    public function test_chapter_content_limits_are_validated(): void
    {
        [$user, $project, $chapter] = $this->chapterFixture();

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'description_long' => str_repeat('a', ChapterContentSanitizer::MAX_CONTENT_LENGTH + 1),
        ])->assertUnprocessable()->assertJsonValidationErrors('description_long');

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'notes' => str_repeat('a', 100_001),
        ])->assertUnprocessable()->assertJsonValidationErrors('notes');
    }

    public function test_another_user_cannot_update_chapter_content(): void
    {
        [, $project, $chapter] = $this->chapterFixture();
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'description_long' => '<p>Injected</p>',
        ])->assertNotFound();

        $this->assertSame('<p>Original content</p>', $chapter->refresh()->description_long);
    }

    public function test_content_save_preserves_other_chapter_fields(): void
    {
        [$user, $project, $chapter] = $this->chapterFixture();

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            ...$this->contentPayload($project, $chapter),
            'description' => 'New synopsis',
            'description_long' => '<p>New content</p>',
            'notes' => 'New notes',
        ])->assertOk();

        $chapter->refresh();

        $this->assertSame('Chapter one', $chapter->name);
        $this->assertSame(1, $chapter->chapter_number);
        $this->assertSame(4, $chapter->sort_order);
        $this->assertTrue($chapter->is_in_manuscript);
        $this->assertSame('chapters/cover.jpg', $chapter->chapter_image);
        $this->assertSame(10, $chapter->timeline_point_start);
        $this->assertSame(20, $chapter->timeline_point_end);
        $this->assertSame('Day one', $chapter->display_label);
    }

    /** @return array{User, Project, Chapter} */
    private function chapterFixture(): array
    {
        $user = User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Novel',
        ]);
        $chapter = Chapter::create([
            'project_id' => $project->id,
            'chapter_number' => 1,
            'sort_order' => 4,
            'is_in_manuscript' => true,
            'name' => 'Chapter one',
            'description' => 'Original synopsis',
            'description_long' => '<p>Original content</p>',
            'notes' => 'Original notes',
            'chapter_image' => 'chapters/cover.jpg',
            'timeline_point_start' => 10,
            'timeline_point_end' => 20,
            'display_label' => 'Day one',
        ]);

        return [$user, $project, $chapter];
    }

    /** @return array<string, mixed> */
    private function contentPayload(Project $project, Chapter $chapter): array
    {
        return [
            'project_id' => $project->id,
            'chapter_number' => $chapter->chapter_number,
            'name' => $chapter->name,
            'description' => $chapter->description,
            'description_long' => $chapter->description_long,
            'notes' => $chapter->notes,
            'parent_id' => $chapter->parent_id,
            'sort_order' => $chapter->sort_order,
            'is_in_manuscript' => $chapter->is_in_manuscript,
            'timeline_point_start' => $chapter->timeline_point_start,
            'timeline_point_end' => $chapter->timeline_point_end,
            'display_label' => $chapter->display_label,
        ];
    }
}
