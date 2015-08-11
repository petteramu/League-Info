import Ember from 'ember';

export default Ember.Component.extend({
  actions: {
    toggleDetails: function() {
      this.$('.game-info-expand').slideToggle('slow');
    }
  }
});