import Ember from 'ember';
import config from '../config/environment';
import ui from 'npm:popmotion';
import PlayerObject from '../datamodel/PlayerObject';

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
    
    /* The ip to the AWS data server */
    nodeServerAddress: 'http://52.29.67.242:80',
    
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
        var min = Math.floor(this.ingameTime / 60) || 0;
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
        else if(typeof event['error'] !== 'undefined') {
            if(event['error']['crucial'] === true) {
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
    
    /* Inserts the core data to the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    coreDataEvent: function(event) {
        this.set('gameData', event);
        
        //Insert data into the relevant objects
        var i;
        for(i = 0; i < event['blueTeam'].length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event['blueTeam'][i].participantNo);
            playerObj.insertCoreData(event['blueTeam'][i], event.version);
        }
        for(i = 0; i < event['redTeam'].length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event['redTeam'][i].participantNo);
            playerObj.insertCoreData(event['redTeam'][i], event.version);
        }
        //Set game time in seconds
        this.set('ingameTime', (new Date() - new Date(event.gameStartTime)) / 1000);
    },
    
    /* Inserts the match history data into the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    matchHistoryEvent: function(event) {
        this.matchHistoryData = event;
        var i;
        for(i = 0; i < event.data.length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event.data[i].participantNo);
            playerObj.insertMatchHistoryData(event.data[i], this.get('gameData').version);
        }
    },
    
    /* Inserts the league data into the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    leagueDataEvent: function(event) {
        this.leagueData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event[i].participantNo);
            playerObj.insertLeagueData(event[i]);
        }
    },
    
    /* Inserts the most played champion data into the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    mostPlayedEvent: function(event) {
        //TODO: endre data struktur fra server på alle events
        this.mostPlayedData = event;
        var i;
        for(var pNo in event) {
            if(event.hasOwnProperty(pNo)) {
                var playerObj = this.getOrCreatePlayerObject(pNo);
                playerObj.insertMostPlayedData(event[pNo], this.get('gameData').version);
            }
        }
    },
    
    /* Inserts the champion statistics data into the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    champDataEvent: function(event) {
        this.champData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event[i].participantNo);
            playerObj.insertChampionData(event[i]);
        }
    },
    
    /* Inserts the role data into the individual
     * player objects
     * @param {JSON} The data sent from the server
     */
    rolesEvent: function(event) {
        
        this.roleData = event;
        var i;
        for(i = 0; i < event.length; i++) {
            var playerObj = this.getOrCreatePlayerObject(event[i].participantNo);
            playerObj.setRoleData(event[i]);
        }
    },
    
    /* Resets all the data from the previously requested games
     */
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
    
    /* Requests data on an ongoing game from the Data Server
     * If a name is given as a parameter, that name will be sent to the server
     * if not, the value of the "playerName" input will be used
     * @param {String} name
     */
    makeDataRequest: function(name) {
        this.resetData();
        
        var queryName = name || this.playerName;
        var socket = this.get('socketIOService').socketFor(this.nodeServerAddress);
        socket.emit('get:currentgame', {
            name: queryName,
            region: 'euw'
        });
    },
    
    /* Requests a random game from the data server
     * @param {String} region
     */
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
    
    /* Returns a player object representing the given participant number
     * Will return an existing player object of such exists
     * or create a new one if not
     */
    getOrCreatePlayerObject: function(participantNo) {
        var teamArray = (participantNo < 200) ? this.get('team1_players') : this.get('team2_players');
        for(var i = 0; i < teamArray.length; i++) {
            if(teamArray[i].get('participantNo') == participantNo) {
                return teamArray[i];
            }
        }
        
        var obj = PlayerObject.create();
        obj.setParticipantNo(participantNo);
        teamArray.pushObject(obj);
        return obj;
    },
    
    ////////////
    //Animations
    ////////////
    
    /* The animation played on the game information
     * after the core data is received */
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