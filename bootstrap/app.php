<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PrivateWorkspace;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            PrivateWorkspace::class,
        ]);
        // Preserve passwords exactly and never flash security inputs into session history.
        $middleware->trimStrings(except: ['password', 'confirmation', 'currentPassword']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['password', 'confirmation', 'currentPassword', 'code']);
    })->create();
