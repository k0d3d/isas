module.exports = function(){
  return function (req, res, next) {

      //CORS Headerss
      res.header('Access-Control-Allow-Origin', 'http://i-x.it');
      // res.header('Access-Control-Allow-Headers', 'X-Requested-With');
      // res.header('Access-Control-Allow-Headers', 'dkeep-agent-id-token');
      // res.header('Access-Control-Allow-Headers', 'x-Authr');
      res.header('Access-Control-Allow-Headers', 'Authorization, dkeep-agent-id-token, x-authr, X-Requested-With');
      next();
  };
};