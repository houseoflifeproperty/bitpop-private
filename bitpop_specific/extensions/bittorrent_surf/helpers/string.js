define(function() {

	var helpers = {

		capitalize: function(string) {
			return this.capitalizePrototype.call( string );
		},

		capitalizePrototype: function() {
			if (this.length === 0)
				return this;
			return this[0].toUpperCase() + this.slice(1);
		},

		//strips out white space.  added to string prototype ast end of file
		trim: function( str, to_trim ){
			return this.trimPrototype.call( str, to_trim );
		},

		// XXX: memoize common regex-es
		// XXX: do we accept a string as a list for OR regex
		trimPrototype: function(to_trim){
			if (to_trim === undefined)
				to_trim = '\\s';
			var trim_regex = new RegExp(
				'(^[' + to_trim + ']*|[' + to_trim + ']*$)', 'g');
			return this.replace(trim_regex, '');
		},

		// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
		generateGuid: function(){
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
				function(c) {
					// this is the sort of crap that makes js annoying...
					// int-ification via random type coercion
					var r = Math.random() * 16 | 0;
					var v = c == 'x' ? r : (r&0x3|0x8);
					return v.toString(16);
			});
		},

		isEmail: function( str ){
			// XXX: perhaps something broader and simpler :)
			// /^[\w-%+.]*@[\w.-]+\.[\w]{2,6}$
			var pattern =  /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])/i;
			
			return pattern.test( str );
		},

		//http://www.webtoolkit.info/javascript-utf8.html
		utf8: {
			// public method for url encoding
			encode: function (string) {
				string = string.replace(/\r\n/g,'\n');
				var utftext = '';
				for (var n = 0; n < string.length; n++) {
					var c = string.charCodeAt(n);
					if (c < 128) {
						utftext += String.fromCharCode(c);
					}
					else if((c > 127) && (c < 2048)) {
						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);
					}
					else {
						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);
					}
				}
				return utftext;
			},
				
			// public method for url decoding
			decode: function (utftext) {
				var string = '';
				var i = 0,
					c = 0,
					c1 = 0,
					c2 = 0;
				while ( i < utftext.length ) {
					c = utftext.charCodeAt(i);
					if (c < 128) {
						string += String.fromCharCode(c);
						i++;
					}
					else if((c > 191) && (c < 224)) {
						c2 = utftext.charCodeAt(i+1);
						string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
						i += 2;
					}
					else {
						c2 = utftext.charCodeAt(i+1);
						c3 = utftext.charCodeAt(i+2);
						string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
						i += 3;
					}
				}
				return string;
			},

			toByteArray: function(str) {
				var byteArray = [];
				for (var i = 0; i < str.length; i++)
					if (str.charCodeAt(i) <= 0x7F)
						byteArray.push(str.charCodeAt(i));
				else {
					var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
					for (var j = 0; j < h.length; j++)
						byteArray.push(parseInt(h[j], 16));
				}
				return byteArray;
			},

			parse: function(byteArray) {
				var str = '';
				for (var i = 0; i < byteArray.length; i++)
					str +=  byteArray[i] <= 0x7F?
					byteArray[i] === 0x25 ? '%25' : // %
					String.fromCharCode(byteArray[i]) :
				'%' + byteArray[i].toString(16).toUpperCase();
				return decodeURIComponent(str);
			}
		},

		get_html_translation_table: function (table, quote_style) {
			//modified from: http://phpjs.org/functions/get_html_translation_table/
			var entities = {},
				hash_map = {},
				decimal;
			var constMappingTable = {},
				constMappingQuoteStyle = {};
			var useTable = {},
				useQuoteStyle = {};

			// Translate arguments
			constMappingTable[0] = 'HTML_SPECIALCHARS';
			constMappingTable[1] = 'HTML_ENTITIES';
			constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
			constMappingQuoteStyle[2] = 'ENT_COMPAT';
			constMappingQuoteStyle[3] = 'ENT_QUOTES';

			useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
			useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

			if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
				throw new Error('Table: ' + useTable + ' not supported');
				// return false;
			}

			entities['38'] = '&amp;';
			if (useTable === 'HTML_ENTITIES') {
				entities['160'] = '&nbsp;';
				entities['161'] = '&iexcl;';
				entities['162'] = '&cent;';
				entities['163'] = '&pound;';
				entities['164'] = '&curren;';
				entities['165'] = '&yen;';
				entities['166'] = '&brvbar;';
				entities['167'] = '&sect;';
				entities['168'] = '&uml;';
				entities['169'] = '&copy;';
				entities['170'] = '&ordf;';
				entities['171'] = '&laquo;';
				entities['172'] = '&not;';
				entities['173'] = '&shy;';
				entities['174'] = '&reg;';
				entities['175'] = '&macr;';
				entities['176'] = '&deg;';
				entities['177'] = '&plusmn;';
				entities['178'] = '&sup2;';
				entities['179'] = '&sup3;';
				entities['180'] = '&acute;';
				entities['181'] = '&micro;';
				entities['182'] = '&para;';
				entities['183'] = '&middot;';
				entities['184'] = '&cedil;';
				entities['185'] = '&sup1;';
				entities['186'] = '&ordm;';
				entities['187'] = '&raquo;';
				entities['188'] = '&frac14;';
				entities['189'] = '&frac12;';
				entities['190'] = '&frac34;';
				entities['191'] = '&iquest;';
				entities['192'] = '&Agrave;';
				entities['193'] = '&Aacute;';
				entities['194'] = '&Acirc;';
				entities['195'] = '&Atilde;';
				entities['196'] = '&Auml;';
				entities['197'] = '&Aring;';
				entities['198'] = '&AElig;';
				entities['199'] = '&Ccedil;';
				entities['200'] = '&Egrave;';
				entities['201'] = '&Eacute;';
				entities['202'] = '&Ecirc;';
				entities['203'] = '&Euml;';
				entities['204'] = '&Igrave;';
				entities['205'] = '&Iacute;';
				entities['206'] = '&Icirc;';
				entities['207'] = '&Iuml;';
				entities['208'] = '&ETH;';
				entities['209'] = '&Ntilde;';
				entities['210'] = '&Ograve;';
				entities['211'] = '&Oacute;';
				entities['212'] = '&Ocirc;';
				entities['213'] = '&Otilde;';
				entities['214'] = '&Ouml;';
				entities['215'] = '&times;';
				entities['216'] = '&Oslash;';
				entities['217'] = '&Ugrave;';
				entities['218'] = '&Uacute;';
				entities['219'] = '&Ucirc;';
				entities['220'] = '&Uuml;';
				entities['221'] = '&Yacute;';
				entities['222'] = '&THORN;';
				entities['223'] = '&szlig;';
				entities['224'] = '&agrave;';
				entities['225'] = '&aacute;';
				entities['226'] = '&acirc;';
				entities['227'] = '&atilde;';
				entities['228'] = '&auml;';
				entities['229'] = '&aring;';
				entities['230'] = '&aelig;';
				entities['231'] = '&ccedil;';
				entities['232'] = '&egrave;';
				entities['233'] = '&eacute;';
				entities['234'] = '&ecirc;';
				entities['235'] = '&euml;';
				entities['236'] = '&igrave;';
				entities['237'] = '&iacute;';
				entities['238'] = '&icirc;';
				entities['239'] = '&iuml;';
				entities['240'] = '&eth;';
				entities['241'] = '&ntilde;';
				entities['242'] = '&ograve;';
				entities['243'] = '&oacute;';
				entities['244'] = '&ocirc;';
				entities['245'] = '&otilde;';
				entities['246'] = '&ouml;';
				entities['247'] = '&divide;';
				entities['248'] = '&oslash;';
				entities['249'] = '&ugrave;';
				entities['250'] = '&uacute;';
				entities['251'] = '&ucirc;';
				entities['252'] = '&uuml;';
				entities['253'] = '&yacute;';
				entities['254'] = '&thorn;';
				entities['255'] = '&yuml;';
			}

			if (useQuoteStyle !== 'ENT_NOQUOTES') {
				entities['34'] = '&quot;';
			}
			if (useQuoteStyle === 'ENT_QUOTES') {
				entities['39'] = '&#39;';
			}
			entities['60'] = '&lt;';
			entities['62'] = '&gt;';


			// ascii decimals to real symbols
			for (decimal in entities) {
				if (entities.hasOwnProperty(decimal)) {
					hash_map[String.fromCharCode(decimal)] = entities[decimal];
				}
			}

			return hash_map;
		},

		html_entity_decode: function ( string, quote_style ) {
			// modified from: http://phpjs.org/functions/html_entity_decode/
			var hash_map = {},
				symbol = '',
				tmp_str = '',
				entity = '';
				tmp_str = string.toString();

			if (false === (hash_map = helpers.get_html_translation_table('HTML_ENTITIES', quote_style))) {
			return false;
			}

			// fix &amp; problem
			// http://phpjs.org/functions/get_html_translation_table:416#comment_97660
			delete(hash_map['&']);
			hash_map['&'] = '&amp;';

			for (symbol in hash_map) {
				entity = hash_map[symbol];
				tmp_str = tmp_str.split(entity).join(symbol);
			}
			tmp_str = tmp_str.split('&#039;').join("'");

			return tmp_str;
		}

	};

	String.prototype.capitalize = helpers.capitalizePrototype;
	String.prototype.trim = helpers.trimPrototype;
	String.prototype.strip = helpers.trimPrototype;

	return helpers;
});
