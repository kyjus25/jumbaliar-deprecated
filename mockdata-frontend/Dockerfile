FROM nginx:alpine

RUN apk add --update npm

WORKDIR /tmp/builder

COPY . .

RUN npm install

RUN npm run build

RUN mv ./dist/mockdata-frontend/* /usr/share/nginx/html

RUN rm -rf /tmp/builder

WORKDIR /usr/share/nginx/html

RUN ls /usr/share/nginx/html

# When the container starts, replace the env.js with values from environment variables
CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/assets/spa-env.template.js > /usr/share/nginx/html/assets/spa-env.js && exec nginx -g 'daemon off;'"]

EXPOSE 80
