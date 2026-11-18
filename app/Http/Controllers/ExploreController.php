<?php

namespace App\Http\Controllers;

use App\Services\AccountSession;
use App\Services\SupabaseClient;
use App\Support\Schedule;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExploreController extends Controller
{
    private const COLUMNS = 'id,room_id,title,instructor_name,starts_at,ends_at,published,instructor_id,class_size,kind,class_code,course,units,subject_code,subject_name,year_level,term_id,section_id';

    public function __invoke(Request $request, SupabaseClient $db, AccountSession $accounts): Response
    {
        if ($request->session()->pull('clear_inertia_history', false)) {
            Inertia::clearHistory();
        }
        $date = Schedule::validDate($request->query('date')) ? $request->query('date') : CarbonImmutable::now('Asia/Manila')->toDateString();
        $props = ['initialDate' => $date];
        if (! $db->configured()) {
            return Inertia::render('Explore', $props);
        }
        $session = $accounts->resolve();
        $user = $session['user'];
        $roleResult = $user && ! $session['error'] ? $db->select('account_roles', ['select' => 'role', 'user_id' => 'eq.'.$user['id']]) : ['data' => [], 'error' => null];
        $roles = array_column($roleResult['data'] ?? [], 'role');
        $registrar = in_array('registrar', $roles, true);
        $admin = in_array('administrator', $roles, true);
        $instructor = in_array('instructor', $roles, true);
        $props['account'] = ! $user ? null : ($registrar ? 'staff' : ($instructor ? 'instructor' : ($admin ? 'administrator' : 'nonstaff')));
        if ($user) {
            $props['profile'] = [
                'email' => $user['email'] ?? '', 'name' => $user['user_metadata']['display_name'] ?? '',
                'role' => $registrar ? 'Registrar' : ($instructor ? 'Faculty' : ($admin ? 'Administrator' : 'Account holder')),
                'needsVerification' => $session['needsVerification'], 'sms' => ['pending' => null, ...($session['sms'] ?? [])],
                'factors' => array_values(array_map(fn ($f) => ['id' => $f['id'], 'name' => $f['friendly_name'] ?? 'Authenticator'],
                    array_filter($user['factors'] ?? [], fn ($f) => $f['factor_type'] === 'totp' && $f['status'] === 'verified'))),
            ];
        }
        $start = CarbonImmutable::parse($date, 'Asia/Manila')->startOfDay();
        $published = $this->loadDay($db, 'published_schedule', '*', $start);
        $private = $registrar || $instructor ? $this->loadDay($db, 'bookings', self::COLUMNS, $start) : ['data' => [], 'error' => null];
        $recent = $registrar || $instructor ? $db->select('bookings', ['select' => self::COLUMNS, 'order' => 'starts_at.desc,id.asc', 'limit' => 100]) : ['data' => [], 'error' => null];
        $rows = [];
        foreach ([...($published['data'] ?? []), ...($private['data'] ?? [])] as $row) {
            $rows[$row['id']] = Schedule::booking($row);
        }
        $props['publishedBookings'] = array_values($rows);
        $props['loadError'] = (bool) ($published['error'] || $private['error']);
        $academic = ['components' => [], 'terms' => [], 'sections' => []];
        $setupError = false;
        if ($registrar || $admin) {
            $components = $db->select('subject_components', ['select' => 'code,title,units,parent_code,year_level,semester,track,active', 'curriculum_id' => 'eq.bsit-provisional-2026', 'order' => 'code.asc']);
            $terms = $db->select('academic_terms', ['select' => '*', 'order' => 'starts_on.desc']);
            $sections = $db->select('class_sections', ['select' => '*', 'order' => 'name.asc']);
            $academic = ['components' => array_map(fn ($c) => ['code' => $c['code'], 'title' => $c['title'], 'units' => $c['units'],
                'parentCode' => $c['parent_code'], 'year' => $c['year_level'], 'semester' => $c['semester'], 'track' => $c['track'], 'active' => $c['active']], $components['data'] ?? []),
                'terms' => $terms['data'] ?? [], 'sections' => $sections['data'] ?? []];
            $setupError = (bool) ($components['error'] || $terms['error'] || $sections['error']);
        }
        if ($registrar) {
            $instructors = $db->select('assignable_instructors', ['select' => 'id,name,instructor_code', 'order' => 'name.asc']);
            $notices = $db->select('sms_notifications', ['select' => 'id,title,room_name,starts_at,state', 'order' => 'created_at.desc', 'limit' => 20]);
            $props['staff'] = [...$academic, 'instructors' => $instructors['data'] ?? [],
                'notices' => array_map(fn ($n) => ['id' => $n['id'], 'title' => $n['title'], 'roomName' => $n['room_name'],
                    'startsAt' => CarbonImmutable::parse($n['starts_at'])->setTimezone('Asia/Manila')->format('Y-m-d H:i'), 'state' => $n['state']], $notices['data'] ?? []),
                'recent' => array_map([Schedule::class, 'booking'], $recent['data'] ?? []), 'smsEnabled' => config('schedflow.sms_enabled'),
                'setupError' => $setupError || (bool) ($instructors['error'] || $notices['error'] || $recent['error'])];
        }
        if ($admin) {
            $profiles = $db->select('instructors', ['select' => 'id,name,instructor_code,active', 'order' => 'name.asc']);
            $props['administration'] = [...$academic, 'profiles' => $profiles['data'] ?? []];
        }
        if ($instructor && ! $registrar) {
            $props['assignments'] = array_map([Schedule::class, 'booking'], $recent['data'] ?? []);
            $props['assignmentsError'] = (bool) $recent['error'];
        }
        $props['accessError'] = (bool) $roleResult['error'];
        $props['openSignIn'] = $request->query('signin') === '1' && ! $user;

        return Inertia::render('Explore', $props);
    }

    private function loadDay(SupabaseClient $db, string $table, string $columns, CarbonImmutable $start): array
    {
        $rows = [];
        for ($offset = 0; ; $offset += 500) {
            $result = $db->select($table, ['select' => $columns,
                'and' => '(starts_at.gte.'.$start->toIso8601String().',starts_at.lt.'.$start->addDay()->toIso8601String().')',
                'order' => 'starts_at.asc,id.asc', 'offset' => $offset, 'limit' => 500]);
            if ($result['error']) {
                return ['data' => [], 'error' => true];
            }
            $page = $result['data'] ?? [];
            array_push($rows, ...$page);
            if (count($page) < 500) {
                return ['data' => $rows, 'error' => null];
            }
        }
    }
}
