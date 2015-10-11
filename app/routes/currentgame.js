import Ember from 'ember';

export default Ember.Route.extend({
    renderTemplate: function() {
        this.render('banner', {
            outlet: 'banner'
        });
        
        this.render('currentgame', {
            controller: 'currentgame'
        });
    },
    
    actions: {
        setAsSelected: function(participantNo) {console.log(1);
//            this.controllerFor('currentgame').setSelectedPlayer(this.getOrCreatePlayerObject(participantNo));
        }   
    }
});