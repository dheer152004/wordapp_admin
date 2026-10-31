# Authentication session contract

The frontend keeps access tokens in memory and restores sessions with
`POST /api/auth/refresh`. The backend must set and rotate the refresh token in
an `HttpOnly`, `Secure`, `SameSite` cookie on login and refresh, and return the
access token as `{ "token": "..." }`. `POST /api/auth/logout` must clear or
revoke the refresh cookie.

For cross-origin deployments, the backend must allow credentialed requests from
the frontend origin. The frontend sends credentials with authentication
requests; it does not read or store the refresh token.
