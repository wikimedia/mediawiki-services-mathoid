FROM docker-registry.wikimedia.org/nodejs16-slim
RUN mkdir /opt/service
ADD . /opt/service
WORKDIR /opt/service
RUN npm install && npm dedupe
ENV IN_DOCKER=1
CMD npm start
