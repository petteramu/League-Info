import Ember from 'ember';

export default Ember.Component.extend({
    mouseEnter: function() {
    	this.$('.masteries').css('display', 'flex');
    },

    mouseLeave: function() {
    	this.$('.masteries').css('display', 'none');
    }
});