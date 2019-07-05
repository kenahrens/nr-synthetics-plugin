FROM node:10

RUN useradd -d /newrelic -m -s /bin/bash -U newrelic
COPY . /newrelic
USER newrelic
WORKDIR /newrelic


CMD ["/bin/sh", "-c", "npm start"]
