import Ember from 'ember';
import config from '../config/environment';
import ui from 'npm:popmotion';

export default Ember.Controller.extend({
    queryParams: ['playerName', 'region'],
    playerName: '',
    region: 'euw',
    playerPairs: [],
    team1_players: [],
    team2_players: [],
    gameData: undefined,
    gameStartTime: undefined, //Used to keep track of time in-game.
    selectedPlayer: null, //The player that is being shown detailed information about
    
    //Used to identify which game is to be shown in the case several are requested.
    //Starts as undefined to show that no game has been requested yet.
    currentGameId: undefined,
    
    //Insert the socket-io service
    socketIOService: Ember.inject.service('socket-io'),
//    nodeServerAddress: 'http://ns-petteramu.rhcloud.com:8000',
    
    /* The ip to the AWS server */
    nodeServerAddress: 'http://52.29.67.242:80',
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
    
        //Create the class for stages
        var stageClass = Ember.Object.extend({
            core: false,
            league: false,
            champion: false,
            mostplayed: false,
            matchhistory: false,
            roles: false
        });
        
        this.set('stages', stageClass.create());
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
        
        //Update the stage
        var keys = Object.keys(event);
        if(keys.length == 1) {
            (this.get('stages')).set(keys[0], true);
        }
        
        if(typeof event['core'] !== 'undefined') {
            this.coreDataEvent(event['core']);
            this.startAnimation();
        }
        else if(typeof event['league'] !== 'undefined') {
            this.leagueDataEvent(event['league']);
        }
        else if(typeof event['champion'] !== 'undefined') {
            this.champDataEvent(event['champion']);
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
        else if(typeof event['error'] !== 'undefined') {console.log(1);
            if(event['error']['crucial'] === true) {console.log(2);
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
        this.set('gameData', event);
        
        //Insert data into the relevant objects
        var i;
        for(i = 0; i < event['blueTeam'].length; i++) {
            this.insertCoreDataToPairs(event['blueTeam'][i]);
        }
        for(i = 0; i < event['redTeam'].length; i++) {
            this.insertCoreDataToPairs(event['redTeam'][i]);
        }
        //Set game time in seconds
        this.set('ingameTime', (new Date() -  new Date(event.gameStartTime)) / 1000);
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
        for(var pNo in event) {
            if(event.hasOwnProperty(pNo)) {
                this.insertMostPlayedDataToPairs(event[pNo], pNo);
            }
        }
    },
    
    champDataEvent: function(event) {
        this.champData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            this.insertChampDataToPairs(event[i]);
        }
    },
    
    rolesEvent: function(event) {
        
        this.roleData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            this.insertRoleData(event[i]);
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
        
        //Reset the selected player
        this.set('selectedPlayer', null);
        
        //Reset states
        (this.get('stages')).set('core', false);
        (this.get('stages')).set('league', false);
        (this.get('stages')).set('champion', false);
        (this.get('stages')).set('mostplayed', false);
        (this.get('stages')).set('matchhistory', false);
        (this.get('stages')).set('roles', false);
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
        },
    
        /**
         * Sets the currently selected player
         * @param {Integer} participantNo
         */
        setSelectedPlayer: function(participantNo) {
            this.set('selectedPlayer', this.getOrCreatePlayerObject(participantNo));
        }
    },
    
    //Gets the participant number disregarding team(101 and 201 = 1)
    getNormalizedParticipantNo: function(participantNo) {
        return (participantNo > 200) ? participantNo - 200 : participantNo - 100;
    },
    
    getOrCreatePlayerObject: function(participantNo) {
        var teamArray = (participantNo < 200) ? this.get('team1_players') : this.get('team2_players');
        for(var i = 0; i < teamArray.length; i++) {
            if(teamArray[i].participantNo == participantNo) {
                return teamArray[i];
            }
        }
        
        //Create classes
        var PlayerObject = Ember.Object.extend({
            winrate: function() {
                return (this.get('rankedWins') * 100) / (this.get('rankedWins') + this.get('rankedLosses'));
            },
            participantNo: participantNo,
            league: "Unranked"
        });
        
        var obj = PlayerObject.create();
        teamArray.pushObject(obj);
        return obj;
    },
        
    insertCoreDataToPairs: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        
        playerObj.set('name', data.summonerName);
        playerObj.set('summonerId', data.summonerId);
        playerObj.set('normalizedParticipantNo', this.getNormalizedParticipantNo(data.participantNo));
        playerObj.set('participantNo', data.participantNo);
        playerObj.set('runes', data.runes);
        playerObj.set('masteries', data.masteries);
        playerObj.set('summonerSpell1', data.summonerSpell1);
        playerObj.set('summonerSpell2', data.summonerSpell2);
        playerObj.set('image', 'http://ddragon.leagueoflegends.com/cdn/' + this.gameData.version + '/img/champion/' + data.championImage.full);
        
        //Set the selected player to be participant no 101
        if(data.participantNo == 101) {
            this.set('selectedPlayer', playerObj);
        }
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
        playerObj.set('championName', data.championName);
        playerObj.set('championKills', data.championKills);
        playerObj.set('championDeaths', data.championDeaths);
        playerObj.set('championAssists', data.championAssists);
        playerObj.set('championKDA', ((data.championKills + data.championAssists) / data.championDeaths).toFixed(1));
        playerObj.set('championWins', data.championWins);
        playerObj.set('championLosses', data.championLosses);
        playerObj.set('championGames', data.championWins + data.championLosses);
        playerObj.set('championWinrate', ((data.championWins * 100) / (data.championWins + data.championLosses)).toFixed(1));
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
                image: 'http://ddragon.leagueoflegends.com/cdn/' + this.get('gameData').version + '/img/champion/' + data.games[i].championImage.full
            };
            
            //Insert into array
            history.push(gameObj);
        }
        
        playerObj.set("matchHistory", history);
    },
    
    insertMostPlayedDataToPairs: function(data, participantNo) {
        //If there do not exists data for this participant, return
        if(typeof data === 'undefined') {
            return;
        }
        
        //Find the player object
        var playerObj = this.getOrCreatePlayerObject(participantNo);
        var mp = [];
        for(var i = 0; i < data.length; i++) {
            mp.push({
                championId: data[i].championId,
                wins: data[i].wins,
                losses: data[i].losses,
                kills: data[i].kills,
                deaths: data[i].deaths,
                assists: data[i].assists,
                games: data[i].wins + data[i].losses,
                winrate: ((data[i].wins * 100) / ( data[i].wins + data[i].losses)).toFixed(1),
                name: data[i].name,
                KDA: ((data[i].kills + data[i].assists) / data[i].deaths).toFixed(1),
                image: 'http://ddragon.leagueoflegends.com/cdn/' + this.get('gameData').version + '/img/champion/' + data[i].championImage.full
            });
        }
        playerObj.set('mostPlayed', mp);
    },
    
    insertRoleData: function(data) {
        var playerObj = this.getOrCreatePlayerObject(data.participantNo);
        playerObj.set('roles', data.roles);
    },
    
    /**
     * Capitalizes the first letter of the given string
     * @param {String} string
     */
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    
    //////////
    //Animations
    //////////
    
    startAnimation: function() {
        var actor = new ui.Actor({
            element: '.player-rows',
            values: {
                y: 50
            }
        });
        var anim = new ui.Tween({
            duration: 500,
            values: {
                y: 0,
                opacity: 1
            }
        });
        
        actor.start(anim);
    }
});