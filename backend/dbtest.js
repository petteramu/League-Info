"use strict";
var mysql  = require('mysql');
var Irelia = require('irelia');
var updateCounter = require('./updateCounter.js');


//TODO: fix database to contain only averages, as the total amount of deaths is not provided from the Riot API, and therefore the total amount derived will be wrong as the numbers might be rounded
//TODO: handle the league request to handle a 404 return(of none of the playes are ranked)
var Database = (function()
{
    //Stores the instance of the database
    var instance;
    
    //Self executing
    function init() {
        //Everything inside is public
        return {
    
            //Initialize mysql connection
            pool: mysql.createPool({
                connectionLimit: 10,
                host     : 'localhost',
                user     : 'root',
                password : '',
                database : 'petteramu_com',
                debug: false
            }),

            //Initialize API connection
            api: new Irelia({
                secure: true,
                host: 'prod.api.pvp.net',
                path: '/api/lol/',
                key: '586229bd-69d8-4be3-accf-701a8346822c',
                debug: false
            }),
        
            getSummonerLeagueData: function(gameData, cb) {
                Database.getInstance().pool.getConnection( function( err, connection ) {
                    if(err) {
                        connection.release();
                        cb(err);
                    }

                    var query = "SELECT * FROM summoner_league WHERE (";
                    for(var i = 0; i < gameData.pairs.length; i++) {
                        if(i > 0)
                            query += " OR ";
                        query += "summonerId = " + gameData.pairs[i].summonerId;
                    }
                    query += ") AND queueType = '" + gameData.gameType + "'";

                    connection.query(query, function(err, rows) {
                        connection.release();

                        if(err) {
                            cb(err);
                            return;
                        }

                        cb(null, rows);
                    });
                });
            },
            
            getSummonerChampData: function(gameData, cb) {
                Database.getInstance().pool.getConnection( function( err, connection ) {
                    if(err) {
                        connection.release();
                        cb(err);
                    }

                    var query = "SELECT * FROM summoner_champ_stats WHERE ";
                    for(var i = 0; i < gameData.pairs.length; i++) {
                        if(i > 0)
                            query += " OR ";
                        query += "(summonerId = " + gameData.pairs[i].summonerId + " AND championId = " + gameData.pairs[i].championId + ")";
                        query += " OR (summonerId = " + gameData.pairs[i].summonerId + " AND championId = 0)";
                    }
                    
                    connection.query(query, function(err, rows) {
                        connection.release();

                        if(err) {
                            cb(err);
                            return;
                        }
                        else if(rows.length == 0) {
                            cb(null, "No rows");
                            return;
                        }

                        cb(null, rows);
                    });
                });
            },
            
            getSummonerMostPlayed: function(gameData, amount, cb) {
//              SELECT * FROM
//                ((SELECT summonerId, championId, wins, losses, kills, deaths, assists, (wins+losses) as games
//                FROM summoner_champ_stats champion_averages_stats
//                WHERE summonerId = 399670 and championId != 0
//                ORDER BY games DESC
//                LIMIT 5)
//                UNION ALL
//                (SELECT summonerId, championId, wins, losses, kills, deaths, assists, (wins+losses) as games
//                FROM summoner_champ_stats champion_averages_stats
//                WHERE summonerId = 27096450 and championId != 0
//                ORDER BY games DESC
//                LIMIT 5)) s
//            JOIN champion c
//            ON s.championId = c.championId
                
                Database.getInstance().pool.getConnection(function( err, connection ) {
                    if(err) {
                        connection.release();
                        cb(err);
                        return;
                    }
                    
                    var query = "SELECT * FROM(";
                    var i;
                    
                    for(i = 0; i < gameData['pairs'].length; i++) {
                        query += "(SELECT summonerId, championId, wins, losses, kills, deaths, assists, (wins+losses) as games\
                            FROM summoner_champ_stats champion_averages_stats\
                            WHERE summonerId = " + gameData['pairs'][i].summonerId + " and championId != 0\
                            ORDER BY games DESC\
                            LIMIT 5)";
                        //Add union if not the last iteration
                        if(i < gameData['pairs'].length-1) {
                            query += "UNION ALL";
                        }
                    }
                        
                    query += ") s \
                    JOIN champion c ON s.championId = c.championId";
                    
                    connection.query(query, function(err, rows) {
                        connection.release();

                        if(err) {
                            cb(err);
                            console.log(query);
                            return;
                        }
                        else if(rows.length == 0) {
                            cb(null, "No rows");
                            return;
                        }

                        cb(null, rows);
                    });
                });
            },
            
            getChampionAverages: function(gameData, cb) {
                Database.getInstance().pool.getConnection(function( err, connection ) {
                    if(err) {
                        connection.release();
                        cb(err);
                        return;
                    }

                    var query = "SELECT * FROM champion_averages_stats WHERE ";
                    for(var i = 0; i < gameData.pairs.length; i++) {
                        if(i > 0)
                            query += " OR ";
                        query += "championId = " + gameData.pairs[i].championId;
                    }
                    
                    connection.query(query, function(err, rows) {
                        connection.release();

                        if(err) {
                            cb(err);
                            return;
                        }
                        else if(rows.length == 0) {
                            cb(null, "No rows");
                            return;
                        }

                        cb(null, rows);
                    });
                });
            },
            
            updateChampData: function(region, pairs, callback) {
                pairs.forEach(function(summoner, index) {
                    Database.getInstance().api.getRankedStatsBySummonerId(region, summoner.summonerId, 'SEASON2015', function(err, data) {
                        
                        if(err) {
                            if(err == 404) { //The summoner likely doesnt have any stats for ranked games, just proceed
                                callback(); //Still call the callback as the request is done
                                return;
                            }
                            console.log("error while getting champ stats entries from api: " + err);
                            callback(err);
                            return;
                        }
                        if(typeof data !== 'undefined' && typeof data['champions'] !== 'undefined') {
                            var query = "INSERT INTO summoner_champ_stats (summonerId, championId, wins, losses, kills, deaths, assists) VALUES";

                            for(var ii = 0; ii < data['champions'].length; ii++) {
                                var element = data['champions'][ii];
                                if(ii > 0) //Add divider if previous statement does not return error
                                    query += ", ";

                                query += " ('" + summoner.summonerId + "', '" + element['id'] + "', '" + element['stats']['totalSessionsWon'] + "', '" + element['stats']['totalSessionsLost'] + "', '" + element['stats']['totalChampionKills'] + "', '" + element['stats']['totalDeathsPerSession'] + "', '" + element['stats']['totalAssists'] + "')";
                            }

                            query += " ON DUPLICATE KEY UPDATE summonerId=VALUES(summonerId), championId=VALUES(championId), wins=VALUES(wins), losses=VALUES(losses), kills=VALUES(kills),  deaths=VALUES(deaths), assists=VALUES(assists)";

                            Database.getInstance().pool.getConnection( function (err, connection) {
                                if(err) {
                                    callback(err);
                                    connection.release();
                                    return;
                                }

                                connection.query(query, function(err, res) {
                                    connection.release();
                                    if(err) {
                                        callback(err);
                                        return;
                                    }
                                    callback();
                                });

                            });
                        }
                        else {
                            console.log(summoner.summonerId);
                            callback();
                        }
                    });
                });
            },
                
            //Updates the league data
            updateLeagueData: function(gameData, callback) {
                //The Riot API only takes the summonerIds
                var summonerIds = [];
                gameData.pairs.forEach(function(element) {
                    summonerIds.push(element.summonerId);
                });

                Database.getInstance().api.getLeagueEntryBySummonerId(gameData.region, summonerIds, function(err, data) {
                    if(err) {
                        console.log("error while getting league entries: " + err);
                        callback(err);
                        return;
                    }
                    
                    var query = "INSERT INTO summoner_league (summonerId, queueType, league, division, points, wins, losses) VALUES";

                    var added = 0; //Keeps track of how many rows are added to the query, as 'i' does not fulfull this if the summoner was not present in the data from the API
                    for(var i = 0; i < summonerIds.length; i++) {

                        var element = data[summonerIds[i]];
                        if(typeof element === 'undefined') continue;

                        if(added > 0) //Add divider if previous statement does not return error
                            query += ", ";

                        added++; //If we reach this point, the row will be added to the query

                        for(var ii = 0; ii < element.length; ii++) {
                            if(ii > 0)
                                query += ", ";
                            query += " ('" + summonerIds[i] + "', '" + element[ii]['queue'] + "', '" + element[ii]['tier'] + "', '" + element[ii]['entries'][0]['division'] + "', '" + element[ii]['entries'][0]['leaguePoints'] + "', '" + element[ii]['entries'][0]['wins'] + "', '" + element[ii]['entries'][0]['losses'] + "')";
                        }

                    }
                    
                    query += " ON DUPLICATE KEY UPDATE summonerId=VALUES(summonerId), queueType=VALUES(queueType), league=VALUES(league), division=VALUES(division), points=VALUES(points),  wins=VALUES(wins),  losses=VALUES(losses)";

                    
                    //Do not attempt to insert into the database if none of the players have any league data
                    if(added == 0) {
                        //But treat it as a success(as it was updated but none has any data)
                        callback(null, 0);
                    }
                    else {
                        //If the data from the api contains data on at least one player, insert into db
                        Database.getInstance().pool.getConnection( function (err, connection) {
                            if(err) {
                                callback(err);
                                connection.release();
                                return;
                            }

                            connection.query(query, function(err, res) {
                                connection.release();
                                if(err) {
                                    console.log(query);
                                    callback(err);
                                    return;
                                }

                                callback(null, res);
                            });

                        });
                    }
                });
            }
        }
    };
    
    return {
        getInstance: function () {
            if(!instance) {
                instance = init();
            }
            
            return instance;
        }
    };
        
})();

module.exports = Database;