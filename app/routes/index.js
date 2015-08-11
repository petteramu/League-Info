import Ember from 'ember';

export default Ember.Route.extend({
    renderTemplate: function() {
        this.render('navbar', {
            outlet: 'navbar'
        });
        
        this.render('currentgame', {
            controller: 'currentgame'
        });
    }
});
