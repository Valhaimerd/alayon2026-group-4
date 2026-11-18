<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ExploreController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\SmsController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->file(public_path('welcome.html')));
Route::redirect('/welcome', '/');
Route::redirect('/staff', '/explore?signin=1');
Route::get('/explore', ExploreController::class)->block(30, 30)->name('explore');

// Stateful web routes retain Laravel CSRF protection. Lock each session across token rotation.
Route::prefix('actions')->middleware('throttle:120,1')->group(function () {
    Route::post('/login', [AccountController::class, 'login'])->middleware('throttle:10,1')->block(30, 30);
    Route::post('/logout', [AccountController::class, 'logout'])->block(30, 30);
    Route::post('/bookings/save', [BookingController::class, 'save'])->block(30, 30);
    Route::post('/bookings/publish', [BookingController::class, 'publish'])->block(30, 30);
    Route::post('/notices/retry', [BookingController::class, 'retry'])->block(30, 30);
    Route::post('/setup/{operation}', SetupController::class)->whereIn('operation', ['term', 'section', 'instructor'])->block(30, 30);
    Route::post('/account/profile', [AccountController::class, 'profile'])->block(30, 30);
    Route::post('/account/password', [AccountController::class, 'password'])->middleware('throttle:10,1')->block(30, 30);
    Route::post('/account/totp/enroll', [AccountController::class, 'enroll'])->block(30, 30);
    Route::post('/account/totp/verify', [AccountController::class, 'verify'])->middleware('throttle:10,1')->block(30, 30);
    Route::post('/account/totp/remove', [AccountController::class, 'remove'])->block(30, 30);
    Route::post('/account/sms/request', [SmsController::class, 'requestCode'])->middleware('throttle:10,1')->block(30, 30);
    Route::post('/account/sms/verify', [SmsController::class, 'verify'])->middleware('throttle:10,1')->block(30, 30);
    Route::post('/account/sms/disable', [SmsController::class, 'disable'])->block(30, 30);
});
