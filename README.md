# kuroneko
kuroneko is AWS RDS for PostgreSQL query log deliveryman to datastores using AWS Lambda.

## Motivation
PostgreSQL don't supported slow query checker (like MySQL slow_query_log). In addition, that result is temporarily. Therefore, it is insufficent when inspect web application performance...

Elasticsearch is very easy to monitor log visibility environment to use Kibana and data store services (e.g. BigQuery, Treasure Data, and more) provide powerful analystic platform.

So sending RDS for PostgreSQL query log to that is best solution to "Site Reliability Engineering" !!

## Support Backend Service
kuroneko supporting data store service is below.

|Service Name|set str|
|:-----|:-----|
|Elasticsearch|es|
|BigQuery|bq|

If you use Elasticsearch in log store backend, then export `BACKEND_SERVICE=es`.

## Install

This project deploy to use .zip uploading.

**Elasticsearch**

```sh
$ npm install
$ npm run build //=> using Linux
$ npm run build:docker //=> using OSX
```

**BigQuery**

You must include GCP Credential before build.
Access `GCP console > API Manager > Credentials > Create Service account key (type JSON)` and put credential json file in this project root renaming `secret.json`

```sh
❯ ls -la
total 88
drwxr-xr-x   18 muni  staff    612  5 15 18:50 .
drwxr-xr-x   17 muni  staff    578  5 11 16:12 ..
-rw-r--r--@   1 muni  staff   6148  5  2 17:37 .DS_Store
-rw-r--r--    1 muni  staff     87  4 19 09:52 .babelrc
drwxr-xr-x   15 muni  staff    510  5 15 18:51 .git
-rw-r--r--    1 muni  staff    931  4 11 11:40 .gitignore
-rw-r--r--    1 muni  staff    290  5 15 18:50 Dockerfile
-rw-r--r--    1 muni  staff    309  5 15 18:50 Dockerfile_BQ
-rw-r--r--    1 muni  staff   1050  4  4 14:45 LICENSE
-rw-r--r--    1 muni  staff   3294  5 15 18:51 README.md
drwxr-xr-x    4 muni  staff    136  5 15 18:22 dist
drwxr-xr-x    4 muni  staff    136  4  5 17:21 elasticsearch
-rw-r--r--    1 muni  staff    255  4 19 11:22 lambdaDriver.js
drwxr-xr-x    6 muni  staff    204  4 11 16:50 lib
drwxr-xr-x  298 muni  staff  10132  5 15 10:12 node_modules
-rw-r--r--    1 muni  staff   1553  5 15 18:50 package.json
-rw-r--r--@   1 muni  staff   2327  4 18 14:58 secret.json
drwxr-xr-x    6 muni  staff    204  5 15 10:19 src
```

```sh
$ npm install
$ npm run build:bq //=> using Linux
$ npm run build:docker:bq //=> using OSX
```

Compressed file will be created in `dist/`.

Go to AWS Lambda console and create new lambda function using this compressed file.
You don't forget to change Hander `index.handler` to `lib/index.handler`.

## Environment Variable
kuroneko use environment variable to configure.

|Key|Description|
|:-----|:-----|
|AWS_DB_INSTANCE_IDENTIFIER (require)|Target RDS instance name|
|PSQL_LOG_LINE_PREFIX (require)|PostgreSQL log format. Please check your config line log_line_prefix and [this](https://github.com/munisystem/plpr#support-postgresql-log-format)|
|BACKEND_SERVICE (require)|Log store backend|
|TZ (optional)|Timezone|

### Elasticsearch
|Key|Description|
|:-----|:-----|
|ELASTICSEARCH_HOST (require)|Elasticsearch host|

### BigQuery
|Key|Description|
|:-----|:-----|
|BQ_PROJECT_ID (require)|BigQuery Project ID|
|BQ_DATASET_NAME (require)|BigQuery dataset name|
|BQ_TABLE_BASE_NAME (optional)|BigQuery table name. default using `$AWS_DB_INSTANCE_IDENTIFIER`|

## License
MIT © munisystem
