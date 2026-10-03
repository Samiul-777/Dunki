<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use App\Services\DestinationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'required|string|unique:users,phone',
            'password' => 'required|string|min:8',
            'role' => 'required|in:worker,agency,nominee',
            'destination' => 'nullable|string|max:255',
            'agency' => 'nullable|string|max:255',
        ]);

        $result = $this->authService->register($data);

        return response()->json($result, 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $result = $this->authService->login($data['email'], $data['password']);

        return response()->json($result);
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function destination(Request $request, DestinationService $destinationService)
    {
        return response()->json($destinationService->forUser($request->user()));
    }

    public function updateDestination(Request $request, DestinationService $destinationService)
    {
        $data = $request->validate([
            'destination' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $user->destination = $destinationService->normalize($data['destination'] ?? null);
        $user->save();

        return response()->json($destinationService->forUser($user->refresh()));
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();
        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = $data['new_password'];
        $user->save();

        return response()->json(['message' => 'Password updated successfully.']);
    }
}
