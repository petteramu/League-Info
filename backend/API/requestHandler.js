
var request = require('request');
var RequestError = require('./request_error');
var url = require('url');

var requestHandler = (function (options) {
    //The instance of the handler
    var instance, debug;
    if(typeof options != 'undefined' && typeof options.debug != 'undefined') {
        debug = options.debug;
    }
    
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

                this.tryExecute();
            },
            
            tryExecute: function() {
                var timeDifference = this.getTimeRemaining(new Date().getTime());
                if( timeDifference == 0 || timeDifference / 1000 < 10 ) {
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

            getTimeRemaining: function(time) {
                if(this.requestStamps.length == 10) {
                    return (10000 - (time - this.requestStamps[0]) > 0) ? 10000 - (time - this.requestStamps[0]) : 0;
                }
                return 0;
            },

            executeQueue: function() {
                if(!this.executing) {
                    this.executing = true;
                }

                var handler = requestHandler.getInstance(); //We need a reference to the handler inside the request callback
                
                while(handler.queue.length > 0 && this.executing === true) {

                    var queueItem = handler.queue.pop(); //Remove the last item(which is the first in the queue)

                    if (this.debug){
                        console.log('Calling url', url);
                    }

                    request.get(queueItem.url, function (err, res, body) {

                        if (debug){
                            console.log(body);
                        };

                        if(err){

                            if (debug){
                                console.log('Request err:', err);
                            }

                            queueItem.cb(err);
                        } else{
                            handler.addTimeStamp(new Date().getTime());
                            
                            if(res.statusCode === 200) {
                                try {
                                    body = JSON.parse(body);
                                    
                                    queueItem.cb(null, body);
                                } catch (e){
                                    queueItem.cb(e);
                                }
                                
                            } else if(res.statusCode === 429) {
                                handler.queue.push(queueItem); //Reattach the request to the end of the array
                                handler.executing = false;
                                setTimeout(handler.executeQueue, handler.getTimeRemaining(new Date().getTime()));
                                console.log("Waiting: %s", handler.getTimeRemaining(new Date().getTime()));
                                
                            } else if(res.statusCode === 404) {
                                queueItem.cb(404);
                                
                            } else { //The requestHandler handles the errors that are internal to it itself
                                err = new RequestError(url, res.statusCode);
                                console.log("RequestHandlerError: " + err);
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