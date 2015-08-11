
var request = require('request');
var RequestError = require('./request_error');

var requestHandler = (function () {
    //The instance of the handler
    var instance;
    
    function init() {
        return {
            queue: [], //Holds the queue of requests to make, the last object in the queue is the first to be executed
            requestStamps: [], //Holds data on when the previous requests were made
            executing: false, //Represents whether or not the handler is currently executing the queue
            addToQueue: function(url, fn) {
                this.queue.splice(0, 0, { //Add the new item at the start of the array
                    url: url,
                    cb: fn
                });

                if( this.getTimeDifferenceFromQueue(new Date().getTime()) / 1000 > 10 ) {
                    this.executeQueue();
                }
            },

            addTimeStamp: function(timestamp) {
                if(this.requestStamps.length == 10) {
                    this.requestStamps.splice(0, 1); //remove the oldest element
                    this.requestStamps.push(timestamp); //Insert new timestamp
                }
                else {
                    this.requestStamps.push(timestamp);
                }
            },

            getTimeDifferenceFromQueue: function(time) {
                return (this.requestStamps.length == 10) ? this.requestStamps[0] - time : time; //Return the difference or the time itself
            },

            executeQueue: function() {
                if(!this.executing) {
                    this.executing = true;
                }

                var debug = this.debug;
                var handler = this; //We need a reference to the handler inside the request callback
                console.log("handler");
                console.log(handler);
                while(handler.queue.length > 0 && this.executing === true) {

                    var queueItem = this.queue.pop(); //Remove the last item(which is the first in the queue)

                    if (this.debug){
                        console.log('Calling url', url);
                    }

                    request.get(queueItem.url, function (err, res, body){

                        if (debug){
                            console.log(body);
                        };

                        if(err){

                            if (debug){
                                console.log('Request err:', err);
                            }

                            queueItem.cb(err);
                        } else{
                            if(res.statusCode === 200){
                                handler.addTimeStamp(new Date().getTime());
                                try {

                                    body = JSON.parse(body);
                                    queueItem.cb(null, body);
                                } catch (e){
                                    queueItem.cb(e);
                                }
                            } else if(res.statusCode === 429) {
                                handler.queue.push(queueItem); //Reattach the request to the end of the array
                                handler.executing = false;
                                setTimeout(handler.executeQueue, handler.getTimeDifferenceFromQueue(new Date().getTime()));

                            } else {
                                err = new RequestError(url, res.statusCode);
                                queueItem.cb(err);
                            }
                        }
                    });
                }
            }
        }
    }
    
    return {
        getInstance: function () {
            if(!instance) {
                instance = init();
            }
            
            return instance;
        }
    };
})();

module.exports = requestHandler;