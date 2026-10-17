# Car Maintenance

A small web app to track your car's fuel consumption, services and upcoming maintenance.

## Features

- **Vehicles**: track several cars and switch between them.
- **Fuel log**: date, odometer, liters, price and total (price/L and total fill each other in), station, notes.
  Consumption (L/100 km) uses the full-tank method: fuel added between two full fill-ups divided by the distance driven. Partial fills are counted in the next full tank.
- **Service history**: oil changes, filters, brakes, tires, inspection… with cost, garage and notes.
- **Reminders**: repeat every N km and/or N months. Logging a service with the same name resets the reminder. Overdue and due-soon (within 1,000 km or 30 days) items appear on the overview.
- **Overview**: odometer, average and last-tank consumption, fuel cost per km, total spent, a consumption chart and recent activity.
- **Backup**: data is stored in your browser (localStorage). Export and import a JSON backup from Settings.

Works on desktop and phone (bottom tab bar on small screens).

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # unit tests (consumption and reminder logic)
npm run lint
npm run build    # production build in dist/
```

Built with React, TypeScript and Vite.
