var action = '0';

$(function() {
  $("input:radio[name=action]").click(function() {
    action = $(this).val();
  });
	$('#main-form').submit(function(e) {
    chrome.windows.getCurrent(function(win) {
      chrome.extension.sendMessage(
      {
        'type':          'torrentOpenInfoDone',
        'windowId':      win.id,
        'action':        action,
        'alwaysPerform': $('#always-perform').is(':checked')
      });
		});

		return false;
	});
});