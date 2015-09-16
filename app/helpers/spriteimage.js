import Ember from 'ember';

export default Ember.Handlebars.registerBoundHelper('spriteimage', function(sprite, givenSize, givenClass, name) {
    if(typeof sprite !== 'undefined') {
        var url = sprite.url || "";
        var x = sprite.x || 0;
        var y = sprite.y || 0;
        
        var size = givenSize || 48;
        
        var alt = (typeof name === 'undefined') ? "" : "alt='" + name + "'";
        
        var c = givenClass || 'champ-icon';
        
        return new Ember.Handlebars.SafeString("<img " + alt + " src='assets/images/div/transparent.png' class='" + c + "'style='background-image: url(" + url + ");background-position: " + x + "px " + y + "px; width: " + size + "px; height: " + size + "px;' title='" + name + "'>");
    }
    else {
        return new Ember.Handlebars.SafeString("<img src='assets/images/div/transparent.png' class='champ-icon'>");
    }
});