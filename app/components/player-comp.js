import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        select: function() {
            var normPartNo = this.$('.player-container').attr('participant-number');
            this.sendAction('playerWasSelected', normPartNo);
        }
    }
});