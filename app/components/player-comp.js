import Ember from 'ember';

export default Ember.Component.extend({
  actions: {
    toggleDetails: function() {
      this.$('.player-expand').slideToggle('slow');
    }
  }
});