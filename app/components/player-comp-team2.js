import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        toggleDetails: function() {
            var normPartNo = this.$('.player-container').attr('np');
            Ember.$('[np="' + normPartNo + '"] + .player-expand').slideToggle('slow');
        }
    }
});