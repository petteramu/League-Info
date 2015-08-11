var RiotAPI = require('./api.js');

var api = new RiotAPI({
    debug: true,
    secure: true
});

api.getSummonerByName('euw', 'asdzzasd').then(function(data) {
    console.log(data)
}, function(error) {
    console.log(error.statusCode);
    
});