<?php

namespace Tests\Unit;

use App\Http\Controllers\SmsController;
use App\Support\Schedule;
use PHPUnit\Framework\TestCase;

class ScheduleTest extends TestCase
{
    private function expand(array $input): array
    {
        return Schedule::expand(get_object_vars(json_decode(json_encode($input))));
    }

    public function test_dates_times_and_shapes_reject_invalid_input(): void
    {
        self::assertFalse(Schedule::validDate('2026-02-30'));
        self::assertTrue(Schedule::validDate('2028-02-29'));
        foreach ([null, [], 'weekly', ['mode' => 'other'], ['mode' => 'once', 'times' => []]] as $input) {
            self::assertArrayHasKey('error', Schedule::expand($input));
        }
        self::assertArrayHasKey('error', $this->expand(['mode' => 'once', 'date' => '2031-01-06', 'times' => (object) ['1' => ['start' => '10:00', 'end' => '09:00']]]));
    }

    public function test_sunday_and_distinct_weekday_times_are_preserved(): void
    {
        $result = $this->expand(['mode' => 'weekly', 'from' => '2026-11-09', 'until' => '2026-11-15', 'days' => [0, 1],
            'times' => (object) ['0' => ['start' => '13:00', 'end' => '15:00'], '1' => ['start' => '09:00', 'end' => '10:00']]]);
        self::assertSame([['date' => '2026-11-09', 'start' => '09:00', 'end' => '10:00'], ['date' => '2026-11-15', 'start' => '13:00', 'end' => '15:00']], $result['occurrences']);
    }

    public function test_series_limit_and_empty_ranges_are_rejected(): void
    {
        $input = ['mode' => 'weekly', 'from' => '2026-01-01', 'until' => '2030-12-31', 'days' => [1], 'times' => (object) ['1' => ['start' => '09:00', 'end' => '10:00']]];
        self::assertStringContainsString('150', $this->expand($input)['error']);
        self::assertArrayHasKey('error', $this->expand([...$input, 'from' => '2026-11-10', 'until' => '2026-11-10']));
    }

    public function test_phone_normalization_matches_existing_account_contract(): void
    {
        self::assertSame('+639123456789', SmsController::normalizePhone('0912 345 6789'));
        self::assertSame('+639123456789', SmsController::normalizePhone('639123456789'));
        self::assertNull(SmsController::normalizePhone('invalid'));
    }
}
