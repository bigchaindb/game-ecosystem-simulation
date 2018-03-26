FROM node
COPY . /app
WORKDIR /app
RUN apt-get update && \
    apt-get install -y libzmq-dev && \
    npm install
CMD ["npm","run","start"]
