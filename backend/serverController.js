var Database = require('./dbtest.js');
var Irelia = require('irelia');
var updateCounter = require('./updateCounter.js');

var serverController = function(server, socket, api) {
    var server = server;
    var socket = socket;
    var data = data;
    var champData;
    var db = Database.getInstance();
    var _this = this;
    
    //Initialize api connection
    var api = api;
    
    function handleGameData(apiData, gameData, region) {
        var champData;
        
        getChampionData(function(data) {
            apiData['participants'].forEach(function(element) {
                for (var property in data['data']) {
                    if (data['data'].hasOwnProperty(property) && data['data'][property].key == element.championId) {
                        element.championImage = data['data'][property].image;
                    }
                }
            });
            
            apiData.version = api.staticData.version;
            
            //Include the participant number in the response
            apiData['participants'].forEach(function(pElement, index) {
                gameData.pairs.forEach(function(summoner) {
                    if(pElement.summonerId == summoner.summonerId)
                        pElement.participantNo = summoner.participantNo;
                });
            });
            
            //Emit the data on the game
            server.emitData(null, socket, "core", apiData);
        });
    }
    
    function getChampionData(cb) {
        if(typeof champData !== 'undefined') cb(champData);
        else {
            api.getChampionsData(api.staticData.version, 'en_US', function(err, data) {
                if(err) {
                    console.log("error getting the champion data: " + err);
                    return;
                }
                champData = data;
                cb(data);
            });
        }
    }
    
    //Fetches graph data
    function fetchGraphData() {
        
    }
    
    function fetchMatchHistory(gameData) {

        var promises = [];
        //Each player is handled individually
        var i;
        gameData['pairs'].forEach(function(summoner) {
            promises.push(
                new Promise(function(resolve, reject) {
                    api.getRecentGamesBySummonerId(gameData.region, summoner.summonerId, function(err, data) {
                        try {
                            if(err) {
                                console.log("Error while getting match history for a player: %s", err);
                                reject(Error("error"));
                                return;
                            }

                            //Create a new object for the data since we do not want to send unnecessary data
                            var result = {
                                summonerId: summoner.summonerId,
                                participantNo: summoner.participantNo,
                                games: []
                            };

                            if(typeof data['games'] !== 'undefined') {
                                var x;
                                for(x = 0; x < data['games'].length; x++) {
                                    var obj = {
                                        championId: data['games'][x]['championId'],
                                        winner: data['games'][x]['stats']['win']
                                    }
                                    result.games.push(obj);
                                }
                            }
                            console.log(1);
                            resolve(result);
                        }
                        catch(e) {
                            console.log(2);
                            reject(Error(e));
                        }
                    });
                })
            );
        });
        
        return Promise.all(promises);
    }
    
    //Fetches the league finromationfrom the db and updates it if necessary
    function fetchLeagueData(gameData, updated) {
        db.getSummonerLeagueData( gameData, function(err, dbData) {
            if(err) {
                console.log(err);
                server.emitData({"error": "Internal server error"}, socket, "error");
                return;
            }
            
            //If not all the players have league data in the database, update it
            if(!updated) {
                
                var requiresUpdate = false;
                //Find the time since the last update for each player and decide if it needs updating
                for(var i = 0; i < dbData.length; i++) {
                    //If its more than 3 hours since last update
                    if((new Date() - new Date(dbData[i]['lastUpdated'])) / 1000 / 60 / 60 > 3) {
                        requiresUpdate = true; //Remove summoners that do not require an update
                    }
                }
                
                //All the playes league data can be made in one api call, therefore this function differs from the champion statistics way
                db.updateLeagueData(gameData, function(err, data) {
                    if(err) {
                        console.log(err);
                        server.emitData({"error": "Internal server error"}, socket, "error");
                        return;
                    }

                    //Run again when updated
                    fetchLeagueData(gameData, true);
                });
            }
            
            //Dont return an empty result set
            else if(dbData.length > 0){
                var result = []
                //Nothing needs updating
                //Now include the participant number in the response
                dbData.forEach(function(dbElement, index) {
                    gameData.pairs.forEach(function(summoner) {
                        if(dbElement.summonerId == summoner.summonerId) {
                            result.push({
                                participantNo: summoner.participantNo,
                                summonerId: summoner.summonerId,
                                teamId: summoner.teamId,
                                league: dbElement.league,
                                division: dbElement.division,
                                wins: dbElement.wins,
                                losses: dbElement.losses
                            });
                        }
                    });
                });
                server.emitData(null, socket, "leaguedata", result);
            }
            else {
                server.emitData({"error":"Empty result set"}, socket, "error");
            }
        });
    }
    
    //Fetches the champion statistics from the db and updates it if necessary
    function fetchChampData(gameData, updated) {
        //Get information on the champions of summoners from the database
        db.getSummonerChampData( gameData, function(err, dbData) {
            if(err) {
                console.log(err);
                server.emitData({"error": "Internal server error"}, socket, "error");
                return;
            }
            
            //Decide which data need to be updated if any
            var requiresUpdate = [];
            if(dbData === "No rows" && !updated) { //Update all if none are found in the db and the data was not updated beforehand
                requiresUpdate = gameData.pairs;
            }
            else if(!updated) { //Find the updateneeds based on missing data and time since last update if the data was not updated beforehand
                //Flag summoners that have not been updated in a while
                for(var i = 0; i < dbData.length; i++) {
                    if((new Date() - new Date(dbData[i]['lastUpdated'])) / 1000 / 60 / 60 > 3) {
                        requiresUpdate.push(dbData[i].summonerId); //Remove summoners that do not require an update
                    }
                }
                
                //Flag summoners that have no entry in the database
                var i = 0;
                gameData.pairs.forEach(function(element) { //Iterate all data given from the server
                    var found = false;
                    dbData.forEach(function(pairElement) { //Iterate all data from the db
                        if(pairElement.summonerId == element.summonerId) 
                            found = true;
                    });

                    if(!found) //If the summoner was not found in the data from the db, it requires an update
                        requiresUpdate.push(element);
                });
            }

            //Update the ones that require it
            if(requiresUpdate.length > 0) {
                console.log("updating: " + requiresUpdate.length);

                var counter = new updateCounter(requiresUpdate.length, function() {
                    //Get the updated data from the db when the counter is done
                    fetchChampData(gameData, true); 
                });
                
                //Start the update
                db.updateChampData(gameData.region, requiresUpdate, counter.increment);
            }
            
            //Dont send an empty result set
            else if(dbData !== "No rows") {
                var response = JSON.parse(JSON.stringify(gameData)); //Clone gameData object
                
                //Noone needs updating
                //Now include the participant number in the response and set the type
                dbData.forEach(function(dbElement, index) {
                    response.pairs.forEach(function(responseElement) {
                        if(dbElement.summonerId == responseElement.summonerId) {
                            responseElement.playerOnChampion = dbElement;
                        }
                    });
                });
                
                //Fetch champion averages
                db.getChampionAverages(gameData, function(err, avgData) {
                    if(err) {
                        console.log(err);
                        server.emitData({"error": "Internal server error"}, socket, "error");
                        return;
                    }
                    
                    //Now include the averages in the response
                    avgData.forEach(function(avgElement, index) {
                        var found = false;
                        response.pairs.forEach(function(responseElement) {
                            if(avgElement.championId == responseElement.championId) {
                                responseElement.average = avgElement;
                                found = true;
                            }
                        });
                    });
                    server.emitData(null, socket, "champdata", response);
                    
                    //Get the most played champion since it is now updated and exists in the database
                    fetchMostPlayedChampions(gameData, 5);
                });
            }
            //If there are no entries
            else {
                server.emitData({"error":"Empty result set"}, socket, "error");
            }
        });
    }
    
    //Fetches the champion statistics from the db and updates it if necessary
    function fetchMostPlayedChampions(gameData, amount) {
        
        //Get information on the champions of summoners from the database
        db.getSummonerMostPlayed( gameData, amount, function(err, dbData) {
            //Handle errors from the database
            if(err) {
                server.emitData({"error":"Internal database error"}, socket, "error");
                console.log("Error: %s", err);
            }
            
            var response = JSON.parse(JSON.stringify(gameData)); //Clone gameData object
            
            //Add version number
            response.version = api.staticData.version;
            
            //Get static champion data
            var championData = getChampionData(function(data) {
                
                //Create data structure
                var i;
                for(i = 0; i < dbData.length; i++) {
                    var row = dbData[i];

                    //Add image data to the response
                    for (var property in data['data']) {
                        if (data['data'].hasOwnProperty(property) && data['data'][property].key == row.championId) {
                            row.championImage = data['data'][property].image;
                        }
                    }

                    //Add the database data to the response
                    var i2;
                    for(i2 = 0; i2 < response['pairs'].length; i2++) {
                        if(response['pairs'][i2].summonerId == row.summonerId) {
                            //Set the data parameter if it does not exist
                            if(typeof response['pairs'][i2].data === 'undefined') {
                                response['pairs'][i2].data = [];
                            }
                            response['pairs'][i2].data.push(row);
                        }
                    }
                }

                //Emit data
                server.emitData(null, socket, "mostplayed", response);
            });
        });
    }
    
    return {
        //Starts the process of creating data on the curret game of a summoner
        //Handles the errors from the API, but does not handle the data itself
        //Handling the data is done by the private functions of this class
        createCurrentGameData: function(data) {
            if( data.name === '' ) {
                server.emitData({"error": "No name provided"}, socket);
                return;
            }
            var name = data.name.toLowerCase();
            var region = data.region || 'euw';
            
            //Get the summonerId of the player
            api.getSummonerByName( region, name, function( err, nameData ) {
                if(err) {
                    server.emitData({"error": "No summoner by that name"}, socket);
                    console.log( "-- Request from: " + socket.id + " ended beucase the summoner does not exist: " + err);
                    return;
                }
                
                //Get the data on the game from the API
                api.getCurrentGame( region, nameData[name]['id'], function(err, apiData) {
                    if(err) {
                        if(err === 404) {
                            server.emitData({"error": "Summoner currently not in a game"}, socket);
                            console.log( "-- Request from: " + socket.id + " ended because the summoner was not in a game." );
                            return;
                        }
                        else {
                            server.emitData({"error": "There was a problem getting the game data"}, socket);
                            console.log( "-- Request from: " + socket.id + " ended because there was a problem with getting the game data: " + err );
                            return;
                        }
                    }
                    
                    //Create an object containing summonerId and the corresponding championId
                    var summonerChampPairs = [];
                    apiData['participants'].forEach(function(element, index) {
                        summonerChampPairs.push({
                            summonerId: element.summonerId,
                            championId: element.championId,
                            //The first 5 in the list from the API is on blue(100) team, the next are on the purple(200)
                            //The participant number goes from 101-105 and 201 to 205, therefore +1 and -4
                            //This is because the id 100 is used to identify the team itself
                            participantNo: (element.teamId == 100) ? element.teamId + index + 1: element.teamId + index - 4,
                            teamId: element.teamId
                        });
                    });

                    //Filter out unranked queuetypes to become soloQ
                    var gameType = ( gameType == 41 || gameType == 42 ) ? api.queues[apiData['gameQueueConfigId']] : api.queues[4];

                    var gameObject = {
                        pairs: summonerChampPairs,
                        gameType: gameType,
                        region: region
                    }
                    
                    //Create pairs of summoners and champs, as well as finding the gametype
                    handleGameData(apiData, gameObject, region);
                    
                    //get statistics on the leagues of each player
                    fetchLeagueData(gameObject);
                    
                    //Get statistics on the champions each play plays
                    fetchChampData(gameObject);
                    
                    //Send the match history of each player
//                    fetchMatchHistory(gameObject).then(function(data) {
//                        console.log(data);
//                        server.emitData(null, socket, "matchhistory", data);
//                    }, function(error) {
//                        console.log("Error");
//                        console.log(error);
//                    });
                });
            });
        }
    }
}

module.exports = serverController;