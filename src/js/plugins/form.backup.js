/**
 * Backs up form values before submit for potential later restore.
 *
 * drupal.org's advanced infrastructure may respond with totally bogus things
 * like HTTP redirects to completely invalid locations. Native support for
 * retaining previously posted form values in modern browsers is entirely
 * hi-jacked in those cases; the browser doesn't even know anymore that it
 * posted something.
 */
Drupal.behaviors.dreditorFormBackup = {
  attach: function (context) {
    var self = this;
    $(context).find('form').once('dreditor-form-backup', function () {
      var $form = $(this);
      var form_id = $form.find('[name="form_id"]').val();

      // Save input when any submit button is pressed.
      // Intentionally not listening to the form's 'submit' event, so as to back
      // up the values *before* the browser executes the form submission.
      $form.find('[type="submit"]').bind('click', function () {
        Drupal.storage.save('form.backup.' + form_id, $form.serialize());
      });

      // Determine whether there is input that can be restored.
      var lastValues = Drupal.storage.load('form.backup.' + form_id);
      if (!lastValues) {
        return;
      }
      var $button = $('<a href="#" class="dreditor-application-toggle">Restore last input</a>');
      $button.bind('click', function (e) {
        e.preventDefault();
        if (window.confirm('Reset this form to your last submitted values?')) {
          self.restore($form, Drupal.storage.unserialize(lastValues));
          // Remove the button.
          $(this).fadeOut();
        }
      });
      $button.appendTo($form.find('.form-actions:last'));
    });
  },
  restore: function ($form, values) {
    $form.find('[name]').not('[type=hidden]').each(function () {
      if (typeof values[this.name] !== 'undefined') {
        $(this).val(values[this.name]);
      }
    });
  }
};
