import Ember from 'ember';

export default Ember.Controller.extend({
    queryParams: ['playerName', 'region'],
    playerName: '',
    region: 'euw',
    playerPairs: [],
    team1_players: [],
    team2_players: [],
    gameData: undefined,
    nodeServerAddress: 'http://ns-petteramu.rhcloud.com:8000',
    
    socketIOService: Ember.inject.service('socket-io'),
    
    init: function() {
        this._super.apply(this, arguments);

        //Get the socket
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
        
        //Create event handlers
        socket.on('message', this.handleMessage, this);
        
        //Make a request immediatly if the search was made in the startscreen
        if(this.get('playerName') !== '') {
            this.makeDataRequest();
        }
    },
    
    handleMessage: function(event) {console.log(event);
        if(typeof event['error'] !== 'undefined') {
            console.log("Error returned from server");
            return;
        }
        
        if(typeof event['core'] !== 'undefined') {
            this.coreDataEvent(event['core']);
        }
        else if(typeof event['leaguedata'] !== 'undefined') {
            this.leagueDataEvent(event['leaguedata']);
        }
        else if(typeof event['champdata'] !== 'undefined') {
            this.champDataEvent(event['champdata']);
        }
        else if(typeof event['mostplayed'] !== 'undefined') {
            this.mostPlayedEvent(event['mostplayed']);
        }
        else if(typeof event['matchhistory'] !== 'undefined') {
            this.matchHistoryEvent(event['matchhistory']);
        }
        
    },
    
    coreDataEvent: function(event) {
        this.set('gameData', event);
        var i;
        for(i = 0; i < event['participants'].length; i++) {
            this.insertCoreDataToPairs(event['participants'][i]);
        }
    },
    
    matchHistoryEvent: function(event) {
        this.matchHistoryData = event;
        var i;
        for(i = 0; i < event.data.length; i++) {
            this.insertMatchHistoryDataToPairs(event.data[i]);
        }
    },
    
    leagueDataEvent: function(event) {
        this.leagueData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            this.insertLeagueDataToPairs(event[i]);
        }
    },
    
    mostPlayedEvent: function(event) {
        //TODO: endre data struktur fra server på alle events
        this.mostPlayedData = event;
        var i;
        for(i = 0; i < event['pairs'].length; i++) {
            this.insertMostPlayedDataToPairs(event['pairs'][i]);
        }
    },
    
    champDataEvent: function(event) {
        this.champData = event;
        var i;
        for(i = 0; i < event['pairs'].length; i++) {
            this.insertChampDataToPairs(event['pairs'][i]);
        }
    },
    
    makeDataRequest: function() {
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
            socket.emit('get:currentgame', {
                name: this.playerName,
                region: 'euw'
            });

        //Empty the player items list, so that even though the core data is not the first to be received,
        //new player items are created for each
        this.playerPairs.length = 0;    
    },
        
    actions: {
        getData: function() {
            this.makeDataRequest();
        }
    },
    
    //Gets the participant number disregarding team(101 and 201 = 1)
    getNormalizedParticipantNo: function(participantNo) {
        return (participantNo > 200) ? participantNo - 200 : participantNo - 100;
    },
    
    getOrCreatePlayerObject: function(participantNo) {
        var teamArray = (participantNo < 200) ? this.get('team1_players') : this.get('team2_players');
        console.log(teamArray);
        for(var i = 0; i < teamArray.length; i++) {
            if(teamArray[i].participantNo === participantNo)
                return teamArray[i];
        }
        
        //Create classes
        var PlayerObject = Ember.Object.extend({
            winrate: function() {
                return (this.get('rankedWins') * 100) / (this.get('rankedWins') + this.get('rankedLosses'));
            },
            league: "Unranked"
        });
        
        var obj = PlayerObject.create();
        teamArray.pushObject(obj);
        return obj;
    },
    
    //Gets an existing player object if it exists or creates a new one
    getOrCreatePlayerPair: function(participantNo) {
        //Create classes
        var PlayerObject = Ember.Object.extend({
            winrate: function() {
                return (this.get('rankedWins') * 100) / (this.get('rankedWins') + this.get('rankedLosses'));
            },
            league: "Unranked"
        });
                                                    
        var PlayerPair = Ember.Object.extend({
            playerOnTeam1: PlayerObject.create(),
            playerOnTeam2: PlayerObject.create()
        });
        
        //Find exissting
        var normalized = this.getNormalizedParticipantNo(participantNo); //Normalized participantNo
        var i;
        for(i = 0; i < this.playerPairs.length; i++) {
            if(this.playerPairs[i].participantNo === normalized) {
                return (participantNo < 200) ? this.playerPairs[i].playerOnTeam1 : this.playerPairs[i].playerOnTeam2;
            }
        }
        //Create new participant object if not found
        var obj = PlayerPair.create({
            participantNo: normalized
        });
        
        this.playerPairs.pushObject(obj);
        return (participantNo < 200) ? obj.get('playerOnTeam1') : obj.get('playerOnTeam2');
    },
    
        
    insertCoreDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        
        console.log(playerObj);
        playerObj.set('name', data.summonerName);
        playerObj.set('summonerId', data.summonerId);
        playerObj.set('participantNo', data.participantNo);
        playerObj.set('normalizedParticipantNo', this.getNormalizedParticipantNo(data.participantNo));
        playerObj.set('sprite', {
            url: 'http://ddragon.leagueoflegends.com/cdn/' + this.gameData.version + '/img/sprite/' + data.championImage.sprite,
            x: -data.championImage.x,
            y: -data.championImage.y
        });
        
        console.log(playerObj);
    },
    
    insertLeagueDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        playerObj.set('league', this.capitalizeFirstLetter(data.league.toLowerCase()));
        playerObj.set('division', data.division);
        playerObj.set('rankedWins', data.wins);
        playerObj.set('rankedLosses', data.losses);
        playerObj.set('rankedWinrate', ((data.wins * 100) / (data.wins + data.losses)).toFixed(1));
    },
    
    insertChampDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        if(typeof data.playerOnChampion !== 'undefined') {
            playerObj.set('championName', data.playerOnChampion.name);
            playerObj.set('championKills', data.playerOnChampion.kills);
            playerObj.set('championDeaths', data.playerOnChampion.deaths);
            playerObj.set('championAssists', data.playerOnChampion.assists);
            playerObj.set('championKDA', ((data.playerOnChampion.kills + data.playerOnChampion.assists) / data.playerOnChampion.deaths).toFixed(1));
            playerObj.set('championWins', data.playerOnChampion.wins);
            playerObj.set('championLosses', data.playerOnChampion.losses);
            playerObj.set('championGames', data.playerOnChampion.wins + data.playerOnChampion.losses);
            playerObj.set('championWinrate', ((data.playerOnChampion.wins * 100) / (data.playerOnChampion.wins + data.playerOnChampion.losses)).toFixed(1));
        }
        
        if(typeof data.average !== 'undefined') {
            playerObj.set('championAverageKills', data.average.kills);
            playerObj.set('championAverageDeaths', data.average.deaths);
            playerObj.set('championAverageAssists', data.average.assists);
            playerObj.set('championAverageKDA', ((data.average.kills + data.average.assists) / data.average.deaths).toFixed(1));
            playerObj.set('championAverageWins', data.average.wins);
            playerObj.set('championAverageLosses', data.average.losses);
            playerObj.set('championAverageWinrate', ((data.average.wins * 100) / (data.average.wins + data.average.losses)).toFixed(1));
        }
    },
    
    insertRankedDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        playerObj.set('rankedKills', data.kills);
        playerObj.set('rankedDeaths', data.deaths);
        playerObj.set('rankedAssists', data.assists);
        playerObj.set('rankedKDA', ((data.kills + data.assists) / data.deaths).toFixed(1));
    },
    
    insertMatchHistoryDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        var history = [];
        
        //Create new structure of data
        for(var i = 0; i < data.games.length; i++) {
            var gameObj = {
                championId: data.games[i].championId,
                win: data.games[i].winner,
                sprite: {
                    x: -data.games[i].championImage.x,
                    y: -data.games[i].championImage.y,
                    url: 'http://ddragon.leagueoflegends.com/cdn/' + this.matchHistoryData.version + '/img/sprite/' + data.games[i].championImage.sprite
                }
            };
            
            //Insert into array
            history.push(gameObj);
        }
        
        playerObj.set("matchHistory", history);
    },
    
    insertMostPlayedDataToPairs: function(data) {
        if(typeof data.data === 'undefined') {
            return;
        }
        
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        var mp = [];
        for(var i = 0; i < data.data.length; i++) {
            mp.push({
                championId: data.data[i].championId,
                wins: data.data[i].wins,
                losses: data.data[i].losses,
                kills: data.data[i].kills,
                deaths: data.data[i].deaths,
                assists: data.data[i].assists,
                games: data.data[i].wins + data.data[i].losses,
                winrate: ((data.data[i].wins * 100) / ( data.data[i].wins + data.data[i].losses)).toFixed(1),
                name: data.data[i].name,
                KDA: ((data.data[i].kills + data.data[i].assists) / data.data[i].deaths).toFixed(1),
                sprite: {
                    url: 'http://ddragon.leagueoflegends.com/cdn/' + this.mostPlayedData.version + '/img/sprite/' + data.data[i].championImage.sprite,
                    x: -data.data[i].championImage.x,
                    y: -data.data[i].championImage.y
                }
            });
        }
        playerObj.set('mostPlayed', mp);
    },
    
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});