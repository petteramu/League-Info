import Ember from 'ember';

/* Represents the players in a game.
 * 
 * Contains information on the players, which can be added through 
 * specific methods for each stage sent from the data server
 */
var PlayerObject = Ember.Object.extend({
    /* The participant number of the player
     * Is used to identify this object */
    setParticipantNo: function(pNo) {
        this.set('participantNo', pNo);
    },
    
    /* The league of the player is set to a default of 'Unranked'
     * To display this information when there is no known ranking */
    league: "Unranked",
    
    /* Inserts core data into this PlayerObject
     * Core data consists of:
     *     - Summoner name
     *     - Summoner id
     *     - Participant number
     *     - Runes - A list of runes used by the player in the match
     *     - Masteries - The set of masteries used by the player in the match
     *     - Summoner spells
     *     - Champion image
     */
    insertCoreData: function(data, version) {
        this.set('name', data.summonerName);
        this.set('summonerId', data.summonerId);
        this.set('participantNo', data.participantNo);
        this.set('runes', data.runes);
        this.set('masteries', data.masteries);
        this.set('summonerSpell1', data.summonerSpell1);
        this.set('summonerSpell2', data.summonerSpell2);
        this.set('image', 'http://ddragon.leagueoflegends.com/cdn/' + version + '/img/champion/' + data.championImage.full);
    },
    
    /* Inserts champion specific data
     * This data represents the statistics of how the player
     * has performed on the different champions
     * This data consists of:
     *      - Champion name
     *      - Kills
     *      - Deaths
     *      - Assists
     *      - Wins
     *      - Losses
     */
    insertChampionData: function(data) {
        this.set('championName', data.championName);
        this.set('championKills', data.championKills);
        this.set('championDeaths', data.championDeaths);
        this.set('championAssists', data.championAssists);
        this.set('championWins', data.championWins);
        this.set('championLosses', data.championLosses);
        this.set('championGames', data.championWins + data.championLosses);
        this.set('championWinrate', (data.championWins * 100 / (data.championWins + data.championLosses)).toFixed(1));
        this.set('championKDA', ((data.championKills + data.championAssists) / data.championDeaths).toFixed(1));
    },
    
    /* Inserts league placement data
     * This data represents the players ranking
     * Consists of:
     *      - League
     *      - Division
     *      - Wins
     *      - Losses
     */
    insertLeagueData: function(data) {
        this.set('league', this.capitalizeFirstLetter(data.league.toLowerCase()));
        this.set('division', data.division);
        this.set('rankedWins', data.wins);
        this.set('rankedLosses', data.losses);
        this.set('rankedWinrate', ((this.get('rankedWins') * 100) / (this.get('rankedWins') + this.get('rankedLosses'))).toFixed(1));
        this.set('rankedKDA', ((this.get('rankedKills') + this.get('rankedAssists')) / this.get('rankedDeaths')).toFixed(1));
    },
        
    /* Inserts ranked statistics data
     * This data represents the players performance statistics
     * Consists of:
     *      - Kills
     *      - Deaths
     *      - Assists
     */
    insertRankedData: function(data) {
        this.set('rankedKills', data.kills);
        this.set('rankedDeaths', data.deaths);
        this.set('rankedAssists', data.assists);
    },
    
    /* Inserts the match history of the player
     * Consists of a list of the 10 last games the player played
     * regardless of queue
     * 
     * Each game object contains data on the champion that was played, 
     * whether the player won or not and an image of the champion.
     */
    insertMatchHistoryData: function(data, version) {
        var history = [];
        
        //Create new structure of data
        for(var i = 0; i < data.games.length; i++) {
            var gameObj = {
                championId: data.games[i].championId,
                win: data.games[i].winner,
                image: 'http://ddragon.leagueoflegends.com/cdn/' + version + '/img/champion/' + data.games[i].championImage.full
            };
            
            //Insert into array
            history.push(gameObj);
        }
        
        this.set("matchHistory", history);
    },
    
    /* Inserts data on which champions the player has played the most.
     * For each champion, we require data on:
     *      - The champions id
     *      - The champions name
     *      - An url to an image of the champion
     *      - Wins
     *      - Losses
     *      - Kills
     *      - Assists
     *      - Deaths
     */
    insertMostPlayedData: function(data, version) {
        //If there do not exists data for this participant, do no proceed
        if(typeof data === 'undefined') {
            return;
        }
        
        //Find the player object
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
                image: 'http://ddragon.leagueoflegends.com/cdn/' + version + '/img/champion/' + data[i].championImage.full
            });
        }
        this.set('mostPlayed', mp);
    },
    
    /* Sets the role data of the palyer */
    setRoleData: function(data) {
        this.set('roles', data.roles);
    },
        
    
    /**
     * Capitalizes the first letter of the given string
     * @param {String} string
     */
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    
});

export default PlayerObject;