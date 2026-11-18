<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class Schedule
{
    public const MAX_OCCURRENCES = 150;

    public static function validDate(mixed $value): bool
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) {
            return false;
        }
        [$year, $month, $day] = array_map('intval', explode('-', $value));

        return checkdate($month, $day, $year);
    }

    public static function expand(mixed $input): array
    {
        if (! is_array($input) || array_is_list($input)) {
            return ['error' => 'Choose a valid schedule.'];
        }
        if (! in_array($input['mode'] ?? null, ['once', 'weekly'], true)) {
            return ['error' => 'Choose a one-date or weekly schedule.'];
        }
        // JSON is decoded with objects intact so numeric weekday keys are not mistaken for a list.
        $times = $input['times'] ?? null;
        if (! is_object($times)) {
            return ['error' => 'Choose valid start and end times.'];
        }
        $timeFor = static function (int $day) use ($times): ?array {
            $time = $times->{(string) $day} ?? null;
            if (! is_object($time)) {
                return null;
            }
            $start = $time->start ?? null;
            $end = $time->end ?? null;

            return is_string($start) && is_string($end)
                && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D', $start)
                && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D', $end) && $end > $start
                ? ['start' => $start, 'end' => $end] : null;
        };
        if ($input['mode'] === 'once') {
            if (! self::validDate($input['date'] ?? null)) {
                return ['error' => 'Choose a valid date.'];
            }
            $time = $timeFor(CarbonImmutable::parse($input['date'], 'Asia/Manila')->dayOfWeek);

            return $time ? ['occurrences' => [['date' => $input['date'], ...$time]]]
                : ['error' => 'Choose a start time and a later end time.'];
        }
        if (! self::validDate($input['from'] ?? null) || ! self::validDate($input['until'] ?? null) || $input['until'] < $input['from']) {
            return ['error' => 'Choose a first date and a last date on or after it.'];
        }
        $days = $input['days'] ?? null;
        if (! is_array($days) || array_filter($days, fn ($day) => ! is_int($day) || $day < 0 || $day > 6)) {
            return ['error' => 'Choose valid days of the week.'];
        }
        if (! $days) {
            return ['error' => 'Choose at least one day of the week.'];
        }
        foreach ($days as $day) {
            if (! $timeFor($day)) {
                return ['error' => 'Each selected day needs a start time and a later end time.'];
            }
        }
        $occurrences = [];
        $last = CarbonImmutable::parse($input['until'], 'Asia/Manila');
        for ($date = CarbonImmutable::parse($input['from'], 'Asia/Manila'); $date <= $last; $date = $date->addDay()) {
            if (in_array($date->dayOfWeek, $days, true)) {
                $occurrences[] = ['date' => $date->toDateString(), ...$timeFor($date->dayOfWeek)];
            }
            if (count($occurrences) > self::MAX_OCCURRENCES) {
                return ['error' => 'A series can have at most 150 classes. Shorten the date range.'];
            }
        }

        return $occurrences ? ['occurrences' => $occurrences] : ['error' => 'No selected weekday falls within those dates.'];
    }

    public static function booking(array $row): array
    {
        $start = CarbonImmutable::parse($row['starts_at'])->setTimezone('Asia/Manila');
        $end = CarbonImmutable::parse($row['ends_at'])->setTimezone('Asia/Manila');
        $result = ['id' => $row['id'], 'roomId' => $row['room_id'], 'title' => $row['title'],
            'instructor' => $row['instructor_name'], 'date' => $start->toDateString(), 'start' => $start->format('H:i'), 'end' => $end->format('H:i')];
        foreach (['published' => 'published', 'instructor_id' => 'instructorId', 'class_size' => 'classSize', 'kind' => 'kind',
            'class_code' => 'classCode', 'course' => 'course', 'units' => 'units', 'subject_code' => 'subjectCode',
            'subject_name' => 'subjectName', 'year_level' => 'yearLevel', 'term_id' => 'termId', 'section_id' => 'sectionId'] as $key => $target) {
            if (array_key_exists($key, $row)) {
                $result[$target] = $row[$key];
            }
        }

        return $result;
    }

    public static function saveError(?array $error): string
    {
        $message = $error['message'] ?? '';
        if (($error['code'] ?? '') === '23P01') {
            return str_contains($message, 'instructor_no_overlap') ? 'This instructor already has a published class at that time.' : 'This room already has a published booking at that time.';
        }
        if (str_contains($message, 'capacity')) {
            return 'Class size exceeds room capacity.';
        }
        if (($error['code'] ?? '') === '23514') {
            return 'Check the date, times, and class size. Bookings must start and end on the same day.';
        }
        foreach (['Choose an active instructor with a confirmed account', 'Every meeting must fall within the academic term dates',
            'Choose an active component belonging to the subject and section', 'Subject year, semester and track must match the section',
            'Map this legacy class to a subject and instructor before republishing or editing', 'Choose a valid section', 'Choose a valid subject offering'] as $safe) {
            if (str_contains($message, $safe)) {
                return $safe.'.';
            }
        }

        return 'Could not save. Check your selections and try again.';
    }
}
