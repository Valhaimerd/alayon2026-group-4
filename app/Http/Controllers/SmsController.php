<?php

namespace App\Http\Controllers;

use App\Services\AccountSession;
use App\Services\SmsService;
use App\Services\SupabaseClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SmsController extends Controller
{
    private function result(bool $ok, string $message, array $extra = []): JsonResponse
    {
        return response()->json(['ok' => $ok, 'message' => $message, ...$extra]);
    }

    public static function normalizePhone(string $value): ?string
    {
        $phone = preg_replace('/[\s()-]/', '', trim($value));
        $normalized = preg_match('/^09\d{9}$/D', $phone) ? '+63'.substr($phone, 1) : (preg_match('/^63\d{10}$/D', $phone) ? '+'.$phone : $phone);

        return preg_match('/^\+[1-9]\d{7,14}$/D', $normalized) ? $normalized : null;
    }

    public function requestCode(Request $request, AccountSession $accounts, SupabaseClient $db, SmsService $sms): JsonResponse
    {
        $session = $accounts->resolve();
        if (! $session['user']) {
            return $this->result(false, 'Sign in first.');
        }
        $secret = config('schedflow.sms_secret');
        if (! $secret || ! config('schedflow.sms_key')) {
            return $this->result(false, 'SMS verification is not configured. Contact your account administrator.');
        }
        $enrollment = $request->input('purpose') === 'enroll';
        if ($enrollment && $session['error']) {
            return $this->result(false, $session['error']);
        }
        $phone = $enrollment ? self::normalizePhone($request->string('phone')->toString()) : null;
        if ($enrollment && ! $phone) {
            return $this->result(false, 'Enter a mobile number with a country code, such as +63 9XX XXX XXXX.');
        }
        $id = (string) Str::uuid();
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hash = hash_hmac('sha256', $session['user']['id'].':'.$id.':'.$code, $secret);
        $started = $db->rpc('start_account_sms', ['p_secret' => $secret, 'p_id' => $id, 'p_code_hash' => $hash, 'p_phone' => $phone]);
        if ($started['error']) {
            return $this->result(false, 'Could not start SMS verification. Try again.');
        }
        if (! ($started['data']['ok'] ?? false)) {
            $reason = $started['data']['reason'] ?? '';

            return $this->result(false, match ($reason) {
                'cooldown' => 'Wait 60 seconds before requesting another code.',
                'daily_limit' => 'The daily SMS limit has been reached. Try again tomorrow or contact your account administrator.',
                default => 'Verify your account first or set up SMS in account settings.',
            });
        }
        try {
            $sms->send($started['data']['phone'], "Your CISC SchedFlow verification code is {$code}. It expires in 5 minutes. Do not share this code.", $id);
            $delivery = $db->rpc('account_sms_delivery', ['p_secret' => $secret, 'p_id' => $id, 'p_delivered' => true]);
            if ($delivery['error']) {
                return $this->result(false, 'The code was sent, but verification could not be prepared. Wait 60 seconds and request a new code.');
            }

            return $this->result(true, 'Verification code sent. It expires in 5 minutes.', ['challengeId' => $id, 'phone' => '•••• '.substr($started['data']['phone'], -4)]);
        } catch (\Throwable) {
            return $this->result(false, 'The SMS provider could not accept the message. Wait 60 seconds and try again.');
        }
    }

    public function verify(Request $request, SupabaseClient $db): JsonResponse
    {
        $user = $db->user();
        if (! $user) {
            return $this->result(false, 'Sign in first.');
        }
        $secret = config('schedflow.sms_secret');
        if (! $secret) {
            return $this->result(false, 'SMS verification is not configured.');
        }
        $id = $request->string('challengeId')->toString();
        $code = trim($request->string('code')->toString());
        if (! Str::isUuid($id) || ! preg_match('/^\d{6}$/D', $code)) {
            return $this->result(false, 'Enter the six-digit code from your message.');
        }
        $result = $db->rpc('verify_account_sms', ['p_secret' => $secret, 'p_id' => $id, 'p_code_hash' => hash_hmac('sha256', $user['id'].':'.$id.':'.$code, $secret)]);
        if ($result['error']) {
            return $this->result(false, 'Could not verify your code. Try again.');
        }
        if (! ($result['data']['ok'] ?? false)) {
            return $this->result(false, ($result['data']['reason'] ?? '') === 'incorrect' ? 'That code is incorrect. Try again.' : 'This code expired or reached its attempt limit. Request a new code.');
        }

        return $this->result(true, 'Mobile number verified. SMS verification is on for this account.');
    }

    public function disable(AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        $session = $accounts->resolve();
        if ($session['error']) {
            return $this->result(false, $session['error']);
        }
        $result = $db->rpc('disable_account_sms', ['p_secret' => config('schedflow.sms_secret') ?? '']);

        return $this->result(! $result['error'] && $result['data'] === true, $result['error'] || $result['data'] !== true
            ? 'Could not disable SMS verification. Verify your account and try again.' : 'SMS verification is off.');
    }
}
