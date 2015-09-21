import Ember from 'ember';

export default Ember.Component.extend({
    didInsertElement: function() {
        var normPartNo = this.$('.player-container').attr('np');
        Ember.$('[np="' + normPartNo + '"]').hover(function() {
            Ember.$('[np="' + normPartNo + '"]').css('background-color', '#f1f1f1');
        }, function() {
            Ember.$('[np="' + normPartNo + '"]').css('background-color', '#f5f5f5');
        });
    },
    
    actions: {
        toggleDetails: function() {
            var normPartNo = this.$('.player-container').attr('np');
            Ember.$('[np="' + normPartNo + '"] + .player-expand').slideToggle(100);
        }
    }
});