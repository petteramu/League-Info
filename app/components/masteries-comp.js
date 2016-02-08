import Ember from 'ember';

export default Ember.Component.extend({
	init: function() {
        this._super.apply(this, arguments);
		$('.normal').hover(function(e) {
			alert();
			$('.tooltip').css('display', 'block');
		})
	},

    mouseEnter: function() {
    	this.$('.masteries').css('display', 'flex');
    },

    mouseLeave: function() {
    	this.$('.masteries').css('display', 'none');
    }
});