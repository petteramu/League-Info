import Ember from 'ember';
import config from '../config/environment';

export default Ember.Controller.extend({
    queryParams: ['playerName', 'region'],
    playerName: '',
    region: 'euw',
    playerPairs: [],
    team1_players: [],
    team2_players: [],
    gameData: undefined,
    gameStartTime: undefined, //Used to keep track of time in-game.
    
    //Used to identify which game is to be shown in the case several are requested.
    //Starts as undefined to show that no game has been requested yet.
    currentGameId: undefined,
    
    coreStageReached: false,
    leagueStageReached: false,
    championStageReached: false,
    mostplayedStageReached: false,
    matchhistoryStageReached: false,
    
    //Insert the socket-io service
    socketIOService: Ember.inject.service('socket-io'),
    nodeServerAddress: 'http://ns-petteramu.rhcloud.com:8000',
//    nodeServerAddress: 'http://localhost:8080',
    
    init: function() {
        this._super.apply(this, arguments);
        
        //Get the socket
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
        
        //Create event handlers
        socket.on('message', this.handleMessage, this);
        
        //Start the process of updating in-game time
        var _this = this;
        setInterval(function() {
            _this.increaseGameTime.apply(_this);
        }, 1000);
    },
    
    //The following 3 methods and properties handle the updating of the game time
    ingameTime: 0,
    
    //Returns a readable format of the in game time(mm:ss)
    readableGameTime: function() {
        var min = Math.floor(this.ingameTime / 60);
        var sec = Math.floor(this.ingameTime % 60);

        return min + ":" + (sec < 10 ? '0' : '') + sec;
    }.property('ingameTime'),
    
    //Increases the game time by 1 second
    increaseGameTime: function() {
        this.set('ingameTime', this.get('ingameTime') + 1);
    },
    
    //Takes the response from the server and sends the data on to the correct insertion-functions
    handleMessage: function(event) {
        if(config.debug) { console.log(event); }
        
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
        else if(typeof event['roles'] !== 'undefined') {
            this.rolesEvent(event['roles']);
        }
        else if(typeof event['error'] !== 'undefined') {
            if(event['error']['type'] === 'crucial') {
                this.set('crucialError', event['error']['error']);
            }
            else {
                //Each player object needs to know about the errors to display the information to the user
                this.insertErrorMessages(event['error']);
            }
        }
        
    },
    
    //Insert error messages in the player objects
    insertErrorMessages: function(error) {
        this.team1_players.forEach(function(element) {
            element.set(error['type'] + 'error', error['error']);
        });
        
        this.team2_players.forEach(function(element) {
            element.set(error['type'] + 'error', error['error']);
        });
    },
    
    coreDataEvent: function(event) {
        this.set('coreStageReached', true);
        this.set('gameData', event);
        var i;
        for(i = 0; i < event['participants'].length; i++) {
            this.insertCoreDataToPairs(event['participants'][i]);
        }
        
        this.set('ingameTime', event.gameLength);
    },
    
    matchHistoryEvent: function(event) {
        this.set('matchhistoryStageReached', true);
        this.matchHistoryData = event;
        var i;
        for(i = 0; i < event.data.length; i++) {
            this.insertMatchHistoryDataToPairs(event.data[i]);
        }
    },
    
    leagueDataEvent: function(event) {
        this.set('leagueStageReached', true);
        this.leagueData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            this.insertLeagueDataToPairs(event[i]);
        }
    },
    
    mostPlayedEvent: function(event) {
        this.set('mostplayedStageReached', true);
        //TODO: endre data struktur fra server på alle events
        this.mostPlayedData = event;
        var i;
        for(i = 0; i < event['pairs'].length; i++) {
            this.insertMostPlayedDataToPairs(event['pairs'][i]);
        }
    },
    
    champDataEvent: function(event) {
        this.set('championStageReached', true);
        this.champData = event;
        var i;
        for(i = 0; i < event['pairs'].length; i++) {
            this.insertChampDataToPairs(event['pairs'][i]);
        }
    },
    
    rolesEvent: function(event) {
        this.champData = event;
        var i;
        for(i = 0; i < event['data'].length; i++) {
            this.insertRoleData(event['data'][i]);
        }
    },
    
    resetData: function() {
        //Empty the player items list, so that even though the core data is not the first to be received,
        //new player items are created for each
        this.team1_players.length = 0;
        this.team2_players.length = 0;
        
        //Reset the data staging object
        this.set('coreStageReached', false);
        
        //Remove errors
        this.set('crucialError', false);
        
        //Sets the currentGameId to "waiting" such that it is considered true when creating the handlebars template
        this.set('currentGameId', true);  
    },
    
    makeDataRequest: function(name) {
        this.resetData();
        
        var queryName = name || this.playerName;
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
        socket.emit('get:currentgame', {
            name: queryName,
            region: 'euw'
        });
    },
    
    getRandomGame: function(region) {
        this.resetData();
        
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
        socket.emit('get:randomgame', {
            region: 'euw'
        });
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
        for(var i = 0; i < teamArray.length; i++) {
            if(teamArray[i].participantNo === participantNo) {
                return teamArray[i];
            }
        }
        
        //Create classes
        var PlayerObject = Ember.Object.extend({
            winrate: function() {
                return (this.get('rankedWins') * 100) / (this.get('rankedWins') + this.get('rankedLosses'));
            },
            league: "Unranked",
            hasLeagueData: false,
            hasChampionData: false,
            hasMostPlayedData: false,
            hasMatchHistoryData: false
        });
        
        var obj = PlayerObject.create();
        teamArray.pushObject(obj);
        return obj;
    },
        
    insertCoreDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        
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
    
    insertRoleData: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        playerObj.set('roles', data.roles);
    },
    
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});