<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/** Uses the signed-in user's JWT, never a service-role key, so existing RLS stays authoritative. */
class SupabaseClient
{
    private ?array $resolvedUser = null;

    private bool $userLoaded = false;

    public function __construct(private Request $request) {}

    public function configured(): bool
    {
        return (bool) (config('schedflow.supabase_url') && config('schedflow.supabase_key'));
    }

    public function token(): ?string
    {
        return $this->request->session()->get('supabase.access_token');
    }

    public function remember(array $tokens): void
    {
        if (! isset($tokens['access_token'], $tokens['refresh_token'])) {
            return;
        }
        $this->request->session()->put('supabase', [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_at' => $tokens['expires_at'] ?? time() + ($tokens['expires_in'] ?? 3600),
        ]);
        $this->userLoaded = false;
    }

    public function forget(): void
    {
        $this->request->session()->forget('supabase');
        $this->resolvedUser = null;
        $this->userLoaded = true;
    }

    public function refresh(): bool
    {
        $refresh = $this->request->session()->get('supabase.refresh_token');
        if (! $refresh) {
            return false;
        }
        $result = $this->auth('POST', 'token?grant_type=refresh_token', ['refresh_token' => $refresh], false);
        if ($result['error']) {
            // A network outage must not discard a potentially valid refresh token.
            if (in_array($result['status'], [400, 401, 403], true)) {
                $this->forget();
            }

            return false;
        }
        $this->remember($result['data']);

        return true;
    }

    public function user(): ?array
    {
        if ($this->userLoaded) {
            return $this->resolvedUser;
        }
        if (! $this->token()) {
            return null;
        }
        if ($this->request->session()->get('supabase.expires_at', 0) <= time() + 60 && ! $this->refresh()) {
            return null;
        }
        $result = $this->auth('GET', 'user');
        $this->userLoaded = true;

        return $this->resolvedUser = ! $result['error'] ? $result['data'] : null;
    }

    public function auth(string $method, string $path, array $body = [], bool $authenticated = true): array
    {
        return $this->send($method, 'auth/v1/'.$path, $body ?: (object) [], [], [], $authenticated);
    }

    public function select(string $table, array $query = []): array
    {
        return $this->send('GET', 'rest/v1/'.$table, [], $query);
    }

    public function write(string $method, string $table, array $body, array $query = []): array
    {
        return $this->send($method, 'rest/v1/'.$table, $body, $query, ['Prefer' => 'return=representation']);
    }

    public function rpc(string $name, array $body = []): array
    {
        return $this->send('POST', 'rest/v1/rpc/'.$name, $body ?: (object) []);
    }

    private function send(string $method, string $path, array|object $body = [], array $query = [], array $headers = [], bool $authenticated = true): array
    {
        if (! $this->configured()) {
            return ['data' => null, 'error' => ['message' => 'Service is not configured.'], 'status' => 503];
        }
        try {
            $client = Http::baseUrl(rtrim(config('schedflow.supabase_url'), '/').'/')
                ->acceptJson()->asJson()->connectTimeout(5)->timeout(20)
                ->withHeaders(['apikey' => config('schedflow.supabase_key'), ...$headers]);
            if ($authenticated && $this->token()) {
                $client = $client->withToken($this->token());
            }
            $options = $method === 'GET' ? [] : ['json' => $body];
            if ($query) {
                $options['query'] = $query;
            }
            $response = $client->send($method, $path, $options);

            return [
                'data' => $response->successful() ? $response->json() : null,
                'error' => $response->successful() ? null : ($response->json() ?: ['message' => 'Service request failed.']),
                'status' => $response->status(),
            ];
        } catch (ConnectionException) {
            return ['data' => null, 'error' => ['message' => 'Service is unavailable.'], 'status' => 503];
        }
    }
}
