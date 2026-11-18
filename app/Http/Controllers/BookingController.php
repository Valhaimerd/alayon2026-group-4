<?php

namespace App\Http\Controllers;

use App\Services\AccountSession;
use App\Services\SmsService;
use App\Services\SupabaseClient;
use App\Support\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    private function fail(string $message): JsonResponse
    {
        return response()->json(['ok' => false, 'message' => $message]);
    }

    public function save(Request $request, AccountSession $accounts, SupabaseClient $db, SmsService $sms): JsonResponse
    {
        if ($denied = $accounts->requireRole('registrar')) {
            return $this->fail($denied);
        }
        $schedule = json_decode($request->string('schedule')->toString());
        $input = is_object($schedule) ? get_object_vars($schedule) : null;
        $id = $request->string('id')->toString();
        if ($id && ($input['mode'] ?? null) !== 'once') {
            return $this->fail('An existing booking can only be moved to one date.');
        }
        $expanded = Schedule::expand($input);
        if (isset($expanded['error'])) {
            return $this->fail($expanded['error']);
        }
        $roomId = $request->string('room')->toString();
        $room = $db->select('rooms', ['select' => 'capacity', 'id' => 'eq.'.$roomId, 'limit' => 1])['data'][0] ?? null;
        if (! $room) {
            return $this->fail('Choose a valid room.');
        }
        $size = filter_var($request->input('size'), FILTER_VALIDATE_INT);
        if ($size === false || $size < 1 || $size > $room['capacity']) {
            return $this->fail('Class size must be positive and within room capacity.');
        }
        $slots = array_map(fn ($o) => ['start' => $o['date'].'T'.$o['start'].':00+08:00', 'end' => $o['date'].'T'.$o['end'].':00+08:00'], $expanded['occurrences']);
        $published = $request->input('published') === 'on';
        $kind = $request->input('kind', 'class');
        if ($kind === 'class') {
            $result = $db->rpc('save_class_booking', [
                'p_id' => $id ?: null, 'p_section' => $request->string('section')->toString(),
                'p_parent' => $request->string('parent')->toString(), 'p_component' => $request->string('component')->toString(),
                'p_class_code' => $request->string('classCode')->toString(), 'p_instructor' => $request->string('instructor')->toString(),
                'p_room' => $roomId, 'p_size' => $size, 'p_published' => $published, 'p_slots' => $slots,
            ]);
            $saved = $result['data'] ?? 0;
        } elseif ($kind === 'activity') {
            $title = trim($request->string('title')->toString());
            if (! $title || mb_strlen($title) > 200) {
                return $this->fail('Enter an activity of at most 200 characters.');
            }
            $rows = array_map(fn ($s) => ['starts_at' => $s['start'], 'ends_at' => $s['end'], 'kind' => 'activity',
                'title' => $title, 'room_id' => $roomId, 'class_size' => $size, 'published' => $published,
                'instructor_id' => null, 'instructor_name' => 'Department activity', 'offering_id' => null, 'component_code' => null], $slots);
            $result = $db->write($id ? 'PATCH' : 'POST', 'bookings', $id ? $rows[0] : $rows, $id ? ['id' => 'eq.'.$id, 'select' => 'id'] : ['select' => 'id']);
            $saved = count($result['data'] ?? []);
        } else {
            return $this->fail('Choose Class or Department activity.');
        }
        if ($result['error'] || ! $saved) {
            return $this->fail(Schedule::saveError($result['error']).(count($slots) > 1 ? ' No classes in this series were saved.' : ''));
        }
        $notice = '';
        if ($id) {
            $pending = $db->select('sms_notifications', ['select' => 'id', 'booking_id' => 'eq.'.$id, 'state' => 'eq.pending']);
            foreach ($pending['data'] ?? [] as $n) {
                $notice = ' '.$sms->dispatch($db, $n['id']);
            }
        }
        $what = count($slots) > 1 ? count($slots).' classes' : 'Booking';

        return response()->json(['ok' => true, 'message' => ($published ? "$what saved and published." : "$what saved as draft. Not public until published.").$notice]);
    }

    public function publish(Request $request, AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        if ($denied = $accounts->requireRole('registrar')) {
            return $this->fail($denied);
        }
        $publish = $request->input('publish') === 'true';
        $result = $db->write('PATCH', 'bookings', ['published' => $publish], ['id' => 'eq.'.$request->string('id'), 'select' => 'id']);

        return $result['error'] || count($result['data'] ?? []) !== 1 ? $this->fail(Schedule::saveError($result['error']))
            : response()->json(['ok' => true, 'message' => $publish ? 'Booking published.' : 'Booking unpublished. It is no longer public.']);
    }

    public function retry(Request $request, AccountSession $accounts, SupabaseClient $db, SmsService $sms): JsonResponse
    {
        if ($denied = $accounts->requireRole('registrar')) {
            return $this->fail($denied);
        }
        $message = $sms->dispatch($db, $request->string('id')->toString());

        return response()->json(['ok' => str_starts_with($message, 'Instructor notice queued'), 'message' => $message]);
    }
}
