# EVTG Local Setup

This repo has two apps:

- `server`: Express + SQLite backend
- `mobile`: Expo React Native app

These steps are for running and testing everything locally on a Mac.

## Prerequisites

- Node.js LTS installed
- npm available
- Xcode installed if you want to use the iPhone Simulator
- Android Studio installed if you want to use the Android emulator

## 1. Install dependencies

Run this once from each app folder:

```sh
cd server
npm install
```

```sh
cd mobile
npm install
```

## 2. Seed the backend

The backend uses SQLite and stores its local data under `server/data` by default.

Run:

```sh
cd server
npm run seed
```

This creates the default local users:

- `admin` / `admin123`
- `worker1` / `field123`

If you already created extra users locally, they remain in `server/data/survey.db`.

## 3. Start the backend

Run:

```sh
cd server
npm start
```

By default the server starts on port `3000`. On startup it prints URLs like:

- `http://localhost:3000`
- `http://<your-mac-ip>:3000`

If port `3000` is already in use, the server will try the next ports automatically unless you set `PORT` explicitly.

## 4. Start the mobile app

In a second terminal:

```sh
cd mobile
npm start
```

Then choose one of:

- Press `i` for iPhone Simulator
- Press `a` for Android emulator
- Press `w` for web
- Scan the Expo QR code for a physical device

## 5. Enter the server address in the app

Use the address based on where the app is running:

- iPhone Simulator on the same Mac: `127.0.0.1:3000`
- Expo web on the same Mac: `127.0.0.1:3000`
- Android emulator: `10.0.2.2:3000`
- Physical phone on the same Wi-Fi: `<your-mac-ip>:3000`

Examples:

- `127.0.0.1:3000`
- `10.0.2.2:3000`
- `192.168.1.23:3000`

Do not use `localhost` on a physical phone. On a phone, `localhost` points to the phone itself, not your Mac.

To get your Mac Wi-Fi IP:

```sh
ipconfig getifaddr en0
```

If that returns nothing, check other interfaces:

```sh
ifconfig | rg "inet "
```

## 6. Log in

Use one of the seeded test accounts:

- Admin: `admin` / `admin123`
- Field worker: `worker1` / `field123`

## Local data

Important local files:

- SQLite database: `server/data/survey.db`
- SQLite sidecar files: `server/data/survey.db-shm`, `server/data/survey.db-wal`
- Uploaded files: `server/data/uploads`

If you want a clean local reset, stop the server and remove the DB files from `server/data`, then run the seed again.

## Troubleshooting

### Login succeeds but the app stays on the login screen

Restart the mobile app after pulling the latest changes. If the install has stale auth data, clear app storage or reinstall the Expo app/simulator build once.

### Server cannot be reached

Check:

- the backend is running
- you entered the correct port
- the phone and Mac are on the same Wi-Fi
- you used your Mac IP, not `localhost`, on a physical device

Test the backend directly in a browser:

```text
http://127.0.0.1:3000/api/health
```

You should get a JSON response with `"status": "ok"`.

### Port 3000 is already in use

Either stop the conflicting process or use the port that the server prints on startup. The app must use the same port.
