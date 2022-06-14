FROM docker-registry.wikimedia.org/buster-nodejs10-devel
RUN apt-get update && apt-get install -y librsvg2-dev build-essential && rm -rf /var/lib/apt/lists/*
RUN mkdir /opt/service
ADD . /opt/service
WORKDIR /opt/service
ENV HOME=/root LINK=g++
RUN npm install && npm dedupe
ENV IN_DOCKER=1
CMD npm start
