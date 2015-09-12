import Ember from 'ember';

export function msToTime(startTime) {
    var now = new Date();
    var then = new Date(startTime);
    var diff = new Date(now - then);
    
//    var min = Math.floor(diff / 60);
//    var sec = Math.floor(diff % 60);

//    return min + ":" + (sec < 10 ? '0' : '') + sec;
    return diff.getMinutes() + ":" + (diff.getSeconds() < 10 ? '0' : '') + diff.getSeconds();
}

export default Ember.Helper.helper(msToTime);
