<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SmsService
{
    public function send(string $to, string $body, string $eventId): string
    {
        if (! config('schedflow.sms_key')) {
            throw new RuntimeException('SMS is not configured.');
        }
        $response = Http::withToken(config('schedflow.sms_key'))->acceptJson()->connectTimeout(5)->timeout(10)
            ->withHeaders(['Idempotency-Key' => $eventId])->post('https://sms.haturiko.tech/api/v1/messages', [
                'to' => $to, 'body' => $body, 'client_reference' => $eventId,
            ]);
        if (! $response->successful() || ! is_string($response->json('message.id'))) {
            throw new RuntimeException('SMS provider did not accept the message.');
        }

        return $response->json('message.id');
    }

    public function dispatch(SupabaseClient $db, string $id): string
    {
        if (! config('schedflow.sms_enabled')) {
            return 'SMS sending is disabled on this server; the instructor notice stays pending.';
        }
        $notice = $db->select('sms_notifications', ['select' => '*', 'id' => 'eq.'.$id, 'limit' => 1])['data'][0] ?? null;
        if (! $notice) {
            return 'Notice not found.';
        }
        if (! in_array($notice['state'], ['pending', 'failed'], true)) {
            return 'This notice is already '.$notice['state'].'.';
        }
        $bookingResult = $db->select('bookings', ['select' => 'published,starts_at,title,instructor_id,room_id', 'id' => 'eq.'.$notice['booking_id'], 'limit' => 1]);
        if ($bookingResult['error']) {
            return 'Could not verify this notice. Try again.';
        }
        $booking = $bookingResult['data'][0] ?? null;
        $room = $booking ? $db->select('rooms', ['select' => 'name', 'id' => 'eq.'.$booking['room_id'], 'limit' => 1]) : ['data' => [], 'error' => null];
        if ($room['error']) {
            return 'Could not verify this notice. Try again.';
        }
        if (! ($booking['published'] ?? false) || strtotime($booking['starts_at']) !== strtotime($notice['starts_at'])
            || $booking['title'] !== $notice['title'] || $booking['instructor_id'] !== $notice['instructor_id']
            || ($room['data'][0]['name'] ?? null) !== $notice['room_name']) {
            $db->write('PATCH', 'sms_notifications', ['state' => 'superseded'], ['id' => 'eq.'.$id]);

            return 'The booking changed since this notice was created, so it was superseded.';
        }
        if (time() - strtotime($notice['created_at']) > 23 * 3600) {
            return 'This notice is older than 23 hours. Contact the instructor directly.';
        }
        $instructor = $db->select('instructors', ['select' => 'phone,consent', 'id' => 'eq.'.$notice['instructor_id'], 'limit' => 1])['data'][0] ?? null;
        if (! ($instructor['phone'] ?? null) || ! ($instructor['consent'] ?? false)) {
            return 'The instructor has no consenting mobile number.';
        }
        try {
            $site = config('schedflow.schedule_url');
            if (! is_string($site) || ! str_starts_with($site, 'https://')) {
                throw new RuntimeException('Configure an HTTPS schedule link.');
            }
            $time = CarbonImmutable::parse($notice['starts_at'])->setTimezone('Asia/Manila')->format('M j, Y, g:i A');
            $providerId = $this->send($instructor['phone'], "{$notice['title']}: schedule updated to {$notice['room_name']}, {$time}. {$site}", $id);
            $saved = $db->write('PATCH', 'sms_notifications', ['state' => 'queued', 'provider_id' => $providerId], ['id' => 'eq.'.$id]);

            return $saved['error'] ? 'The provider accepted this notice, but its status could not be saved. Reconcile before retrying.' : 'Instructor notice queued. Queued does not confirm delivery.';
        } catch (\Throwable) {
            $db->write('PATCH', 'sms_notifications', ['state' => 'failed'], ['id' => 'eq.'.$id]);

            return 'Sending the instructor notice failed. The booking stays published; retry later.';
        }
    }
}
