<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LaravelMigrationTest extends TestCase
{
    private array $tokens = ['access_token' => 'user-token', 'refresh_token' => 'refresh-token', 'expires_at' => 4102444800];

    private array $user = ['id' => '11111111-1111-4111-8111-111111111111', 'email' => 'teacher@example.invalid', 'user_metadata' => ['display_name' => 'Test instructor'], 'factors' => []];

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['schedflow.supabase_url' => 'https://school.supabase.test', 'schedflow.supabase_key' => 'publishable-key',
            'schedflow.sms_key' => 'test-key', 'schedflow.sms_secret' => 'test-server-secret', 'schedflow.sms_enabled' => false]);
        Http::preventStrayRequests();
    }

    private function fake(array $overrides = [], array $roles = ['registrar'], bool $verified = true): void
    {
        $defaults = [
            '*/auth/v1/user' => Http::response($this->user),
            '*/rest/v1/rpc/account_mfa_verified' => Http::response($verified ? 'true' : 'false'),
            '*/rest/v1/rpc/account_sms_status' => Http::response(['enabled' => false, 'phone' => null, 'pending' => null]),
            '*/rest/v1/rpc/has_role' => Http::response($verified && in_array('registrar', $roles, true) ? 'true' : 'false'),
            '*/rest/v1/account_roles*' => Http::response(array_map(fn ($role) => ['role' => $role], $roles)),
            '*/rest/v1/*' => Http::response([]),
        ];
        Http::fake([...$overrides, ...array_diff_key($defaults, $overrides)]);
    }

    private function bookingForm(array $overrides = []): array
    {
        return [...[
            'kind' => 'class', 'room' => 'g1', 'size' => '20', 'section' => 'section-id', 'parent' => 'ITCC41',
            'component' => 'ITCC41', 'classCode' => '00123', 'instructor' => 'instructor-id', 'published' => 'on',
            'schedule' => json_encode(['mode' => 'weekly', 'from' => '2031-01-06', 'until' => '2031-01-13', 'days' => [1], 'times' => (object) ['1' => ['start' => '09:00', 'end' => '10:00']]]),
        ], ...$overrides];
    }

    public function test_original_welcome_and_legacy_routes_are_preserved(): void
    {
        $this->get('/')->assertOk()->assertHeader('Content-Type', 'text/html; charset=utf-8');
        $this->get('/welcome')->assertRedirect('/');
        $this->get('/staff')->assertRedirect('/explore?signin=1');
    }

    public function test_unconfigured_explorer_keeps_explicit_demo_mode(): void
    {
        config(['schedflow.supabase_url' => null]);
        $this->get('/explore?date=2026-02-30')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Explore')->missing('publishedBookings')->where('initialDate', now('Asia/Manila')->toDateString()));
        Http::assertNothingSent();
    }

    public function test_public_projection_is_loaded_with_philippine_day_bounds_and_no_private_reads(): void
    {
        $this->fake(['*/rest/v1/published_schedule*' => Http::response([[
            'id' => 'booking-1', 'room_id' => 'g1', 'title' => 'Public class', 'instructor_name' => 'Faculty',
            'starts_at' => '2031-01-06T01:00:00Z', 'ends_at' => '2031-01-06T02:00:00Z',
        ]])]);
        $this->get('/explore?date=2031-01-06')->assertOk()->assertHeader('Cache-Control', 'no-store, private')
            ->assertInertia(fn (Assert $page) => $page->where('publishedBookings.0.start', '09:00')->where('account', null)
                ->missing('staff')->missing('profile')->missing('administration'));
        Http::assertSent(fn ($r) => str_contains($r->url(), 'published_schedule') && str_contains(urldecode($r->url()), '2031-01-06T00:00:00+08:00'));
        Http::assertNotSent(fn ($r) => str_contains($r->url(), '/bookings') || str_contains($r->url(), '/instructors'));
    }

    public function test_pending_mfa_prevents_roles_and_private_props_from_loading(): void
    {
        $this->fake(verified: false);
        $this->withSession(['supabase' => $this->tokens])->get('/explore')->assertInertia(fn (Assert $page) => $page
            ->where('profile.needsVerification', true)->where('account', 'nonstaff')->missing('staff')->missing('assignments'));
        Http::assertNotSent(fn ($r) => str_contains($r->url(), '/account_roles') || str_contains($r->url(), '/bookings'));
    }

    public function test_instructor_keeps_own_allocations_without_registrar_tools_or_tokens_in_props(): void
    {
        $this->fake(roles: ['instructor']);
        $response = $this->withSession(['supabase' => $this->tokens])->get('/explore');
        $response->assertInertia(fn (Assert $page) => $page->where('account', 'instructor')->has('assignments')->missing('staff')->missing('administration'));
        $response->assertDontSee('user-token')->assertDontSee('refresh-token');
        Http::assertSent(fn ($r) => str_contains($r->url(), '/bookings') && $r->hasHeader('Authorization', 'Bearer user-token'));
    }

    public function test_anonymous_and_instructor_mutations_are_denied(): void
    {
        $this->postJson('/actions/bookings/save', $this->bookingForm())->assertJson(['ok' => false, 'message' => 'Sign in first.']);
        Http::assertNothingSent();
        $this->fake(roles: ['instructor']);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/bookings/publish', ['id' => 'forged', 'publish' => 'true'])
            ->assertJson(['ok' => false, 'message' => 'Registrar access is required.']);
        Http::assertNotSent(fn ($r) => $r->method() === 'PATCH');
    }

    public function test_class_series_keeps_atomic_rpc_contract_and_leading_zero_code(): void
    {
        $this->fake(['*/rest/v1/rooms*' => Http::response([['capacity' => 40]]), '*/rest/v1/rpc/save_class_booking' => Http::response('2')]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/bookings/save', $this->bookingForm())
            ->assertJson(['ok' => true, 'message' => '2 classes saved and published.']);
        Http::assertSent(fn ($r) => str_contains($r->url(), '/rpc/save_class_booking') && $r['p_class_code'] === '00123'
            && $r['p_slots'] === [['start' => '2031-01-06T09:00:00+08:00', 'end' => '2031-01-06T10:00:00+08:00'], ['start' => '2031-01-13T09:00:00+08:00', 'end' => '2031-01-13T10:00:00+08:00']]);
    }

    public function test_conflict_response_explains_full_batch_rejection(): void
    {
        $this->fake(['*/rest/v1/rooms*' => Http::response([['capacity' => 40]]),
            '*/rest/v1/rpc/save_class_booking' => Http::response(['code' => '23P01', 'message' => 'instructor_no_overlap'], 409)]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/bookings/save', $this->bookingForm())
            ->assertJson(['ok' => false, 'message' => 'This instructor already has a published class at that time. No classes in this series were saved.']);
    }

    public function test_capacity_and_malformed_schedule_fail_before_mutation(): void
    {
        $this->fake(['*/rest/v1/rooms*' => Http::response([['capacity' => 10]])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/bookings/save', $this->bookingForm())
            ->assertJson(['ok' => false, 'message' => 'Class size must be positive and within room capacity.']);
        $this->postJson('/actions/bookings/save', $this->bookingForm(['schedule' => '{bad']))->assertJson(['ok' => false]);
        Http::assertNotSent(fn ($r) => str_contains($r->url(), 'save_class_booking'));
    }

    public function test_activity_series_uses_one_atomic_post_and_edit_only_one_occurrence(): void
    {
        $this->fake(['*/rest/v1/rooms*' => Http::response([['capacity' => 40]]), '*/rest/v1/bookings*' => Http::response([['id' => 'one'], ['id' => 'two']])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/bookings/save', $this->bookingForm(['kind' => 'activity', 'title' => 'Department meeting']))->assertJson(['ok' => true]);
        Http::assertSent(fn ($r) => $r->method() === 'POST' && str_contains($r->url(), '/bookings') && count($r->data()) === 2 && $r[0]['instructor_id'] === null);
        $this->postJson('/actions/bookings/save', $this->bookingForm(['id' => 'existing']))
            ->assertJson(['ok' => false, 'message' => 'An existing booking can only be moved to one date.']);
    }

    public function test_login_keeps_grant_query_and_stores_tokens_only_in_server_session(): void
    {
        $this->fake(['*/auth/v1/token?grant_type=password' => Http::response([...$this->tokens, 'user' => $this->user])]);
        $this->postJson('/actions/login', ['email' => $this->user['email'], 'password' => 'example-password'])
            ->assertJson(['ok' => true])->assertJsonStructure(['csrfToken'])->assertJsonMissing(['access_token' => 'user-token'])
            ->assertSessionHas('supabase.access_token', 'user-token');
    }

    public function test_expired_access_is_refreshed_before_private_reads(): void
    {
        $this->fake(['*/auth/v1/token?grant_type=refresh_token' => Http::response([...$this->tokens, 'access_token' => 'renewed-token'])]);
        $this->withSession(['supabase' => [...$this->tokens, 'expires_at' => 1]])->get('/explore')->assertOk()->assertSessionHas('supabase.access_token', 'renewed-token');
        Http::assertSent(fn ($r) => str_contains($r->url(), '/auth/v1/user') && $r->hasHeader('Authorization', 'Bearer renewed-token'));
    }

    public function test_registrar_cannot_use_administrator_setup(): void
    {
        $this->fake(['*/rest/v1/rpc/has_role' => Http::response('false')]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/setup/term', ['name' => 'Forged term'])
            ->assertJson(['ok' => false, 'message' => 'Administrator access is required.']);
        Http::assertNotSent(fn ($r) => str_contains($r->url(), '/academic_terms'));
    }

    public function test_administrator_can_create_term_through_existing_policy_path(): void
    {
        $this->fake(['*/rest/v1/rpc/has_role' => Http::response('true'), '*/rest/v1/academic_terms*' => Http::response([['id' => 'term']])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/setup/term', ['name' => 'Actual term', 'starts' => '2031-01-01', 'ends' => '2031-05-01', 'semester' => '1'])
            ->assertJson(['ok' => true]);
        Http::assertSent(fn ($r) => str_contains($r->url(), '/academic_terms') && $r['semester'] === 1 && $r->hasHeader('Authorization', 'Bearer user-token'));
    }

    public function test_password_verification_does_not_downgrade_current_session(): void
    {
        $this->fake(['*/auth/v1/token?grant_type=password' => Http::response([...$this->tokens, 'access_token' => 'isolated-token']),
            '*/auth/v1/logout?scope=local' => Http::response([])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/account/password', ['currentPassword' => 'old-password', 'password' => 'new-password', 'confirmation' => 'new-password'])
            ->assertJson(['ok' => true])->assertSessionHas('supabase.access_token', 'user-token');
        Http::assertSent(fn ($r) => $r->method() === 'PUT' && str_contains($r->url(), '/user') && $r->hasHeader('Authorization', 'Bearer user-token'));
        Http::assertSent(fn ($r) => str_contains($r->url(), '/logout') && $r->hasHeader('Authorization', 'Bearer isolated-token'));
    }

    public function test_totp_verification_checks_factor_ownership_and_adopts_aal2_tokens(): void
    {
        $this->user['factors'] = [['id' => 'factor-1', 'factor_type' => 'totp', 'status' => 'verified']];
        $this->fake(['*/auth/v1/factors/factor-1/challenge' => Http::response(['id' => 'challenge-1']),
            '*/auth/v1/factors/factor-1/verify' => Http::response([...$this->tokens, 'access_token' => 'aal2-token'])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/account/totp/verify', ['factorId' => 'factor-1', 'code' => '123456'])
            ->assertJson(['ok' => true])->assertSessionHas('supabase.access_token', 'aal2-token');
        $this->postJson('/actions/account/totp/verify', ['factorId' => 'other-user-factor', 'code' => '123456'])->assertJson(['ok' => false]);
    }

    public function test_sms_codes_preserve_existing_hmac_rpc_contract_and_never_return_codes(): void
    {
        $this->fake(['*/rest/v1/rpc/start_account_sms' => Http::response(['ok' => true, 'phone' => '+639123456789']),
            '*/rest/v1/rpc/account_sms_delivery' => Http::response('true'),
            'https://sms.haturiko.tech/*' => Http::response(['message' => ['id' => 'provider-1']], 202)]);
        $response = $this->withSession(['supabase' => $this->tokens])->postJson('/actions/account/sms/request', ['purpose' => 'enroll', 'phone' => '09123456789']);
        $response->assertJson(['ok' => true, 'phone' => '•••• 6789'])->assertJsonMissingPath('code')->assertDontSee('test-server-secret');
        $calls = Http::recorded();
        $provider = $calls->first(fn ($pair) => str_contains($pair[0]->url(), 'sms.haturiko.tech'))[0];
        preg_match('/code is (\d{6})/', $provider['body'], $match);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'start_account_sms') && $r['p_phone'] === '+639123456789'
            && $r['p_code_hash'] === hash_hmac('sha256', $this->user['id'].':'.$response->json('challengeId').':'.$match[1], 'test-server-secret'));
    }

    public function test_logout_clears_session_and_marks_browser_history_for_clearing(): void
    {
        $this->fake(['*/auth/v1/logout?scope=local' => Http::response([])]);
        $this->withSession(['supabase' => $this->tokens])->postJson('/actions/logout')->assertJson(['ok' => true])
            ->assertSessionMissing('supabase')->assertSessionHas('clear_inertia_history', true);
    }
}
