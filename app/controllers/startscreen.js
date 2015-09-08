import Ember from 'ember';

export default Ember.Controller.extend({
    actions: {
        proceedSearch: function() {
            if(this.summonerName !== '' && typeof this.summonerName !== 'undefined') {
                this.transitionToRoute('currentgame', {queryParams: {playerName: this.summonerName, region: 'euw' }});
            }
            else {
                Ember.$("#search-message").css("display", "inline-block");
            }
        }
    }
});
