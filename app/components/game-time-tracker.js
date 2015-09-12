import Ember from 'ember';

export default Ember.Component.extend({
    init: function() {
        this._super();
        
        var _this = this;
        setInterval(function() {
            _this.increaseGameTime.apply(_this);
        }, 1000);
    },
    
    //Set the tag of the component to be a "span" tag
    tagName: 'span',
    
    ingameTime: 0,
    
    readableGameTime: function() {
        var min = Math.floor(this.ingameTime / 60);
        var sec = Math.floor(this.ingameTime % 60);

        return min + ":" + (sec < 10 ? '0' : '') + sec;
    }.property('ingameTime'),
    
    increaseGameTime: function() {
        this.set('ingameTime', this.get('ingameTime') + 1);
    }
});
