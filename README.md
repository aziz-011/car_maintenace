# Car Maintenance

A small web app to track your car's fuel consumption, services and upcoming maintenance.

## Features

- **Vehicles**: track several cars and switch between them. Pick from 78 makes and their models, or type your own.
- **Fuel log**: date, odometer, liters, price and total (price/L and total fill each other in), station (suggestions from 60+ fuel brands), notes.
  Consumption (L/100 km) uses the full-tank method: fuel added between two full fill-ups divided by the distance driven. Partial fills are counted in the next full tank.
- **Service history**: type of job (periodic service, repair, inspection…), the parts replaced (picked from a grouped list: filters, fluids, brakes, engine, suspension…), cost, garage and notes.
- **Reminders**: repeat every N km and/or N months. A reminder can be for a service type or a part, and resets when you log that service or replace that part. Overdue and due-soon (within 1,000 km or 30 days) items appear on the overview.
- **Overview**: odometer, average and last-tank consumption, fuel cost per km, total spent, a consumption chart and recent activity.
- **Backup**: on the home server, data is saved in one file on your PC with a daily backup. The single-file version saves in your browser. Both can export and import a JSON backup from Settings.

Works on desktop and phone (bottom tab bar on small screens).

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

### Good to know

- **Your data** is in `data/car-data.json` inside the project folder. A copy is kept in `data/backups/` each day (the last 30 days). Copy the `data` folder to back it up.
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
npm start        # run the home server (serves dist/, API on /api)
```

Built with React, TypeScript and Vite.
