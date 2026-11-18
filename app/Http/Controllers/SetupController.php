<?php

namespace App\Http\Controllers;

use App\Services\AccountSession;
use App\Services\SupabaseClient;
use App\Support\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SetupController extends Controller
{
    public function __invoke(string $operation, Request $request, AccountSession $accounts, SupabaseClient $db): JsonResponse
    {
        if ($denied = $accounts->requireRole('administrator')) {
            return response()->json(['ok' => false, 'message' => $denied]);
        }
        $name = trim($request->string('name')->toString());
        if ($operation === 'term') {
            $starts = $request->input('starts');
            $ends = $request->input('ends');
            $semester = filter_var($request->input('semester'), FILTER_VALIDATE_INT);
            if (! $name || mb_strlen($name) > 80 || ! Schedule::validDate($starts) || ! Schedule::validDate($ends) || $ends < $starts || ! in_array($semester, [1, 2], true)) {
                return response()->json(['ok' => false, 'message' => 'Enter a term name, semester and valid first/last dates.']);
            }
            $result = $db->write('POST', 'academic_terms', ['name' => $name, 'starts_on' => $starts, 'ends_on' => $ends, 'semester' => $semester]);
            $message = $result['error'] ? (($result['error']['code'] ?? '') === '23505' ? 'That term name already exists.' : 'Could not create the term.') : 'Academic term created.';
        } elseif ($operation === 'section') {
            $year = filter_var($request->input('year'), FILTER_VALIDATE_INT);
            if (! $name || mb_strlen($name) > 80 || $year === false || $year < 1 || $year > 4) {
                return response()->json(['ok' => false, 'message' => 'Enter a section name and a year level from 1 to 4.']);
            }
            $result = $db->write('POST', 'class_sections', ['name' => $name, 'year_level' => $year, 'track' => $request->input('track') ?: null,
                'term_id' => $request->input('term'), 'curriculum_id' => 'bsit-provisional-2026']);
            $message = $result['error'] ? (($result['error']['code'] ?? '') === '23505' ? 'That section already exists in this term.' : 'Choose a valid term and track.') : 'Class section created.';
        } else {
            $result = $db->rpc('provision_instructor', ['p_email' => $request->string('email')->toString(), 'p_code' => $request->string('code')->toString(),
                'p_name' => $name, 'p_active' => $request->input('active') === 'on']);
            $message = $result['error'] ? (str_contains($result['error']['message'] ?? '', 'confirm this account') ? 'Create and confirm this account in Supabase Auth first.' : 'Could not link the instructor. Check the name, account and unique instructor code.') : 'Instructor account linked. Existing history was preserved.';
        }

        return response()->json(['ok' => ! $result['error'], 'message' => $message]);
    }
}
