<?php

return [
    'supabase_url' => env('SUPABASE_URL', env('NEXT_PUBLIC_SUPABASE_URL')),
    'supabase_key' => env('SUPABASE_PUBLISHABLE_KEY', env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')),
    'sms_key' => env('HATURIKOSMS_API_KEY'),
    'sms_secret' => env('ACCOUNT_SMS_SERVER_SECRET'),
    'sms_enabled' => filter_var(env('HATURIKOSMS_SEND_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'schedule_url' => env('SCHEDULE_PUBLIC_URL', env('NEXT_PUBLIC_SITE_URL', env('APP_URL'))),
];
