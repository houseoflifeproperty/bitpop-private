//first declare some global encode/decode functions,
//then pull them into what the module returns.
//the module is id the 'define' call after the global declarations 

(function ( global ) {

    global.utf8 = {};
    // simpler version
    global.utf8.toByteArray = function(str) {
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
    };

    global.utf8.parse = function(byteArray) {
        var str = '';
        for (var i = 0; i < byteArray.length; i++)
            str +=  byteArray[i] <= 0x7F?
            byteArray[i] === 0x25 ? "%25" : // %
            String.fromCharCode(byteArray[i]) :
        "%" + byteArray[i].toString(16).toUpperCase();
        return decodeURIComponent(str);
    };

    global.reversedict = function(d) {
        var rd = {}
        for (var key in d) {
            rd[d[key]] = key;
        }
        return rd;
    };

    //http://www.webtoolkit.info/javascript-utf8.html
    var Utf8 = {
        // public method for url encoding
        encode : function (string) {
            string = string.replace(/\r\n/g,"\n");
            var utftext = "";
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
        decode : function (utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;
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
        }
    };

    function python_int(s) {
        var n = parseInt(s,10);
        if (n === NaN) { throw Error('ValueError'); }
        return n;
    }

    function decode_int(x,f) {
        f++;
        
        var newf = x.indexOf('e',f);;
        var n = python_int(x.slice(f,newf));

        if (x[f] == '-') {
            if (x[f+1] == '0') {
                throw Error('ValueError');
            }
        } else if (x[f] == '0' && newf != f+1) {
            throw Error('ValueError');
        }

        return [n, newf+1];
    }

    function decode_string(x,f, opts) {
        var colon = x.indexOf(':',f);
        var n = python_int(x.slice(f,colon));
        if (x[f] == '0' && colon != f+1) {
            throw Error('ValueError');
        }
        colon++;
        var raw = x.slice(colon,colon+n);
        if (opts && opts.utf8) {
            var decoded = Utf8.decode(raw);
        } else {
            var decoded = raw;
        }
        var toret = [decoded, colon+n];
        return toret;
    }

    function decode_list(x,f, opts) {
        var data;
        var v;

        var r = [];
        f++;
        while (x[f] != 'e') {
            data = decode_func[x[f]](x,f, opts);
            v = data[0];
            f = data[1];
            r.push(v);
        }
        return [r, f+1];
    }

    function decode_dict(x, f, opts) {
        var data;
        var data2;
        var k;

        var r = {};
        f++;
        while (x[f] != 'e') {
            data = decode_string(x, f, opts);
            k = data[0];
            f = data[1];

            data2 = decode_func[ x[f] ](x,f, opts)
            r[k] = data2[0];
            f = data2[1];
        }
        return [r, f+1];
    }

    var decode_func = {};
    decode_func['l'] = decode_list;
    decode_func['d'] = decode_dict;
    decode_func['i'] = decode_int;
    for (var i=0; i<10; i++) {
        decode_func[i.toString()] = decode_string;
    }

    global.bdecode = function(x, opts) {
        var data = decode_func[x[0]](x, 0, opts);
        var r = data[0];
        var l = data[1];
        return r;
    }

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function gettype(val) {
        if (typeof val == 'number' && val.toString() == parseInt(val.toString(),10)) {
            return 'integer';
        } else if (isArray(val)) {
            return 'array';
        } else {
            return typeof val;
        }
    }

    function encode_int(x, r) {
        r.push('i'.charCodeAt(0));
        var s = x.toString();
        for (var i=0; i<s.length; i++) {
            r.push( s[i].charCodeAt(0) ); 
        }
        r.push('e'.charCodeAt(0));
    }
    function encode_string(x, r, stack, cb, opts) {
        if (opts && opts.utf8) {
            var bytes = utf8.toByteArray(x);
        } else {
            var bytes = [];
            for (var i=0; i<x.length; i++) {
                bytes.push(x.charCodeAt(i));
            }
        }
        var s = bytes.length.toString();
        for (var i=0; i<s.length; i++) {
            r.push( s[i].charCodeAt(0) );
        }
        r.push(':'.charCodeAt(0))
        for (var i=0; i<bytes.length; i++) {
            r.push(bytes[i]);
        }
    }
    function encode_array(x, r, stack, cb, opts) {
        r.push( 'l'.charCodeAt(0) );
        for (var i=0; i<x.length; i++) {
            encode_func[gettype(x[i])](x[i], r, stack, cb, opts);
        }
        r.push('e'.charCodeAt(0));
    }
    function encode_object(x ,r, stack, stack_callback, opts) {
        r.push('d'.charCodeAt(0));
        var keys = [];
        for (var key in x) {
            keys.push(key);
        }
        keys.sort()
        for (var j=0; j<keys.length; j++) {
            var key = keys[j];

            var bytes = utf8.toByteArray(key);

            var s = bytes.length.toString();

            for (var i=0; i<s.length; i++) {
                r.push( s[i].charCodeAt(0) );
            }
            r.push(':'.charCodeAt(0));
            for (var i=0; i<bytes.length; i++) {
                r.push( bytes[i] );
            }
            stack.push(key);
            if (stack_callback) { stack_callback(stack, r); }
            encode_func[gettype(x[key])]( x[key], r, stack, stack_callback, opts );
            stack.pop();
        }
        r.push('e'.charCodeAt(0));
    }

    var encode_func = {};
    encode_func['integer'] = encode_int;
    encode_func['string'] = encode_string;
    encode_func['array'] = encode_array;
    encode_func['object'] = encode_object;

    global.bencode = function(x, stack_callback, opts) {
        var r = [];
        var stack = [];
        encode_func[gettype(x)](x ,r, stack, stack_callback, opts);
        return r;
    }

/*
    var r = bdecode( utf8.parse(bencode( { 'hello':23} )) );
    assert( r['hello'] = 23 );
*/

    global.ab2str = function(buf) {
        assert(false) // this function sucks (chromium os dont work)
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    global.ab2arr = function(buf) {
        var arr = [];
        for (var i=0; i<buf.length; i++) {
            arr.push(buf[i]);
        }
        return arr;
    }

    global.arr2str = function(buf, startindex) {
        //return String.fromCharCode.apply(null, buf); // returns maximum stack exceeded
        startindex = (startindex === undefined)?0:startindex;
        var s = ""
        var l = buf.length;
        for (var i=startindex; i<l; i++) {
            s += String.fromCharCode(buf[i]);
        }
        return s;
        // build array and use join any faster?
    }

    function str2ab(str) {
        assert(false,'this function suck');
        var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
        var bufView = new Uint16Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    function hexpad(s) {
        if (s.length == 1) {
            return '0' + s;
        } else {
            return s;
        }
    }

    global.ab2hex = function(ab) {
        var accum = [];
        var len = ab.byteLength | ab.length;
        for (var i=0; i<len; i++) {
            
            accum.push(hexpad(ab[i].toString(16)));
        }
        return accum.join('');
    }

    global.str2arr = function(str) {
        var arr = [];
        for (var i=0; i<str.length; i++) {
            arr.push(str.charCodeAt(i));
        }
        return arr;
    }

    global.intersect = function(i1, i2) {
        if (i1[1] < i2[0] || i2[1] < i1[0]) {
            return null;
        } else {
            return [Math.max(i1[0],i2[0]), Math.min(i1[1],i2[1])];
        }
    }



	define(['require', 
			'helpers/string'], function(require) {

		var string = require('helpers/string');

		var torrent = {
                    
            getFileSize: function( size, precision ){
                if( typeof precision !== 'number' )
                    precision = 1;
                var sz = ['b', 'kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb'];
                var szmax = sz.length-1;

                // Force units to be at least kB
                var unit = 1;
                size /= 1024;

                while ((size >= 1000) && (unit < szmax)) {
                    size /= 1024;
                    unit++;
                }
                //return (size.toFixed( precision ) + " " + sz[unit]);
                return (size.toFixed( precision ) + sz[unit]);
            },

			parseMagnetLink: function( href ){
				href = string.html_entity_decode( href ).replace(
					'magnet:?', '').split('&');

				var parsed = {
					trackers: []
				};

				href.forEach(function(el){
					var kv = el.split('='),
						tracked = false;

					if( kv[0] === 'xt' ){
						//this is the hash
						parsed.hash = kv[1].replace('urn:btih:', '').toUpperCase();
					} else if ( kv[0] === 'tr' ){
						//this is the tracker
						parsed.tracker = decodeURIComponent( kv[1] );
						parsed.trackers.push( parsed.tracker );
					}
				});

				return parsed;
			},

			//this now uses our mathematician's availability model.  thanks yo.
			getScrapedAvailability: function( scraped ){
				if ( scraped.complete === 0 || scraped.downloaded === 0 ) return 0;

				var d = scraped.complete + scraped.incomplete;
				if( d === 0 ) d = 1;

				var pLeecher = scraped.incomplete / d;
				var availability = 0.077 * scraped.complete + 0.0274 * scraped.downloaded + 6.417 * pLeecher;

				return availability * 65535;
			},

			calculateHealth: function( availability ){
				var num_bars = 0;

				if (availability >= (1<<16)) num_bars++;
				if (availability >= (2<<16)) num_bars++;
				if (availability >= (4<<16)) num_bars++;
				if (availability >= (8<<16)) num_bars++;

				return num_bars;
			},

            //the bencode/bdecode and binary string 
            //parsing functions declared globally above
            utf8:           global.utf8,
            reversedict:    global.reversedict,
            bdecode:        global.bdecode,
            bencode:        global.bencode,
            ab2str:         global.ab2str,
            ab2arr:         global.ab2arr,
            arr2str:        global.arr2str,
            ab2hex:         global.ab2hex,
            str2arr:        global.str2arr,
            intersect:      global.intersect
		};

		return torrent;
	});

})( this );
