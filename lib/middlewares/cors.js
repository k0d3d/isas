module.exports = function(req, res, next){
      //CORS Headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With');
      res.header('Access-Control-Allow-Headers', 'dkeep-agent-id-token');
      next();
};