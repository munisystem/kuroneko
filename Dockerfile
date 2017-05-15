FROM node:4

RUN apt-get update \
  && apt-get install -y --no-install-recommends sudo zip make gcc g++ libc-dev python \

  && apt-get clean && rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*

WORKDIR /usr/local/app
RUN mkdir lib

COPY package.json .
RUN npm install

COPY .babelrc .
COPY src ./src
