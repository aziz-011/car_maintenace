# Car Maintenance

A small web app to track your car's fuel consumption, services and upcoming maintenance.

## Features

- **Oil changes**: every car gets an oil change reminder (every 7,500 km by default). Log the oil change with its odometer reading and the next one is set from there.
- **Odometer check-in**: add a reading once a week (Update odometer). The app works out how much you drive per week and the approximate date of the next oil change.
- **Calendar**: key dates and the estimated oil change date as calendar events (subscribe link and .ics file on the home server; Google Calendar via Claude on claude.ai).
- **Vehicles**: track several cars and switch between them. Pick from 78 makes and their models, or type your own.
- **Fuel log**: date, odometer, liters, price and total (price/L and total fill each other in), station (suggestions from 60+ fuel brands), notes.
  Consumption (L/100 km) uses the full-tank method: fuel added between two full fill-ups divided by the distance driven. Partial fills are counted in the next full tank.
- **Service history**: type of job (periodic service, repair, inspection…), the parts replaced (picked from a grouped list: filters, fluids, brakes, engine, suspension…), cost, garage and notes.
- **Reminders & key dates**: either on a date (insurance, technical inspection / visite technique, road tax…, with a Renew button) or every N km and/or N months (resets when you log that service or replace that part). Overdue and due-soon items appear on the overview.
- **Email reminders** (home server): get an email when something is coming up, a week before, and when it is overdue, plus an optional weekly backup by email.
- **Overview**: odometer, average and last-tank consumption, fuel cost per km, total spent, a consumption chart and recent activity.
- **Backup**: on the home server, data is saved in one file on your PC with a daily backup. The single-file version saves in your browser. Both can export and import a JSON backup from Settings.

Works on desktop and phone (bottom tab bar on small screens).

## Use it on claude.ai (no PC needed)

Open **https://claude.ai/artifact/D1eAVvzCYyEhfd9KmmMVQB** while signed in to Claude, on any device. Your data is saved privately in your Claude account, so it is the same on your phone and your PC. Email reminders need the home server below; everything else works on claude.ai.

To update that page after changing the code: `npm run build:claude`, then publish `dist-claude/car-maintenance.html` to the same artifact.

## Run it on your PC for your whole network

The app runs on your PC and you open it from any phone, tablet or computer on the same Wi-Fi. All devices share the same data, saved in a file on the PC.

### 1. One-time setup

1. Install **Node.js** (the LTS version) from https://nodejs.org.
2. Get this project onto your PC: on GitHub, **Code → Download ZIP**, then unzip it (or `git clone` it).

### 2. Start the server

- **Windows:** double-click `start-server.bat`.
- **Mac / Linux:** run `./start-server.sh` in a terminal.

The first start installs what's needed (about a minute). When it's ready, the window shows something like:

```
  On this PC:        http://localhost:8080
  On your network:   http://192.168.1.20:8080
```

Keep that window open while you use the app.

### 3. Open it from your devices

- On the PC: open http://localhost:8080
- On your phone or another device on the same Wi-Fi: open the **On your network** address.
- On a phone you can add it to the home screen (Share → Add to Home Screen, or the browser menu → Add to home screen).

If Windows asks whether to allow Node.js on networks, choose **Private networks** and allow it. If another device can't connect, that firewall prompt is usually why.

### Start it automatically with Windows

Press `Win + R`, type `shell:startup` and press Enter. In the folder that opens, create a shortcut to `start-server.bat`. The server then starts every time you log in.

### Email reminders

1. Create a free account with an email service and copy its API key:
   - **Resend** (simplest): sign up at https://resend.com with the email you want reminders on, then **API Keys → Create API key**. Keep the From address as `onboarding@resend.dev` and set To to the email you signed up with.
   - **Brevo**: sign up at https://brevo.com, then **SMTP & API → API Keys**. Add your own address as a sender (Senders & IP → Senders) and use it as From.
2. In the app: **Settings → Email reminders**, tick the box, paste the key, fill in To, then **Send test email**.

Every Sunday evening (you can pick the day) you also get a **weekly check-in** asking for your odometer readings, with each car's km per week, the next oil change and what is coming up in the next 60 days.

You get an email when a reminder is 30 days away (you can change this), again a week before, and when it is overdue, never twice for the same thing. Emails are sent by the PC running the server, between 8:00 and midnight, so it must be on. The API key is stored only on that PC.

### Your data is safe

- **Where:** `C:\Users\<you>\CarMaintenance` on Windows (`~/CarMaintenance` on Mac/Linux), outside the app folder, so updating or re-downloading the app never touches it. Data from older versions (in the app's `data` folder) is moved there automatically on first start.
- **Daily backups:** in `CarMaintenance\backups`, one per day, last 60 days.
- **Weekly email backup:** with email reminders on, a copy of your data is emailed every week. If the PC dies, restore it with **Settings → Import JSON**.
- **Changes while the PC is off** are kept in the browser and sent when it is back, even if you close the page.
- For extra safety, set `DATA_DIR` to a folder synced by OneDrive / Google Drive before starting, e.g. `set DATA_DIR=%USERPROFILE%\OneDrive\CarMaintenance`.

### Good to know

- **Fixed address:** your PC's network address can change after a router restart. To keep it the same, reserve an IP for your PC in your router's settings (often called "DHCP reservation").
- **Another port:** set `PORT` before starting, e.g. `set PORT=3000` (Windows) or `PORT=3000 ./start-server.sh`.
- **Security:** anyone on your Wi-Fi can open the app, and there is no password. Don't expose the port to the internet (no port forwarding on your router).
- **Moving data from the single-file version:** in the old file, Settings → Export JSON. Then in the server version, Settings → Import JSON.

## Single-file version

[`car-maintenance.html`](car-maintenance.html) is the whole app in one file. Open it in any browser, no server needed; data is saved in that browser only.

## Development

```bash
npm install
npm run dev      # dev server; run `npm start` too so data requests reach the API
npm test         # unit tests (consumption and reminder logic)
npm run lint
npm run build    # production build in dist/
npm run build:single  # standalone car-maintenance.html (open it directly, no server)
npm run build:claude  # the claude.ai version in dist-claude/
npm start        # run the home server (built to dist-server/ by npm run build)
```

Built with React, TypeScript and Vite.
