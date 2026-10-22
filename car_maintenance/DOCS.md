# Car Maintenance

The same app as the home-server version, running inside Home Assistant: fuel log and consumption, services and parts, reminders and key dates (visite technique, insurance, road tax, oil changes from your weekly odometer), documents and tire sets, faults, garages and quotes, trips, costs and forecasts, receipt reading, email reminders and a calendar feed.

## Install

1. In Home Assistant: **Settings → Add-ons → Add-on Store**.
2. Menu **⋮ → Repositories**, add `https://github.com/aziz-011/car_maintenace` and close.
3. Find **Car Maintenance** in the store (refresh the page if needed), open it and **Install**. Home Assistant builds it on the device; this takes a minute or two.
4. Turn on **Start on boot**, **Watchdog** and **Show in sidebar**, then **Start**.
5. Open **Car Maintenance** from the sidebar. It also works in the Home Assistant app on your phone.

## Configuration

**Address for email links** (`app_url`): the address your phone uses to reach the app directly, for example `http://homeassistant.local:8080`. It is put in reminder emails and used for the calendar feed and the phone shortcut links in Settings, which can't go through the Home Assistant login. Leave it empty if you don't need those.

**Network → 8080/tcp**: the direct address on your home network (no Home Assistant login, like the PC version). Remove the port number to allow access only through Home Assistant. Change it if another add-on already uses 8080.

Everything else (language, units, email reminders, the Claude API key for reading receipts) is set in the app's own **Settings**.

## Your data

- Saved in the add-on's folder, `/addon_configs/<id>_car_maintenance/` (visible with the **Samba share** or **File editor** add-ons): `car-data.json`, a daily copy in `backups/`, and photos in `files/`.
- Included in Home Assistant backups (full backups, or partial ones that include this add-on).
- Uninstalling the add-on can delete this folder: export a copy first (**Settings → Export JSON** in the app).

## Moving from the PC version

1. In the PC version: **Settings → Export JSON**.
2. In the add-on: **Settings → Import JSON** with that file.
3. Photos: copy the files in `C:\Users\<you>\CarMaintenance\files` on the PC into the `files` folder of the add-on's folder (Samba share `addon_configs`), so receipts and documents still show.
4. Email reminders and the receipt key are set again in the add-on's Settings, then stop the PC server so you don't get emails twice.

## Good to know

- Emails are sent from Home Assistant, so they work as long as it is running (no PC needed).
- Times (8:00 start for emails, the Sunday 18:00 check-in) follow the time zone set in Home Assistant.
- The direct port has no password: don't forward it on your router.
