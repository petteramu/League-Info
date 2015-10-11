import Ember from 'ember';

export default Ember.Component.extend({
    didInsertElement: function() {
        this.$().hover(function() {
            Ember.$(".player-name", this).addClass('name-hover');
        }, function() {
            Ember.$(".player-name", this).removeClass('name-hover');
        });
    },
    actions: {
        select: function() {
            var normPartNo = this.$('.player-container').attr('participant-number');
            this.sendAction('playerWasSelected', normPartNo);
        }
    }
});