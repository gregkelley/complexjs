const mongodb = require('mongodb');
const dotenv = require('dotenv');

// this loads all the values defined in the .env file. yay!
dotenv.config();  

// make port dynamic so we can get heroku port if on their site
// let port = process.env.PORT;
// if (port == null || port == "") { port = 3000 }

//const connstr = 
// 'mongodb+srv://gak:ROCKorder98406@cluster0-hwrqk.mongodb.net/ComplexApp?retryWrites=true&w=majority';

// (connect string, , callback function)
// changed constr to be an env variable from file .env
mongodb.connect( process.env.CONNECTIONSTRING, { useNewUrlParser: true, useUnifiedTopology: true }, 
  function(err, client) {
      // module.exports = client.db();
      module.exports = client;  // changed to this when we stored session in mongodb
      const app = require('./app');
      app.listen(process.env.PORT);
    })