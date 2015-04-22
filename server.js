/*
Main application entry point
 */

// pull in the package json
var pjson = require('./package.json');
console.log('ixit document service version: ' + pjson.version);

// REQUIRE SECTION
var express = require('express'),
    router = express.Router(),
    config = require('config'),
    app = express(),
    // passport = require('passport'),
    routes = require('./controllers/routes'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    flash = require('connect-flash'),
    session = require('express-session'),
    // favicon = require('serve-favicon'),
    compress = require('compression'),
    restler = require('restler'),
    color = require('colors'),
    downloader = require('./lib/downloader.js'),
    multer = require('multer'),
    errors = require('./lib/errors'),
    crashProtector = require('common-errors').middleware.crashProtector,
    helpers = require('view-helpers'),
    url = require('url'),
    Filemanager = require('./lib/file-manager.js'),
    kue = require('kue'),
    syncIndex = require('./models/media/media.js').syncIndex;
var MongoStore = require('connect-mongo')(session);


// set version
app.set('version', pjson.version);

// port
var port = process.env.PORT || 3001;


function afterResourceFilesLoad(redis_client) {

    console.log('configuring application, please wait...');


    // console.log('Loading ' + 'passport'.inverse + ' config...');
    // try {
    //   require('./lib/passport.js')(passport);
    // } catch(e) {
    //   console.log(e);
    // }
    //

    app.set('showStackError', true);

    console.log('Enabling crash protector...');
    app.use(crashProtector());

    console.log('Enabling error handling...');
    app.use(errors.init());

    // make everything in the public folder publicly accessible - do this high up as possible
    app.use(express.static(__dirname + '/public'));

    // set compression on responses
    app.use(compress({
      filter: function (req, res) {
        return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
      },
      level: 9
    }));

    // efficient favicon return - will enable when we have a favicon
    // app.use(favicon('public/images/favicon.ico'));


    app.locals.layout = false;
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');


    // set logging level - dev for now, later change for production
    app.use(logger('dev'));


    // expose package.json to views
    app.use(function (req, res, next) {
      res.locals.pkg = pjson;
      next();
    });

    // signed cookies
    app.use(cookieParser(config.express.secret));

    app.use(bodyParser.urlencoded({
      extended: true
    }));
    app.use(bodyParser.json());


    app.use(methodOverride());

    //load download middleware
    app.use(downloader());

    // load uploader middleware
    var fm = new Filemanager();
    app.use(multer({ dest: fm.APPCHUNKDIR}));

    // setup session management
    console.log('setting up session management, please wait...');
    app.use(session({
        resave: true,
        saveUninitialized: true,
        secret: config.express.secret,
        store: new MongoStore({
            db: config.db.database,
            host: config.db.server,
            port: config.db.port,
            autoReconnect: true,
            username: config.db.user,
            password: config.db.password,
            collection: "mongoStoreSessions"
        })
    }));

    //Initialize Passport
    // app.use(passport.initialize());

    // //enable passport sessions
    // app.use(passport.session());


    // connect flash for flash messages - should be declared after sessions
    app.use(flash());

    // should be declared after session and flash
    app.use(helpers(pjson.name));

    // set our default view engine
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');


    //pass in the app config params in to locals
    app.use(function(req, res, next) {

        res.locals.app = config.app;
        next();

    });

    // our router
    //app.use(app.router);
    //

    //re-index es
    syncIndex();


    // test route - before anything else
    console.log('setting up test route /routetest');

    app.route('/routetest')
    .get(function(req, res) {
        res.send('IXIT Document Server is running');
    });

    // test route - before anything else
    console.log('setting up ping route /ping');

    app.route('/ping')
    .get(function(req, res) {
        res.send('ready');
    });


    var REDIS = url.parse(process.env.REDIS_URL || 'redis://127.0.0.1:6379'), con_opts = {};

    con_opts.port = REDIS.port;
    con_opts.host = REDIS.hostname;

    if (REDIS.auth) {
      var REDIS_AUTH = REDIS.auth.split(':');
      con_opts.auth = REDIS_AUTH[1];
    }


    //job queue instance
    var jobQueue = kue.createQueue(con_opts);


    // our routes
    console.log('setting up routes, please wait...');
    routes(app, redis_client, jobQueue);


    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but
    // valid, you can do whatever you like, set
    // properties, use instanceof etc.
    app.use(function(err, req, res, next){
      // treat as 404
      if  ( err.message &&
          (~err.message.indexOf('not found') ||
          (~err.message.indexOf('Cast to ObjectId failed'))
          )) {
        return next();
      }

      // log it
      // send emails if you want
      console.error(err.stack);

      // error page
      //res.status(500).json({ error: err.stack });
      //res.json(500, err.message);
      if (err.code) {
        res.status(400).json({
          url: req.originalUrl,
          error: err.name,
          code: err.code
        });
      } else {
        res.status(500).json({
          url: req.originalUrl,
          error: err.message,
          stack: err.stack
        });
      }
    });

    // assume 404 since no middleware responded
    app.use(function(req, res){
      if (req.xhr) {
        res.status(404).json({message: 'resource not found'});
      } else {
        res.status(404).json( {
          url: req.originalUrl,
          error: 'Not found'
        });
      }

    });


    // development env config
    if (process.env.NODE_ENV == 'development') {
      app.locals.pretty = true;
    }

}


console.log("Running Environment: %s", process.env.NODE_ENV);
/*Redis Connection*/
console.log('Creating connection to redis server...');
var REDIS = url.parse(process.env.REDIS_URL);
var redis_client = require('redis').createClient( REDIS.port, REDIS.hostname, {});
if (REDIS.auth) {
  var REDIS_AUTH = REDIS.auth.split(':');
  redis_client.auth(REDIS_AUTH[1]);
}

redis_client.on('ready', function () {
  console.log('Redis connection is....ok');
});
redis_client.on('error', function (err) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(err);
    console.log('Redis connection..%s:%s', REDIS.host, REDIS.port);
  }
});

/*ElasticSearch Connection*/
console.log("Checking connection to ElasticSearch Server...");
var esurl = process.env.ES_SSL_URL || process.env.ES_URL;
restler.get(esurl)
.on('success', function (data) {
  if (data.status === 200) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('ES running on ' + process.env.ES_URL);
    }
  }
})
.on('error', function (data) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Error Connecting to ES on ' + process.env.ES_URL);
  } else {
    console.log('Error Connecting to ES');
  }
});

/*MongoDB Connection*/
console.log("Setting up database communication...");
// setup database connection
require('./lib/db').open()
.then(function () {
  console.log('Database Connection open...');
  //load resource
  afterResourceFilesLoad(redis_client);

  // actual application start
  app.listen(port);
  console.log('IXIT Document Service started on port '+port);
  // CATASTROPHIC ERROR
  app.use(function(err, req, res){

    console.error(err.stack);

    // make this a nicer error later
    res.status(500).send('Ewww! Something got broken on IXIT. Getting some tape and glue');

  });

})
.catch(function (e) {
  console.log(e);
});



