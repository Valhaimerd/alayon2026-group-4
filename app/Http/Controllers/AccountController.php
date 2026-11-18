<?php

namespace App\Http\Controllers;

use App\Services\AccountSession;
use App\Services\SupabaseClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    private function result(bool $ok, string $message, array $extra = []): JsonResponse
    {
        return response()->json(['ok' => $ok, 'message' => $message, ...$extra]);
    }

    public function login(Request $request, SupabaseClient $db): JsonResponse
    {
        $credentials = ['email' => $request->string('email')->toString(), 'password' => $request->string('password')->toString()];
        $result = $db->auth('POST', 'token?grant_type=password', $credentials, false);
        if ($result['error'] || ! isset($result['data']['user'], $result['data']['access_token'], $result['data']['refresh_token'])) {
            return $this->result(false, 'Sign-in failed. Check your email and password.');
        }
        $request->session()->regenerate();
        $db->remember($result['data']);

        // Regeneration rotates the CSRF token too; the client updates its meta value before the next action.
        return $this->result(true, 'Signed in.', ['csrfToken' => csrf_token()]);
    }

    public function logout(Request $request, SupabaseClient $db): JsonResponse
    {
        if ($db->user()) {
            $db->auth('POST', 'logout?scope=local');
        }
        $db->forget();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $request->session()->put('clear_inertia_history', true);

        return $this->result(true, 'Signed out.', ['csrfToken' => csrf_token(), 'clearHistory' => true]);
    }

    public function profile(Request $request, AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        $session = $accounts->resolve();
        if ($session['error']) {
            return $this->result(false, $session['error']);
        }
        $name = trim($request->string('name')->toString());
        if (! $name || mb_strlen($name) > 100) {
            return $this->result(false, 'Enter a display name of 1–100 characters.');
        }
        $result = $db->auth('PUT', 'user', ['data' => ['display_name' => $name]]);

        return $this->result(! $result['error'], $result['error'] ? 'Could not save your display name. Try again.' : 'Display name saved.');
    }

    public function password(Request $request, AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        $session = $accounts->resolve();
        if ($session['error'] || ! ($session['user']['email'] ?? null)) {
            return $this->result(false, $session['error'] ?: 'Sign in with your email first.');
        }
        $password = $request->string('password')->toString();
        if (mb_strlen($password) < 8 || mb_strlen($password) > 128) {
            return $this->result(false, 'Use between 8 and 128 characters for your new password.');
        }
        if ($password !== $request->string('confirmation')->toString()) {
            return $this->result(false, 'The new passwords do not match.');
        }
        $current = $request->string('currentPassword')->toString();
        if (! $current) {
            return $this->result(false, 'Enter your current password.');
        }
        // Verify separately; never replace the existing MFA-verified session with this AAL1 login.
        $checked = $db->auth('POST', 'token?grant_type=password', ['email' => $session['user']['email'], 'password' => $current], false);
        if ($checked['error'] || ! isset($checked['data']['access_token'])) {
            return $this->result(false, 'Your current password could not be verified.');
        }
        // Revoke the isolated verifier session using its own token, without touching the current session.
        $original = $request->session()->get('supabase');
        $db->remember($checked['data']);
        $db->auth('POST', 'logout?scope=local');
        $request->session()->put('supabase', $original);
        $result = $db->auth('PUT', 'user', ['password' => $password, 'current_password' => $current]);

        return $this->result(! $result['error'], $result['error'] ? 'Could not change your password. Check the password requirements or sign in again.' : 'Password changed.');
    }

    public function enroll(AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        $session = $accounts->resolve();
        if ($session['error']) {
            return $this->result(false, $session['error']);
        }
        foreach ($session['user']['factors'] ?? [] as $factor) {
            if ($factor['status'] === 'verified') {
                return $this->result(false, 'An authenticator is already enabled.');
            }
            if ($factor['factor_type'] === 'totp' && $db->auth('DELETE', 'factors/'.rawurlencode($factor['id']))['error']) {
                return $this->result(false, 'Could not restart authenticator setup. Try again.');
            }
        }
        $result = $db->auth('POST', 'factors', ['factor_type' => 'totp', 'friendly_name' => 'CISC SchedFlow', 'issuer' => 'CISC SchedFlow']);
        $data = $result['data'];
        if ($result['error'] || ! isset($data['id'], $data['totp']['secret'], $data['totp']['qr_code'])) {
            return $this->result(false, 'Could not start authenticator setup. Try again.');
        }
        $svg = preg_replace('#^data:image/svg\+xml;utf-8,#', '', $data['totp']['qr_code']);

        return $this->result(true, 'Scan the QR code, then enter the six-digit code.', ['enrollment' => [
            'id' => $data['id'], 'secret' => $data['totp']['secret'], 'qrCode' => 'data:image/svg+xml;base64,'.base64_encode($svg),
        ]]);
    }

    public function verify(Request $request, SupabaseClient $db): JsonResponse
    {
        $user = $db->user();
        if (! $user) {
            return $this->result(false, 'Sign in first.');
        }
        $id = $request->string('factorId')->toString();
        $factor = collect($user['factors'] ?? [])->first(fn ($f) => $f['id'] === $id && $f['factor_type'] === 'totp');
        if (! $factor) {
            return $this->result(false, 'Start authenticator setup or sign in again.');
        }
        $code = $request->string('code')->toString();
        if (! preg_match('/^\d{6}$/D', $code)) {
            return $this->result(false, 'Enter the six-digit code from your authenticator app.');
        }
        $path = 'factors/'.rawurlencode($id);
        $challenge = $db->auth('POST', $path.'/challenge');
        if ($challenge['error'] || ! isset($challenge['data']['id'])) {
            return $this->result(false, 'Could not prepare verification. Try again.');
        }
        $result = $db->auth('POST', $path.'/verify', ['challenge_id' => $challenge['data']['id'], 'code' => $code]);
        if ($result['error'] || ! isset($result['data']['access_token'], $result['data']['refresh_token'])) {
            return $this->result(false, 'The code could not be verified. Try the latest code.');
        }
        $db->remember($result['data']);
        $request->session()->regenerate();

        return $this->result(true, 'Authenticator verified.', ['csrfToken' => csrf_token()]);
    }

    public function remove(Request $request, AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        $session = $accounts->resolve();
        if ($session['error']) {
            return $this->result(false, $session['error']);
        }
        $id = $request->string('factorId')->toString();
        if (! collect($session['user']['factors'] ?? [])->contains(fn ($f) => $f['id'] === $id && $f['factor_type'] === 'totp')) {
            return $this->result(false, 'Authenticator not found.');
        }
        $result = $db->auth('DELETE', 'factors/'.rawurlencode($id));
        if ($result['error']) {
            return $this->result(false, 'Could not remove the authenticator. Verify your code or sign in again.');
        }
        if (! $db->refresh()) {
            $db->forget();

            return $this->result(true, 'Authenticator removed. Sign in again.');
        }

        return $this->result(true, 'Authenticator app removed.');
    }
}
