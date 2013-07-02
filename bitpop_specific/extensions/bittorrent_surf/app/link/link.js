(function() {
	function downloadTorrent(evt) {
		console.log("downloading torrent");
		eval(document.getElementById("link_data").getAttribute("data-link"));
		Message.send("sl:dlfc", { content: link.content });
		console.log("message sent");
		evt.preventDefault();
		evt.stopPropagation();
		return false;
	}

	function setupDownload() {
		var download_el = document.getElementById("download");
		download_el.onclick = downloadTorrent;
	}

	setupDownload();
	window.dispatchEvent(new CustomEvent("sl:p", {detail:{version:1}}));
})();
