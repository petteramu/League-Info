var mysql  = require('mysql');
var Irelia = require('irelia');

var database = function(settings)
{
    this.pool;
    this.host = (settings & settings.host) ? settigs.host : 'localhost';
    this.user = (settings & settings.user) ? settigs.user : 'root';
    this.password = (settings & settings.password) ? settigs.password : '';
    this.dbName = (settings & settings.database) ? settigs.database : 'petteramu_com';
    
    //Initialize API connection
    this.api = new Irelia({
        secure: true,
        host: 'prod.api.pvp.net',
        path: '/api/lol/',
        key: '586229bd-69d8-4be3-accf-701a8346822c',
        debug: true
    });
}

database.prototype.init = function() {
    //Initialize mysql connection
    this.pool = mysql.createPool({
        connectionLimit: 100,
        host     : this.host,
        user     : this.user,
        password : this.password,
        database : this.dbName,
        debug: false
    });
}

database.prototype.getGames = function() {
    this.pool.getConnection(function(err, connection) {
        if(err) {
            return err;
        }
        
        connection.query("SELECT * FROM game", function(err, rows) {
            connection.release();
            if(!err)
                console.log(rows);
        });
            
        connection.on('error', function(err) {
              console.log("error in database connection");     
        });
    });
}

database.prototype.updateLeagueData = function(region, summonerIds) {
    connection = this.getConnection();
    
    var json = "{}";
    for(var i = 0; i < summonerIds.length; i++) {
        this.api.getSummonerBySummonerId(region, 399670, function(err, res) { console.log(err); });
        this.api.getLeagueEntryBySummonerId(region, summonerIds[i], function(err, res) {
            if(err) {
                console.log("error: " + err);
            }
            else if(res['status'] === undefined) {
                console.log("res: " + res);
                json += res;
            }
        });
    }
    
    var query = "INSERT INTO summoner_league (summonerId, queueType, league, division, points, wins, losses)";
    
    console.log("json: " + json);
    var i = 0;
    JSON.parse(json).forEach(function(element, index, array) {
        if(i++ == 0)
            query += "VALUES";
        else
            query += ", ";
        
        query += "('" + element['entries'][0]['playerOrTeamId'] + "', '" + element['queue'] + "', '" + element['tier'] + "', '" + element['entries'][0]['division'] + "', '" + element['entries'][0]['leaguePoints'] + "', '" + element['entries'][0]['wins'] + "', '" + element['entries'][0]['losses'] + "')";
    });
    
    query += " ON DUPLICATE KEY UPDATE summonerId=VALUES(summonerId), queueType=VALUES(queueType), league=VALUES(league), division=VALUES(division), points=VALUES(points),  wins=VALUES(wins),  losses=VALUES(losses)";
    
    connection.query(query, function(err, res) {
        if(err)
            console.log("update error: " + err);
        else
            console.log("update response: " + res);
        
    });
}

database.prototype.getConnection = function() {
    this.pool.getConnection( function( err, connection ) {
        if(err)
            return err;
        return connection
    });
}



var db = new database({
    host: "localhost",
    user: "root",
    password: "",
    database: "petteramu_com"
});
db.init();
db.updateLeagueData('euw', [120512]);