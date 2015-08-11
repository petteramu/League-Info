"use strict";
var Database = require('../dbtest.js');

//Tests the database methods
describe("Database", function() {
    var db = Database.getInstance();
    //Create an object containing summonerId and the corresponding championId
    var summonerChampPairs = [];
    summonerChampPairs.push({
        summonerId: 399670,
        championId: 7,
        participantNo: 101,
        teamId: 100
    });

    summonerChampPairs.push({
        summonerId: 25909233,
        championId: 14,
        participantNo: 201,
        teamId: 200
    });

    var gameObject = {
        pairs: summonerChampPairs,
        gameType: "RANKED_SOLO_5X5",
        region: "euw"
    };
    
    it("Should contain game data", function() {
        expect(gameObject).toBeTruthy();
    });
    
    it("Getting the most played summoners should return data with the given parameters", function() {
        db.getSummonerMostPlayed(gameObject, 5, function(err, data) {
            expect(err).toBeNull();
            expect(data).not.toBe("No rows");
            expect(data).toBeTruthy();
        });
    });
});

describe("Average datas", function() {
    var db = Database.getInstance();
    var error, result;
    //Create an object containing summonerId and the corresponding championId
    var summonerChampPairs = [];
    summonerChampPairs.push({
        summonerId: 399670,
        championId: 7,
        participantNo: 101,
        teamId: 100
    });

    summonerChampPairs.push({
        summonerId: 25909233,
        championId: 14,
        participantNo: 201,
        teamId: 200
    });

    var gameObject = {
        pairs: summonerChampPairs,
        gameType: "RANKED_SOLO_5X5",
        region: "euw"
    };
    
    beforeEach(function(done) {
        db.getSummonerChampData(gameObject, 5, function(err, data) {
            console.log(data);
            error = err;
            result = data;
            done();
        });
    });
    
    it("should return data on averages and player-averages on a champion", function() {
        expect(error).toBeNull();
        expect(result).not.toBe("No rows");
        expect(result).toBeTruthy();
    });
});