(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['add_site_dialog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_site_by_url\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_search_add.png\" />\n        </span>\n        <span class=\"text\">Add Site from URL</span>\n    </h3>\n</header>\n<div class=\"row\">\n    <input type=\"text\" name=\"site-url\" id=\"site-url\" class=\"input_full\" placeholder=\"Enter Site URL\" />\n</div>\n<div class=\"row buttons\">\n    <button class=\"cancel\">Cancel</button>\n    <button class=\"primary\" type=\"submit\">Add Site</button>\n</div>\n";
  return buffer;});
templates['add_sites'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n            <div class=\"site cf\" data-id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n                ";
  foundHelper = helpers.add_sites_icon;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "add_sites_icon", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\n                <span class=\"text\">";
  stack1 = depth0.id;
  foundHelper = helpers.get_site_name;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "get_site_name", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n                <span class=\"icon_sprite remove\" data-tip=\"Remove\">\n                    <img class=\"icon16\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_minus_w.png\" alt=\"Remove\" />\n                </span>\n            </div>\n        ";
  return buffer;}

  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_sites\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_search_add.png\" />\n        </span>\n        <span class=\"text\">";
  foundHelper = helpers.add_sites_header;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "add_sites_header", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n    </h3>\n</header>\n\n<div class=\"row\">\n    <div class=\"sites\">\n        ";
  stack1 = depth0.sites;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n</div>\n<div class=\"row buttons\">\n    <button class=\"cancel\">Cancel</button>\n    <button class=\"primary\" type=\"submit\">Add Search Sites</button>\n</div>\n\n";
  return buffer;});
templates['alert'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  buffer += "<div class=\"alert focused\"";
  foundHelper = helpers.alert_data;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "alert_data", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + ">\n	<h3>";
  foundHelper = helpers.alert_icon;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "alert_icon", depth0, {hash:{}});
  buffer += escapeExpression(stack1);
  foundHelper = helpers.alert_text;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "alert_text", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</h3>\n</div>";
  return buffer;});
templates['app'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div id=\"tooltip\"></div>\n<div class=\"outer\">\n    <div class=\"main\">\n        <div id=\"dialogs\"></div> \n        <div id=\"main_content\">\n            <div id=\"toolbar\" class=\"toolbar\"></div>\n            <div id=\"search_results\"></div>\n            <div id=\"torrent_content\" class=\"list_content\"></div>\n        </div>\n    </div>\n    <div id=\"alerts\"></div>\n</div>";});
templates['association_dialog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing;


  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_site_by_url\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_preference_settings.png\" />\n        </span>\n        <span class=\"text\">Preferences</span>\n    </h3>\n</header>\n<div class=\"list_content\">\n    <fieldset>\n        <legend>Set Default Torrent Client</legend>\n        <div class=\"row\"> \n            <input type=\"checkbox\" id=\"set_association\" name=\"associate\" ";
  stack1 = depth0.associate;
  foundHelper = helpers.set_checked;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "set_checked", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + " />\n            <label for=\"set_association\">Make Surf the default application for .torrent files and magnet links.</label>\n        </div>\n    </fieldset>\n</div>\n<div class=\"row buttons\">\n    <div class=\"left remember\">\n      <input type=\"checkbox\" id=\"remember_association\" name=\"remember_association\" class=\"js-remember-association\" ";
  stack1 = depth0.remember_association;
  foundHelper = helpers.set_checked;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "set_checked", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + " />\n      <label for=\"remember_association\">Remember this setting</label>\n    </div>\n    <button type=\"submit\" class=\"primary\">Continue</button>\n</div>";
  return buffer;});
templates['engines_dialog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_search_settings.png\" />\n        </span>\n        <span class=\"text\">Use default search engine in Surf?</span>\n    </h3>\n    <div class=\"search_options\">\n      <input type=\"radio\" name=\"search_engine_first\" value=\"google\" />\n      <label>Google</label>\n      <small>(\"torrent\" added to searches)</small>\n    </div>\n    <div class=\"search_options\">\n      <input type=\"radio\" name=\"search_engine_first\" value=\"bing\" />\n      <label>Bing</label>\n      <small>(\"torrent\" added to searches)</small>\n    </div>\n    <div class=\"search_options\">\n      <input type=\"radio\" name=\"search_engine_first\" value=\"yahoo\" />\n      <label>Yahoo</label>\n      <small>(\"torrent\" added to searches)</small>\n    </div>\n</header>\n<div class=\"row buttons\">\n    <button class=\"cancel js-set-default-search\" data-default-search=\"false\">Not now</button>\n    <button type=\"submit\" class=\"primary js-set-default-search\" data-default-search=\"true\" data-close-dialog=\"true\">Use Selected</button>\n</div>\n";
  return buffer;});
templates['genres'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "";
  buffer += "\n    <li><a href=\"#\" class=\"js-link-search genre-search\" data-type=\"/surf:BTFC-";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "\">";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "</a></li>\n";
  return buffer;}

  foundHelper = helpers.genres;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  else { stack1 = depth0.genres; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.genres) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});
templates['history'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "";
  buffer += "\n    <li><a href=\"#\" class=\"js-link-search\" data-suggestion=\"";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "\">";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "</a></li>\n";
  return buffer;}

function program3(depth0,data) {
  
  
  return "\n    <li><a>Empty history.</a></li>\n";}

function program5(depth0,data) {
  
  
  return "\n    <li class=\"divider\"></li>\n    <li><a href=\"#\" class=\"js-clear-history\">Clear recent searches</a></li>\n";}

  buffer += "    <li><h5>Recent Searches</h5></li>\n";
  foundHelper = helpers.history;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  else { stack1 = depth0.history; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.history) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  foundHelper = helpers.history;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.program(3, program3, data),fn:self.noop}); }
  else { stack1 = depth0.history; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.history) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(3, program3, data),fn:self.noop}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  stack1 = depth0.history;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(5, program5, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;});
templates['notifications_dialog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n	    <div class=\"header\">\n	        <span class=\"column center\" style=\"width: 15%\">Type</span>\n	        <span class=\"column\" style=\"width: 63%\">Event</span>\n	        <span class=\"column\" style=\"width: 22%\">Time</span>\n	    </div>\n	    <ul class=\"list\">\n	        ";
  stack1 = depth0.notifications;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	    </ul>\n	";
  return buffer;}
function program2(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n	            <li class=\"";
  stack1 = depth0.attributes;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.type;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + " ";
  foundHelper = helpers.resolved_class;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "resolved_class", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\">\n	                ";
  foundHelper = helpers.notification_icon;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "notification_icon", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\n	                ";
  foundHelper = helpers.notification_link;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "notification_link", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\n	                <time class=\"timeago time\" datetime=\"";
  stack1 = depth0.timestamp;
  foundHelper = helpers.iso_date;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "iso_date", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.timestamp;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.timestamp; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</time>\n	            </li>\n	        ";
  return buffer;}

function program4(depth0,data) {
  
  
  return "\n	    <ul class=\"list\">\n	        <li class=\"message\">No notifications.</li>\n	    </ul>\n	";}

  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_site_by_url\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_notification_settings.png\" />\n        </span>\n        <span class=\"text\">Notifications</span>\n    </h3>\n</header>\n<div class=\"list_content\">\n	";
  stack1 = depth0.notifications;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n<div class=\"buttons\">\n    <button class=\"cancel right\">Done</button>\n</div>\n";
  return buffer;});
templates['remote_asset'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 remote_asset_icon\">\n            <span class=\"line\"></span>\n            <img src=\"\" />\n        </span>\n        <span class=\"text\"></span>\n    </h3>\n</header>\n<div id=\"remote_iframe_container\"></div>\n<div class=\"buttons\">\n    <button class=\"cancel right\">Done</button>\n</div>\n";});
templates['result'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function", self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  
  return "\n    <div class=\"arrow js-toggle-expandable\"></div>\n";}

function program3(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n    <a class=\"js-open-tab\" data-tip=\"";
  foundHelper = helpers.get_tab_link_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_tab_link_tip", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\" href=\"";
  stack1 = depth0.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\"><img src=\"";
  stack1 = depth0.favicon;
  foundHelper = helpers.getFavicon;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "getFavicon", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "\" alt=\"\" class=\"icon16 favicon\"/></a>\n";
  return buffer;}

function program5(depth0,data,depth1) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n        ";
  foundHelper = helpers.torrent;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.programWithDepth(program6, data, depth1)}); }
  else { stack1 = depth0.torrent; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.torrent) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program6, data, depth1)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  foundHelper = helpers.magnet;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.programWithDepth(program9, data, depth1)}); }
  else { stack1 = depth0.magnet; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.magnet) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program9, data, depth1)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;}
function program6(depth0,data,depth2) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n            <li>\n                <div class=\"line\"></div>\n                <a href=\"";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "\" class=\"download torrent ";
  stack1 = depth2.downloaded;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  stack1 = stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(7, program7, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-id=\"";
  stack1 = depth2.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\">\n                    <img class=\"icon16 dl_arrow\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_download_w.png\" alt=\"Download\" data-tip=\"";
  foundHelper = helpers.get_download_link_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_download_link_tip", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "\" />\n                    <img class=\"icon16 check\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_check_w.png\" alt=\"Downloading\" data-tip=\"Downloading\" />\n                </a>\n            </li>\n        ";
  return buffer;}
function program7(depth0,data) {
  
  
  return "downloading";}

function program9(depth0,data,depth2) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n            <li>\n                <div class=\"line\"></div>\n                <a href=\"";
  depth0 = typeof depth0 === functionType ? depth0() : depth0;
  buffer += escapeExpression(depth0) + "\" class=\"download magnet ";
  stack1 = depth2.downloaded;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  stack1 = stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(10, program10, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-id=\"";
  stack1 = depth2.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\">\n                    <img class=\"icon16 dl_arrow\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_download_w.png\" alt=\"Magnet\" data-tip=\"";
  foundHelper = helpers.get_download_link_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_download_link_tip", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "\" />\n                    <img class=\"icon16 check\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_check_w.png\" alt=\"Downloading\" data-tip=\"Downloading\" />\n                </a>\n            </li>\n        ";
  return buffer;}
function program10(depth0,data) {
  
  
  return "downloading";}

function program12(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n    ";
  stack1 = depth1.duplicates;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.programWithDepth(program15, data, depth1),fn:self.programWithDepth(program13, data, depth1)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;}
function program13(depth0,data,depth2) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n        <span class=\"title js-toggle-expandable\" data-tip=\"";
  foundHelper = helpers.get_title_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_title_tip", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.get_result_name;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_result_name", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n    ";
  return buffer;}

function program15(depth0,data,depth2) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n        <span class=\"title\" data-tip=\"";
  foundHelper = helpers.get_title_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_title_tip", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.get_result_name;
  stack1 = foundHelper ? foundHelper.call(depth0, depth2, {hash:{}}) : helperMissing.call(depth0, "get_result_name", depth2, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n    ";
  return buffer;}

function program17(depth0,data,depth1) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n    <ul class=\"duplicates\">\n        <li>\n            <a class=\"js-open-tab\" data-tip=\"";
  foundHelper = helpers.get_tab_link_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_tab_link_tip", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\" href=\"";
  stack1 = depth0.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\">\n                <img src=\"";
  stack1 = depth1.favicon;
  foundHelper = helpers.getFavicon;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "getFavicon", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "\" alt=\"\" class=\"icon16 favicon\"/>\n            </a>\n            <span class=\"title\" data-tip=\"";
  foundHelper = helpers.get_title_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth1, {hash:{}}) : helperMissing.call(depth0, "get_title_tip", depth1, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth1.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "</span>\n        </li>\n        ";
  foundHelper = helpers.duplicates;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.programWithDepth(program18, data, depth0)}); }
  else { stack1 = depth0.duplicates; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.duplicates) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program18, data, depth0)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n";
  return buffer;}
function program18(depth0,data,depth1) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n        <li>\n            <a class=\"js-open-tab\" data-tip=\"";
  foundHelper = helpers.get_tab_link_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_tab_link_tip", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\" href=\"";
  stack1 = depth0.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\">\n                <img src=\"";
  stack1 = depth0.favicon;
  foundHelper = helpers.getFavicon;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "getFavicon", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "\" alt=\"\" class=\"icon16 favicon\"/>\n            </a>\n            <span class=\"title\" data-tip=\"";
  foundHelper = helpers.get_title_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth1, {hash:{}}) : helperMissing.call(depth0, "get_title_tip", depth1, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth0.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "</span>\n        </li>\n        ";
  return buffer;}

  stack1 = depth0.duplicates;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    <div class=\"col size right\">\n        <span class=\"size\">";
  foundHelper = helpers.get_result_size;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_result_size", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n\n    ";
  foundHelper = helpers.scrape_health;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "scrape_health", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\n\n    <ul class=\"downloads\">\n    ";
  foundHelper = helpers.download;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.programWithDepth(program5, data, depth0)}); }
  else { stack1 = depth0.download; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.download) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program5, data, depth0)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n\n";
  foundHelper = helpers.torrent;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.programWithDepth(program12, data, depth0)}); }
  else { stack1 = depth0.torrent; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.torrent) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program12, data, depth0)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = depth0.duplicates;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(program17, data, depth0)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;});
templates['search'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div id=\"suggestion\"></div>\n<div class=\"search_content\">\n	<div class=\"header\">\n	    <div class=\"column site\">Site</div>\n	    <div class=\"column name\">Name</div>\n	    <div class=\"column size\">Size</div>\n	    <div class=\"column result_health\">Health</div>\n	    <div class=\"column link\">Link</div>\n	</div>\n	<ul class=\"content can-expand\">\n	    <li class=\"message\" id=\"no_results\">Empty list.</li>\n	</ul>\n	<div class=\"alert_container\"></div>\n</div>";});
templates['settings_dialog'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_site_by_url\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_preference_settings.png\" />\n        </span>\n        <span class=\"text\">Preferences</span>\n    </h3>\n</header>\n<div class=\"list_content\">\n    <fieldset>\n        <legend>Download folder</legend>\n        <div class=\"row\"> \n            <input type=\"text\" id=\"dir_active_download\" name=\"dir_active_download\" class=\"js-select-download-dir\" placeholder=\"User's Downloads Folder\" style=\"width: 75%\" readonly />\n            <button class=\"js-select-download-dir\">Browse&hellip;</button>\n        </div>\n    </fieldset>\n\n    <fieldset>\n        <legend>Sharing</legend>\n        <div class=\"row\">\n            <div class=\"col half seed-option\" id=\"seed_time_options\">\n                <div class=\"row\">\n                    <label>Share time: <b><span id=\"seed_time_text\">10 minutes</span></b></label>\n                </div>\n                <div class=\"row\">\n                    <input type=\"range\" min=\"0\" max=\"370\" step=\"10\" value=\"10\" id=\"seed_time\" name=\"seed_time\" />\n                </div>\n            </div>\n\n            <div class=\"col half hidden seed-option\" id=\"seed_percentage_options\">\n                <div class=\"row\">\n                    <label>Share percentage: <b><span id=\"seed_percentage_text\">200%</span></b></label>\n                </div>\n                <div class=\"row\">\n                    <input type=\"range\" min=\"0\" max=\"400\" step=\"10\" value=\"200\" id=\"seed_percentage\" name=\"seed_percentage\" />\n                </div>\n            </div>\n            \n            <div class=\"col half\">\n                <div class=\"row\">\n                    <input type=\"radio\" name=\"seed_type\" value=\"time\" id=\"seed_type_time\" checked=\"checked\" data-options=\"seed_time_options\" />\n                    <label for=\"seed_type_time\">Share for specified time</label>\n                </div>\n                <div class=\"row\">\n                    <input type=\"radio\" name=\"seed_type\" value=\"percentage\" id=\"seed_type_percentage\" data-options=\"seed_percentage_options\" />\n                    <label for=\"seed_type_percentage\">Share for % of size</label>\n                </div>\n            </div>\n        </div>\n    </fieldset>\n\n    <fieldset>\n        <legend>Torrent Association</legend>\n        <div class=\"row\"> \n            <input type=\"checkbox\" id=\"set_association_setting\" name=\"associate\" />\n            <label for=\"set_association_setting\">Use Surf to open .torrent files and magnet links.</label>\n        </div>\n    </fieldset>\n</div>\n<div class=\"buttons\">\n    <button class=\"cancel right\">Done</button>\n</div>\n";
  return buffer;});
templates['site_manager'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n            <li class=\"";
  foundHelper = helpers.type;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.type; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + " ";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">\n                <img src=\"";
  foundHelper = helpers.favicon;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.favicon; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" alt=\"\" class=\"icon16 favicon\"/>\n                <input type=\"checkbox\" id=\"site_";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" data-id=\"";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" class=\"switch_input js-toggle-site\" ";
  stack1 = depth0.enabled;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n                <div class=\"switch ";
  foundHelper = helpers.site_enabled;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "site_enabled", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\"></div>        \n                <label for=\"site_";
  foundHelper = helpers.id;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\">";
  stack1 = depth0.id;
  foundHelper = helpers.get_site_name;
  stack1 = foundHelper ? foundHelper.call(depth0, stack1, {hash:{}}) : helperMissing.call(depth0, "get_site_name", stack1, {hash:{}});
  buffer += escapeExpression(stack1) + "</label>\n            </li>\n        ";
  return buffer;}
function program2(depth0,data) {
  
  
  return "checked=\"checked\"";}

  buffer += "<header class=\"dialog_header\">\n    <h3>\n        <span class=\"icon icon24 add_site_by_url\">\n            <span class=\"line\"></span>\n            <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_search_settings.png\" />\n        </span>\n        <span class=\"text\">Search Settings</span>\n    </h3>\n</header>\n<div class=\"list_content\">\n    <ul class=\"list can-expand\">\n        <li class=\"expandable default_engines\">\n            <div class=\"arrow js-toggle-expandable\"></div>\n            <input type=\"checkbox\" class=\"switch_input js-toggle-site\" name=\"search_default\" id=\"search_default\" data-id=\"search_default\" />\n            <div class=\"switch\"></div>\n\n            <label for=\"search_engine\">Default Search Site <small>(\"torrent\" added to searches.)</small></label>\n            \n            <ul class=\"engines sub\">\n                <li>\n                    <input type=\"radio\" name=\"search_engine\" value=\"google\" /><label>Google</label>\n                </li>\n                <li>\n                    <input type=\"radio\" name=\"search_engine\" value=\"bing\" /><label>Bing</label>\n                </li>\n                <li>\n                    <input type=\"radio\" name=\"search_engine\" value=\"yahoo\" /><label>Yahoo</label>\n                </li>\n            </ul>\n        </li>\n        ";
  foundHelper = helpers.sites;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  else { stack1 = depth0.sites; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  if (!helpers.sites) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data)}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "        \n    </ul>\n</div>\n\n<div class=\"buttons\">\n    <button class=\"left js-open-dialog\" data-dialog=\"add_site\">Add Site from URL</button>\n    <button class=\"cancel right\">Done</button>\n</div>";
  return buffer;});
templates['suggestion'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n		<span id=\"label\">Did you mean: </span>\n		<a href=\"#\" data-suggestion=\"";
  foundHelper = helpers.spelling;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.spelling; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "\" class=\"js-link-search text\">";
  foundHelper = helpers.spelling;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.spelling; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a>\n	";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n		<span id=\"label\">You might like: </span>\n		<a href=\"#\" data-suggestion=\"";
  stack1 = depth0.model;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "\" class=\"js-link-search text\">";
  stack1 = depth0.model;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.torrent;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "</a>\n\n		<div class=\"more\">More: \n			<a href=\"#\" data-type=\"/surf:BTFC-";
  foundHelper = helpers.get_first_genre;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_first_genre", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\" class=\"js-genre-search\">";
  foundHelper = helpers.get_first_genre_capitalized;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_first_genre_capitalized", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</a>\n			<a href=\"#\" class=\"arrow icon16 js-toggle-menu hidden\"></a>\n		    <ul class=\"menu hidden\">\n				";
  stack1 = depth0.model;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.recommended_genres;
  stack1 = helpers.each.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(4, program4, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n		    </ul>\n		</div>\n	";
  return buffer;}
function program4(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n			    	<li><a href=\"#\" class=\"js-genre-search\" data-type=\"/surf:BTFC-";
  foundHelper = helpers.capitalize;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "capitalize", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.capitalize;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "capitalize", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</a></li>\n				";
  return buffer;}

  buffer += "<div class=\"suggestion\">\n	";
  stack1 = depth0.spelling;
  stack1 = helpers['if'].call(depth0, stack1, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data)});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>";
  return buffer;});
templates['toolbar'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"search_container\">\n    <div id=\"search_history\">\n        <a href=\"#\" class=\"arrow icon16 js-toggle-menu\">Search History</a>\n\n        <ul class=\"hidden menu\">\n            <li>Empty list.</li>\n        </ul>\n    </div>\n    <div id=\"do-search\">\n        <button class=\"search_icon\" type=\"submit\">Search</button>\n        <input type=\"text\" name=\"search_text\" id=\"search_text\" placeholder=\"Search for stuff\" />\n    </div>\n    <div id=\"add_site_button\">\n        <button class=\"js-open-dialog\" data-dialog=\"site_manager\">Add Search Site</button>\n    </div>\n\n</div>\n\n<ul class=\"buttons\">\n    <li>\n        <a class=\"js-open-dialog\" data-dialog=\"notifications\" href=\"#notifications-view\" data-tip=\"Notifications\">\n            <span class=\"notifications\">\n                <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_notification_settings.png\" class=\"icon20\" />\n            </span>\n            <span id=\"notifications-badge\" data-ct=\"0\"></span>\n        </a>\n    </li>\n    <li>\n        <a class=\"js-open-dialog\" data-dialog=\"site_manager\" href=\"#search_settings\" data-tip=\"Search Settings\">\n            <span class=\"site_manager\">\n                <img src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_search_settings.png\" class=\"icon20\" />\n            </span>\n        </a>\n    </li>\n</ul>";
  return buffer;});
templates['torrent'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, functionType="function";


  buffer += "<div class=\"row\" data-tip=\"";
  foundHelper = helpers.get_torrent_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_torrent_tip", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\">\n    <div class=\"col download\">\n        <h2>";
  stack1 = depth0.properties;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1() : stack1;
  buffer += escapeExpression(stack1) + "</h2>\n    </div>\n    <div class=\"col status right\">\n        <span class=\"eta\">";
  foundHelper = helpers.get_eta;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_eta", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n        <span class=\"eq\" data-tip=\"";
  foundHelper = helpers.get_eq_tip;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_eq_tip", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\">\n            <span class=\"down left\">\n                <span class=\"icon eq_sprite ";
  foundHelper = helpers.get_class_down;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_class_down", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\"></span>\n            </span>\n            <span class=\"up right\">\n                <span class=\"icon eq_sprite ";
  foundHelper = helpers.get_class_up;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_class_up", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\"></span>\n            </span>\n        </span>\n    </div>\n    <div class=\"col size right\">\n        <span class=\"size\" data-tip=\"";
  foundHelper = helpers.get_downloaded_size;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_downloaded_size", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\">";
  foundHelper = helpers.get_total_size;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_total_size", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "</span>\n    </div>\n    <div class=\"col options\">\n        ";
  foundHelper = helpers.get_active_health;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_active_health", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "\n        <span class=\"icon_sprite remove\" data-tip=\"Remove Download\"><img class=\"icon16\" alt=\"remove\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_delete_w.png\" /></span>\n        <span class=\"icon_sprite pause\" data-tip=\"Pause Download\"><img class=\"icon16\" alt=\"pause\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_pause_w.png\" /></span>\n        <span class=\"icon_sprite start\" data-tip=\"Resume Download\"><img class=\"icon16\" alt=\"download\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_download_w.png\" /></span>\n        <span class=\"icon_sprite open\" data-tip=\"Open Download's Folder\"><img class=\"icon16\" alt=\"open\" src=\"";
  foundHelper = helpers.root;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.root; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "img/icon_download_folder.png\" /></span>\n    </div>\n</div>\n<div class=\"row progress_bar\">\n    <div class=\"col full\">\n        <div class=\"progress\">\n            <div class=\"track\"></div>\n            <div class=\"bar\" style=\"width: ";
  foundHelper = helpers.get_progress;
  stack1 = foundHelper ? foundHelper.call(depth0, depth0, {hash:{}}) : helperMissing.call(depth0, "get_progress", depth0, {hash:{}});
  buffer += escapeExpression(stack1) + "%\"></div>\n        </div>\n    </div>\n</div>\n";
  return buffer;});
templates['torrents'] = template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"header\">\n    <div class=\"column download\">Downloads</div>\n    <div class=\"column status\">Status</div>\n    <div class=\"column size\">Size</div>\n    <div class=\"column torrent_health\">Options</div>\n\n    <div id=\"download_settings\">\n        <a href=\"#\" class=\"arrow icon16 js-toggle-menu\" data-tip=\"Open Settings\">Torrent Settings</a>\n        \n        <ul class=\"hidden menu\">\n            <li class=\"js-open-dialog\" data-dialog=\"settings\" href=\"#settings\">Set Download Options</li>\n            <li class=\"js-menu-action\" data-action=\"clear_completed_downloads\">Clear Completed Downloads</li>\n        </ul>\n    </div>  \n</div>\n\n<!-- Displayed when NO torrents are downloading/seeding -->\n<div class=\"message\" id=\"no_torrents\">Empty list.</div>\n\n<!-- Displayed when torrents are downloading/seeding -->\n<ul id=\"torrents\"></ul>\n\n<div class=\"alert_container\"></div>";});
})();