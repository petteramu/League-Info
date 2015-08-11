var updateCounter = function(total, cb) {
    var total = total;
    var totalDone = 0;
    var callback = cb;
    
    this.increment = function(err) {
        if(err) {
            console.log(err);
        }

        totalDone += 1;
        
        if(totalDone == total) {
            callback();
        }
    }
    
    return this;
}

module.exports = updateCounter;