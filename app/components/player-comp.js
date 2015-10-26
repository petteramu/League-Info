import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        select: function() {
            var partNo = this.$('.player-container').attr('participant-number');
            this.sendAction('playerWasSelected', partNo);
        }
    }
});