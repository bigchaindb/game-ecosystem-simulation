FROM node
WORKDIR /app
RUN apt-get update && \
    apt-get install -y libzmq-dev
CMD npm install && npm start
