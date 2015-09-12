import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';


moduleForComponent('game-time-tracker', 'Integration | Component | game time tracker', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(2);

  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{game-time-tracker}}`);

  assert.equal(this.$().text(), '');

  // Template block usage:
  this.render(hbs`
    {{#game-time-tracker}}
      template block text
    {{/game-time-tracker}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
