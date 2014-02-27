$(function() {
	$('#sidebar_link').click(function(ev) {
		chrome.tabs.create({
			'url': '/roster.html',
			'active': false
		});
		ev.preventDefault();
	});
});