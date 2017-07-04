# IXIT_STORAGE_APPLICATION_SERVER (ISAS)

A fast, reliable file uploads and download backend server. I wrote this for handling uploads on [IXIT](http://ixit.com.ng).
Resumable uploads using [Flowjs](http://github.com/flowjs) are supported with client side file chunking / slicing. Files can also be streamed to Google Cloud or AWS S3.

## Getting Started



### Prerequisites

- Node v6.x +

- Set enviroment variables eg. env.sample.vars
```bash
export APP_SECRET="UeISAdQDIW:Lcsa2-=22mcn4W*@ndsa1238321-1384MCgMMEe9bYNNIbhLMTDu6" #change this
export ELASTICSEARCH_URL="http://xxxxxx"
export MONGO_URL="mongodb://xxxxxx"
export NODE_ENV="production"
export IAMDB =$MONGO_URL
export REDIS_URL="redis://xxxxx"
export VAULT_RESOURCE="https://store.ixit.com.ng"
export IWAC_RESOURCE="https://xxxx" # kinda optional, used to resolve absolute urls
export DEBUG="isas,iwac,iwac:*,isas:*,microserver" # very optional. this shows debug messages during runtime
export IP=0.0.0.0 # helps c9 serve the app 

```

### Installing

Apart from the few environment variables you have to set, you can just start by.
```bash
$ npm install
```


And start the server

```bash
$ npm start
```
or 
```
$ node server.js
```


## Uploading files

Uploading files to ISAS is easy. Make a HTTP file upload request using [Flow](https://github.com/flowjs/). he correct headers and form parameters to set are included in the FlowJs documentation. 

POST /upload
GET /upload

Look at `./controllers/v4ult.js` for implentation.


## Built With

* [Redis](http://redis.io/) - Queuing upload requests


## Authors

* **Michael Rhema** - *All work* - [k0d3d](https://github.com/k0d3d)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone who's code was used
* Inspiration
* etc
