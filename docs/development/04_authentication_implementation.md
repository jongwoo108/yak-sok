# Google Login Implementation Guide

## Overview
This document outlines the implementation of Google Login functionality in the Yak-Sok application. The system uses Firebase Authentication on the frontend to obtain an ID Token, which is then sent to the Django backend for verification and user session creation.

## Architecture

1.  **Frontend (Next.js)**:
    *   Uses `firebase/auth` SDK to authenticate the user with Google.
    *   Obtains a Firebase ID Token.
    *   Sends a POST request to `/api/users/login/google/` with the ID Token.
2.  **Backend (Django)**:
    *   Receives the ID Token.
    *   Uses `firebase-admin` SDK to verify the token's validity.
    *   Extracts user information (`uid`, `email`, `name`, `picture`).
    *   Checks if the user exists in the PostgreSQL database; creates a new user if not.
    *   Generates JWT tokens (Access/Refresh) and returns them to the frontend.

## Implementation Details

### 1. Frontend Configuration (`src/services/firebase.ts`)
*   Initialized Firebase App with `firebaseConfig`.
*   Implemented `signInWithGoogle` function using `signInWithPopup`.
*   **Key Fix**: Resolved `CONFIGURATION_NOT_FOUND` error by ensuring the Google Sign-in provider is enabled in the Firebase Console and `localhost` is in the authorized domains.

### 2. Backend View (`apps/users/views.py`)
*   Created `GoogleLoginView` (APIView).
*   **Key Fixes**:
    *   **Firebase Initialization**: Added auto-initialization of `firebase_admin` in `apps/alerts/apps.py`'s `ready()` method to ensure the SDK is ready on server startup.
    *   **Clock Skew**: Added `clock_skew_seconds=60` to `verify_id_token` to handle time synchronization issues between the local development server and Firebase servers, resolving `InvalidIdTokenError: Token used too early`.

### 3. API Endpoint
*   **URL**: `/api/users/login/google/`
*   **Method**: `POST`
*   **Payload**:
    ```json
    {
        "id_token": "firebase_id_token_string"
    }
    ```
*   **Response (Success - 200 OK)**:
    ```json
    {
        "user": {
            "id": 1,
            "username": "user@example.com",
            "email": "user@example.com",
            "first_name": "User Name",
            ...
        },
        "tokens": {
            "refresh": "...",
            "access": "..."
        },
        "created": false
    }
    ```

## Troubleshooting Log

*   **Error 400 CONFIGURATION_NOT_FOUND**:
    *   **Cause**: Google Sign-in provider was disabled in Firebase Console.
    *   **Solution**: Enabled Google provider and authorized `localhost` domain.
*   **Error 401 Unauthorized (Response 1)**:
    *   **Cause**: `firebase_admin` SDK was not initialized in the backend application context.
    *   **Solution**: Added `FCMService.initialize()` in `AlertsConfig.ready()` in `apps.py`.
*   **Error 401 Unauthorized (Response 2 - InvalidIdTokenError)**:
    *   **Cause**: `Token used too early`. Local server time was slightly behind Google's server time (clock drift).
    *   **Solution**: Updated token verification to allow 60 seconds of skew: `verify_id_token(id_token, clock_skew_seconds=60)`.
