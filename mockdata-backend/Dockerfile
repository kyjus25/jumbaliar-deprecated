FROM keymetrics/pm2:latest-alpine

WORKDIR /node

COPY . .

CMD [ "pm2-runtime", "start", "pm2.json" ]

EXPOSE 80
