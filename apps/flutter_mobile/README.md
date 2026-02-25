# Flutter Mobile App

This folder contains a Flutter implementation of the SchoolApp mobile experience, wired to the same backend APIs used by the web/mobile app.

## What is implemented

- Session restore and token persistence (same JWT flow)
- Role selection and login (`/auth/login`)
- Session validation (`/auth/session`)
- Profile fetch (`/auth/profile`)
- Role-based home dashboards:
  - Student overview
  - Teacher overview
  - Admin overview (`/admin/dashboard`)
  - Parent/guest summary + pocket-money top-up (`/pocket-money/parent-summary`, `/pocket-money/topup`)

## API base URL

Default behavior follows the existing mobile logic:

- Web: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Other platforms: `http://localhost:5000/api`

Override with:

```bash
flutter run --dart-define=APP_API_URL=http://YOUR_HOST:5000/api
```

## Run steps

1. Install Flutter SDK.
2. In this folder, run:

```bash
flutter create .
flutter pub get
flutter run
```

`flutter create .` will generate platform folders (`android`, `ios`, etc.) while preserving the app source in `lib/`.
