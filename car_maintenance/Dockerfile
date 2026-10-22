# The app is already built (app/ is made by `npm run build:addon`), so the image
# only needs Node.js: no npm install on the Home Assistant device.
FROM node:22-alpine

ENV NODE_ENV=production \
    DATA_DIR=/config \
    PORT=8080

WORKDIR /app
COPY app/ /app/
COPY run.sh /run.sh
RUN chmod a+x /run.sh

LABEL io.hass.type="addon" \
      io.hass.name="Car Maintenance"

CMD ["/run.sh"]
