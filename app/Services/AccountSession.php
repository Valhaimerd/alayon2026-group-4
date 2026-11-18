<?php

namespace App\Services;

class AccountSession
{
    public function __construct(public SupabaseClient $db) {}

    public function resolve(): array
    {
        $user = $this->db->user();
        if (! $user) {
            return ['user' => null, 'sms' => null, 'needsVerification' => false, 'error' => 'Sign in first.'];
        }
        $assurance = $this->db->rpc('account_mfa_verified');
        $sms = $this->db->rpc('account_sms_status');
        $failed = $assurance['error'] || $sms['error'];

        return [
            'user' => $user,
            'sms' => $sms['data'] ?: ['enabled' => false, 'phone' => null, 'pending' => null],
            'needsVerification' => $failed || $assurance['data'] !== true,
            'error' => $failed ? 'Could not verify account security. Sign in again.' : ($assurance['data'] !== true ? 'Verify your sign-in code first.' : null),
        ];
    }

    public function requireRole(string $role): ?string
    {
        $session = $this->resolve();
        if ($session['error']) {
            return $session['error'];
        }
        $result = $this->db->rpc('has_role', ['required_role' => $role]);

        return $result['data'] === true && ! $result['error'] ? null : ucfirst($role).' access is required.';
    }
}
