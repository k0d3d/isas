var express = require('express')
  , OAuth2 = require('simple-oauth2')({
        clientID: 'pEdDoXEgEpSbkAzN'
      , clientSecret: 'unpYdLS16rlS7ITa1vVOD7hwJ8ZRzTkV'
      , site: 'http://localhost:3000'
      , tokenPath: '/oauth/token'
    })
  , app = express();

app.get('/', function (req, res) {
  var body = '<html><body><a href="http://localhost:3000/oauth/authorize?response_type=code&client_id=pEdDoXEgEpSbkAzN&redirect_uri=http://localhost:4000/callback&scope=*">Authenticate with Service</a></body></html>'
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Content-Length', body.length)
  res.send(body)
})

app.get('/callback', function (req, res) {
  var code = req.query.code

  var saveToken = function (err, result) {
    if (err) {
      res.send(err)
      return console.log('Access Token Error:', err, result)
    }
    token = OAuth2.AccessToken.create(result)
    res.send(token)
  };

  OAuth2.AuthCode.getToken({
      code: code
    , redirect_uri: 'http://localhost:4000/callback'
  }, saveToken)
})

app.listen(4000)
console.log('listening on port 4000')
