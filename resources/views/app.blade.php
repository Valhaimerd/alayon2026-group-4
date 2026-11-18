<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="Explore rooms and published class schedules.">
        <meta name="theme-color" content="#18563f">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" href="/icon-192.png" type="image/png">
        <title inertia>Building explorer - CISC SchedFlow</title>
        @viteReactRefresh
        @vite('resources/js/app.tsx')
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
