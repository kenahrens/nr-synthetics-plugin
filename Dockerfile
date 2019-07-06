FROM node:10

RUN useradd -d /newrelic -m -s /bin/bash -U newrelic
COPY . /newrelic
USER newrelic
WORKDIR /newrelic

RUN npm install

CMD ["/bin/sh", "-c", "npm start"]
