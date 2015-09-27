import Ember from 'ember';

export default Ember.Route.extend({
    renderTemplate: function() {
        this.render('banner', {
            outlet: 'banner'
        });
        
        this.render('currentgame', {
            controller: 'currentgame'
        });
    }
});
