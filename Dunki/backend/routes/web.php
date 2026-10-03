<?php

use Illuminate\Support\Facades\Route;

// Serve the built React app (frontend/ -> public/app) for every non-API path.
Route::get('/{any?}', fn () => response()->file(public_path('app/index.html')))
    ->where('any', '(?!api/|up$).*');
