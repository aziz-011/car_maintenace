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

- **Français / English**: switch the language in Settings (or on the welcome screen). Service types, parts and reminders are translated too.
- **Currency and units**: TND (3 decimals) by default, or EUR, USD…; km or miles; L/100 km or km/L. Data is always stored in km and liters, so switching units never changes your history.
- **Service plan per engine**: pick the generation and engine (e.g. Golf IV 1.9 TDI) and the Car tab suggests the usual maintenance items: timing belt or chain, filters, fluids, spark or glow plugs… Adjust the intervals and add them as reminders in one go. The intervals are typical values; check them against your owner's manual or garage.
- **Receipt photos**: attach photos (or PDFs) to fill-ups and services. Photos are shrunk before saving.
- **Car documents**: carte grise, insurance, visite technique report, vignette… with their number, dates and photos. An expiry date updates the matching reminder.
- **Tires**: brand, size, season, when and at what odometer they were fitted, and the distance driven on each set. Fitting new tires marks the current set as removed. "Tire rotation" is a service type with its own reminder.
- **Costs**: spending per month (fuel and maintenance), a yearly table with cost per km, the fuel price over time and a station comparison (average price paid per liter, cheapest station).

- **Reading receipts**: take a photo of the fuel receipt and the fill-up form fills itself in (liters, price, total, station, date). On claude.ai Claude reads it; with the home server it needs a Claude API key (see below). Always check the values before saving.
- **Quick fill-up**: a new fill-up starts with your last station and price. With the home server, add `http://<PC address>:8080/?add=fuel` (or `?add=receipt`) to your phone's home screen to open straight on a new fill-up.
- **Works offline**: changes made without a connection are kept on the device and sent when the connection is back, on claude.ai and with the home server. The app also reopens with your data while the server is out of reach.
- **Unusual consumption alert**: a warning on the overview (and by email with the home server) when a tank uses more fuel than usual, 15% by default, set in Settings. Often an early sign of low tire pressure, a clogged air filter, dragging brakes or injector trouble.
- **Spending forecast**: the next 12 months of fuel (from your driving pace and cost per km) and each maintenance item that falls due, priced from the reminder's usual cost or the last service of that type.
- **Monthly fuel budget**: per car, with a meter on the overview and a warning (and an email) when it gets close or goes over.
- **Fault log**: warning lights, noises, leaks and OBD codes, linked to the repair that fixed them. A problem that comes back is marked "Seen 2 times".
- **Garage book**: garages and mechanics with phone, address, your rating, the jobs they did and what they charged; quotes for the same job side by side, cheapest first.
- **Trips**: work or personal, with the distance from two odometer readings if you like. Each year shows the work share of the driving, the fuel cost of work trips and the work share of all costs, for expense claims.
- **Family use**: everyone shares the same records (home Wi-Fi, or a shared claude.ai page) and each fill-up, service and trip shows who logged it, with totals per driver.
- **Compare cars**: consumption, fuel per km, all costs per km, distance per week and 12-month spending for each car.
- **Spreadsheets**: export fill-ups, services and trips as CSV for Excel (French uses `;` and decimal commas), and import them from another app or an old sheet. Columns are recognised in English or French; rows already logged are skipped.

Photos are stored on your PC in `CarMaintenance/files` with the home server, in the page's own storage on claude.ai, and inside the data in the single-file version (keep them small there: browser storage is limited).

Works on desktop and phone (bottom tab bar on small screens).

## Use it on claude.ai (no PC needed)

Open **https://claude.ai/artifact/D1eAVvzCYyEhfd9KmmMVQB** while signed in to Claude, on any device. Your data is saved in your Claude account, so it is the same on your phone and your PC. To share it with family, use the page's Share menu and let them use it: they add to the same records from their own Claude account. Email reminders need the home server below; everything else works on claude.ai.

To update that page after changing the code: `npm run build:claude`, then publish `dist-claude/car-maintenance.html` to the same artifact.

## Run it in Home Assistant

The app can run as a Home Assistant add-on, in the sidebar and in the Home Assistant phone app, with its data in Home Assistant backups and emails sent without a PC:

1. **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, add `https://github.com/aziz-011/car_maintenace`.
2. Install **Car Maintenance**, turn on **Show in sidebar**, and start it.

Details (direct address, moving your data from the PC version) are in [car_maintenance/DOCS.md](car_maintenance/DOCS.md).

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

### Reading receipts

Create a Claude API key at https://console.anthropic.com (**API keys → Create key**, with some credit on the account), then paste it in **Settings → Reading receipts**. A "Fill in from a receipt photo" button then appears when you add a fill-up. Each receipt costs about one cent. The key is stored only on the PC.

### Phone shortcut and offline use

**Settings → Phone shortcut** shows two links (new fill-up, new fill-up from a receipt). Open one on your phone and add it to the home screen. The app keeps a copy of your data on the phone: fill-ups added while away from the Wi-Fi are saved and sent once you are back. Browsers only let a page reopen with no connection at all over https (or on the PC itself as `localhost`), so on the phone keep the page open in a tab when you leave home.

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
npm test         # unit tests (consumption, reminders, forecast, CSV, alerts)
npm run lint
npm run build    # production build in dist/
npm run build:single  # standalone car-maintenance.html (open it directly, no server)
npm run build:claude  # the claude.ai version in dist-claude/
npm start        # run the home server (built to dist-server/ by npm run build)
npm run build:addon   # copy the build into the Home Assistant add-on (car_maintenance/app/)
```

Built with React, TypeScript and Vite.

To release a new add-on version: run `npm run build:addon`, raise `version` in `car_maintenance/config.yaml`, add a line to `car_maintenance/CHANGELOG.md`, and push. Home Assistant then offers the update.
