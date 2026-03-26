# FieldSurveyApp

## Backend on a Windows Office PC

Use the backend from the `server` folder.

1. Install Node.js LTS on the office PC.
2. Open Command Prompt in `server`.
3. Copy `.env.example` to `.env`.
4. Set `FIELD_SURVEY_DATA_DIR` to a stable local folder such as `C:\FieldSurvey\data`.
5. Set `PUBLIC_SERVER_URL` to the LAN address the phones will use, for example `http://192.168.1.100:3000`.
6. Run `npm install`.
7. Run `npm run seed` once.
8. Run `npm start` or `start-windows.cmd`.

The server stores SQLite data and uploaded files in the configured data directory and prints the LAN URLs on startup for use in the mobile app.
