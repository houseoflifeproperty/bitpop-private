(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['main'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div id=\"progress\">\n	<section class=\"top\">\n		<header class=\"wrap\">\n			<div class=\"logo\">\n				<img src=\"../img/surf_banner.png\" />\n			</div>\n		</header>\n		<div class=\"wrap\">\n			<h1>Welcome to Surf Safari</h1>\n			<div class=\"copy cf\">\n				<a class=\"download btn\" href=\"";
  foundHelper = helpers.download_url;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.download_url; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">Download</a>\n				<div class=\"p\">Surf requires BitTorrent Torque to handle .torrent files. <br />Follow the steps below to complete the installatiopn process.</div>\n			</div>\n		</div>\n	</section>\n\n	<section class=\"mid\">\n		<div class=\"steps wrap cf\">\n			<div class=\"step_1\">\n				<img src=\"../img/gray_arrow.png\" />\n				<div class=\"copy\">\n					Download the BitTorrent Torque installer provided above.\n				</div>\n			</div>\n			<div class=\"step_2\">\n				<img src=\"../img/install_screens.png\" />\n				<div class=\"copy\">\n					Run the downloaded installer <em>";
  foundHelper = helpers.filename;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.filename; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</em> from your downloads folder and follow the instructions in the install dialogs.\n				</div>			</div>\n			<div class=\"step_3\">\n				<img src=\"../img/safari_screencap.png\" />\n				<div class=\"copy\">\n					Installation Complete.<br /><br />\n					Click on the Surf icon to the left of the omni-box to Surf in Safari!\n				</div>\n			</div>\n		</div>\n	</section>\n</div>";
  return buffer;});
})();