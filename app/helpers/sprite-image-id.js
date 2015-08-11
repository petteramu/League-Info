import Ember from 'ember';

export default Ember.Handlebars.registerBoundHelper('sprite-image-id', function(sprite, givenSize, givenClass, string) {
    if(typeof sprite !== 'undefined') {
        var url = sprite.url || "";
        var x = sprite.x || 0;
        var y = sprite.y || 0;
        
        var size = givenSize || 48;
        var c = givenClass || 'champ-icon';
        var s = string || "";
        
        return new Ember.Handlebars.SafeString("<span class='id-box' data-content='" + s + "'><img src='assets/images/div/transparent.png' class='" + c + "' style='background-image: url(" + url + ");background-position: " + x + "px " + y + "px; width: " + size + "px; height: " + size + "px; '></span>");
    }
    else {
        return new Ember.Handlebars.SafeString("<img src='assets/images/div/transparent.png' class='champ-icon'>");
    }
});