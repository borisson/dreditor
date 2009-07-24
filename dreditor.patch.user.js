// ==UserScript==
// @name           Dreditor: Patch review
// @namespace      http://drupal.org/project/dreditor
// @description    Highlights and outlines diff syntax in patch files.
// @author         Daniel F. Kudwien (sun)
// @version        0.1
// @include        http://drupal.org/node/*
// ==/UserScript==

// Initialize window objects.
$ = window.$ = window.jQuery = unsafeWindow.jQuery;
Drupal = window.Drupal = unsafeWindow.Drupal;

Drupal.dreditor = Drupal.dreditor || { behaviors: {} };

Drupal.dreditor.setup = function (context) {
  // Setup Dreditor overlay.
  var $file = $('<div id="dreditor-wrapper"></div>').hide();
  // Add Dreditor content area.
  $file.append('<div id="dreditor"></div>').appendTo('body');

  // Add sidebar, containing ul#menu by default for convenience.
  var $bar = $('<div id="bar"></div>').append('<ul id="menu"></ul>').appendTo('#dreditor');
  // Add cancel button to tear down Dreditor.
  $('<input id="dreditor-cancel" class="dreditor-button" type="button" value="Cancel" />').click(function () {
    return Drupal.dreditor.tearDown(context);
  }).appendTo($bar);

  // @todo Behaviors of this user script are not invoked with regular behaviors.
  Drupal.attachBehaviors(context);
};

Drupal.dreditor.tearDown = function (context) {
  $('#dreditor-wrapper', context).animate({ height: '0' }, function () {
    $(this).remove();
    Drupal.dreditor.setup(context);
  });
  return false;
};

/**
 * Attach patch review editor to issue attachments.
 */
Drupal.behaviors.dreditorPatchReview = function (context) {
  $('#attachments:not(.dreditor-patchreview-processed), #comments table.comment-upload-attachments:not(.dreditor-patchreview-processed)', context)
    .addClass('dreditor-patchreview-processed')
    .find('a').each(function () {
      if (this.href.indexOf('.patch') == -1) {
        return;
      }
      // Generate review link.
      var $link = $('<a id="dreditor-patchreview" class="dreditor-button" href="' + this.href + '">review</a>').click(function () {
        // Load file.
        $.get(this.href, function (content, status) {
          if (status == 'success') {
            // Show overlay.
            $('#dreditor-wrapper', context).animate({ height: '90%' }).show();
            // Apply Dreditor(.patchReview).behaviors.
            $.each(Drupal.dreditor.behaviors, function () {
              this(context, content);
            });
            // Apply Drupal behaviors.
            Drupal.attachBehaviors(context);
          }
        });
        return false;
      });
      // Append review link to parent table cell.
      $link.appendTo(this.parentNode);
    });
};

/**
 * Create diff outline and highlighting from plaintext code.
 *
 * @param context
 *   The context to work on.
 * @param code
 *   Plain-text code to parse.
 *
 * @todo Rewrite parser to work line-by-line; also to allow '@@ ...' in outline,
 *   i.e. .splitText("\n").
 * @todo Move setup and storage of outline menu and pastie outside.
 * @todo Rework namespace: dreditor, behaviors, patchReview.
 */
Drupal.dreditor.behaviors.diffView = function (context, code) {
  var $dreditor = $('#dreditor', context);
  var file_context = $dreditor.get(0);

  // Convert CRLF, CR into LF.
  code = code.replace(/\r\n|\r/g, "\n");
  // Escape all HTML.
  code = code.replace(/</g, '&lt;');
  code = code.replace(/>/g, '&gt;');
  // Remove cruft: IDE comments.
  code = code.replace(/^\# .+\n/mg, '');
  // Remove cruft: Unversioned files.
  code = code.replace(/^\? .+\n/mg, '');

  // Build hunk menu.
  var $menu = $('#menu', context);
  code = code.replace(/^(\+\+\+ )([^\s]+)(\s.*)/mg, function (full, match1, match2, match3) {
    $menu.append('<li><a href="#' + match2 + '">' + match2 + '</a></li>');
    return match1 + '<a id="' + match2 + '">' + match2 + '</a>' + match3;
  });

  // Colorize file diff lines.
  code = code.replace(/^((Index|===|RCS|retrieving|diff|\-\-\- |\+\+\+ |@@ ).*)$/mig, '<pre class="code file">$1</pre>');
  // Colorize old code, but skip file diff lines.
  code = code.replace(/^((?!\-\-\-)\-.*)$/mg, '<pre class="code old">$1<span /></pre>');
  // Colorize new code, but skip file diff lines.
  code = code.replace(/^((?!\+\+\+)\+.*)$/mg, '<pre class="code new">$1<span /></pre>');

  // Remove duplicate/empty PREs.
  code = code.replace(/<pre>\n<\/pre>/g, '');
  // Wrap all other lines in PREs for copy/pasting.
  code = code.replace(/^( .*)$/mg, '<pre class="code">$1<span /></pre>');
  // Wrap code in container.
  code = '<div id="code">' + code + '</div>';

  // Append code to body.
  $dreditor.append(code);

  // Add Pastie.
  var $bar = $('#bar', context);
  $bar.append('<textarea id="pastie" class="resizable"></textarea>');

  // Copy any selection.
  // @todo Basic concept only; we actually don't want to re-display code until
  //   it's pasted/submitted back into the original page.
  $('#code', file_context).mouseup(function () {
    var sel = document.getSelection().toString().replace(/\r\n|\r/g, "\n").replace(/\n\n/g, "\n");
    if (sel) {
      $('#pastie', context).val(sel);
    }
  });
};

jQuery(document).ready(function () {
  Drupal.dreditor.setup(this);
});

// Add custom stylesheet.
GM_addStyle(" \
#dreditor-wrapper { position: fixed; z-index: 1000; width: 100%; top: 0; } \
#dreditor { position: relative; width: 90%; height: 90%; margin: auto auto; background-color: #fff; } \
#dreditor #bar { position: absolute; width: 230px; height: 100%; padding: 0 10px; font: 10px/18px sans-serif, verdana, tahoma, arial; } \
.dreditor-button, #content a.dreditor-button { background: transparent url(/sites/all/themes/bluebeach/header-back.png) repeat-x 0 -30px; border: 1px solid #06c; color: #fff; cursor: pointer; font: 11px sans-serif, verdana, tahoma, arial; font-weight: bold; padding: 1px 9px; text-transform: uppercase; text-decoration: none; -moz-border-radius: 9px; -webkit-border-radius: 9px; border-radius: 9px; } \
.dreditor-button:hover, #content a.dreditor-button:hover { background-position: 0 0; } \
.dreditor-patchreview-processed .dreditor-button { margin-left: 1em; } \
#dreditor-cancel { position: absolute; bottom: 8px; } \
#dreditor #menu { margin: 0; padding: 0; } \
#dreditor #menu li { margin: 0; padding: 0 10px 0; list-style: none; } \
#dreditor a { text-decoration: none; } \
#dreditor #pastie { width: 100%; height: 12em; font: 13px 'courier new', courier, 'lucida console'; color: #000; } \
#dreditor #code { margin-left: 250px; border-left: 1px solid #ccc; padding-left: 10px; overflow: scroll; height: 100%; } \
#dreditor #code pre { margin: 0; font: 13px 'courier new', courier, 'lucida console'; background-color: transparent; border: 0; padding: 0; } \
#dreditor #code pre span { display: inline-block; margin-left: 2px; width: 2px; height: 7px; background-color: #ddd; } \
#dreditor #code .file { color: #088; } \
#dreditor #code .new { color: #00d; } \
#dreditor #code .old { color: #d00; } \
");
