window.onload = init;

var $editable
  , tokens = []
  , token_colors = {}
  , refresh_timer
    // Characters that separate tokens
  , rx_splitters = /[\s\+\-=\*\(\)\{\}\[\]\.;\|,\!]/g
  , rx_splitters_string = "([\\s\\+\\-=\\*\\(\\)\\{\\}\\[\\]\\.;\\|,\\!])"
    // Match comments
  , rx_comments = /(\/\/(.*))\r?\n|\r/g
    // Match "strings", 'strings', and /regexes/
  , rx_strings = /("(.*?)")|('(.*?)')|(\/([^\s]+?)[^\\]\/[a-z]*)/g
    // Match #hex colors
  , rx_colors = /(#[0-9a-fA-F]{6})/g
    // Match numbers
  , rx_numbers = /([\s\+\-=\*\(\)\{\}\[\]\.;\|,\!])([0-9]+)([\s\+\-=\*\(\)\{\}\[\]\.;\|,\!])/g
    // Match valid characters: letters, numbers, _underscore, $
    // but don't let first character be a number
  , rx_allowed =  /(^[a-zA-Z_\$][a-zA-Z0-9_\$]*)/
  ;


// ==============================

function init() {

  // Get selectors
  $editable = document.querySelector("#output");

  init_ui();
  init_theme();
  init_keywords();

  // Load script into textarea
  $.get("example.txt", function(data){
    $editable.innerHTML = data;
    $editable.focus();
    update();
  });
}

// ==============================

function update() {

  clearTimeout(refresh_timer);
  refresh_timer = setTimeout(function(){

    // Insert cursor placeholder
    insertTextAtCursor("@" + "@");

    // Broken in Firefox!
    // will use textContent instead of innerText, which doesn't
    // correctly preserve the whitespace
    var text = $editable.innerText || $editable.textContent;

    // Find cursor placeholder
    var pos = text.indexOf("@" + "@");
    text = text.replace("@" + "@", "");

    // Process text
    $editable.innerHTML = process(text);

    // Restore cursor position
    setSelectionRange($editable, pos, pos);

  }, 60);
}

// ==============================


function process(string) {
  var html = string;

  assign_colors(string);

  var rx_tokens = make_regex(tokens, "g");


  html = htmlify(html);

  html = html
          .replace(rx_strings, replace_rx_strings)
          .replace(rx_tokens, replace_variables)
          .replace(rx_comments, replace_rx_comments)
          //.replace(rx_numbers, replace_rx_numbers)
          .replace(rx_colors, replace_rx_colors)
          ;

  return html + "\n";
}

// ==============================


function assign_colors(string) {

  var split = string.split(rx_splitters);

  token_colors = get_uniques(split);
  tokens = Object.keys(token_colors);

}


// ==============================

function get_uniques(arr) {
  var uniques = {};
  for (var i = arr.length - 1; i >= 0; i--) {
    if ( arr[i].length > 0
          && rx_allowed.test(arr[i])
          && !keywords.test((" " + arr[i] + " "))
    ) {
      uniques[ arr[i] ] = true;
    }
  };
  return uniques;
}

// ==============================

// Make a regex that finds any word in the array between splitter characters

function make_regex(arr, flags) {
  var str = "(" + arr.join("|").replace(/\$/g,"\\$") + ")";
  str = rx_splitters_string + str + "(?=" + rx_splitters_string + ")";
  var regex = new RegExp(str, flags);
  return regex;
}


// ==============================


function replace_rx_comments(match, p1, p2, p3, offset, string) {
  return "<i class='cmnt'>" + match + "</i>";
}

function replace_rx_strings(match, p1, p2, p3, offset, string) {
  var cls;
  if (match.charAt(0) == "/") cls = "reg";
  else cls = "str";

  return "<i class='" + cls + "'>" + match + "</i>";
}

function replace_rx_colors(match, p1, p2, p3, offset, string) {
  var clr =  "<i class='clr' style='background: ";
      clr += match + "; box-shadow: 0 0 0 2px " + match + "; ' >";
      clr += match + "</i>";
  return clr;
}

function replace_rx_regexes(match, p1, p2, p3, offset, string) {
  return "<i class='reg'>" + match + "</i>";
}

function replace_rx_numbers(match, p1, p2, p3, offset, string) {
  return p1 + "<i class='num'>" + p2 + "</i>" + p3;
}

function replace_tokens(match, p1, p2, p3, offset, string) {
  var colorclass = token_colors[p2];
  return p1 + "<i class='" + colorclass + "'>" + p2 + "</i>";
}

function replace_variables (match, p1, p2, p3, offset, string) {
  return p1 + "<i style='font-weight:600;color:" + variable_color(p2) + "'>" + p2 + "</i>";
}

// ==============================

function init_theme() {
  var node = document.querySelector(".colortheme");
  var colors = node.innerHTML.trim().split("\n");
  
  var css = "";
  for (var i = 0; i < colors.length; i++) {
    css += ".var" + i + "{color:" + colors[i] + ";} ";
  }
  add_style_sheet(css);
}

// ==============================

function init_keywords() {
  var node = document.querySelector(".keywords");
  var kw_list = node.innerHTML.trim().split("\n");
  keywords = make_regex(kw_list,"");
}

// ==============================

// User Interface

function init_ui() {
  // Update on key up
  // throttled this to only a few times a second, replacing html is HEAVY
  $editable.onkeyup = update;
}

// ==============================

// DOM Utilities


function add_style_sheet (css) {
  var head, styleElement;
  head = document.getElementsByTagName('head')[0];
  styleElement = document.createElement('style');
  styleElement.setAttribute('type', 'text/css');
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    styleElement.appendChild(document.createTextNode(css));
  }
  head.appendChild(styleElement);
  return styleElement;
}


// ==============================

// Utilities

function contains(str, substr) {
  return str.indexOf(substr) !== -1;
}


function htmlify(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function unquote(str) {
  return String(str).replace(/"/g, '&quot;');
}


// ==============================

// Text selection management

function insertTextAtCursor(text) { 
    var sel, range, html; 
    sel = window.getSelection();
    range = sel.getRangeAt(0); 
    range.deleteContents(); 
    var textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);        
}

function getTextNodesIn(node) {
    var textNodes = [];
    if (node.nodeType == 3) {
        textNodes.push(node);
    } else {
        var children = node.childNodes;
        for (var i = 0, len = children.length; i < len; ++i) {
            textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

function setSelectionRange(el, start, end) {
    if (document.createRange && window.getSelection) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var textNodes = getTextNodesIn(el);
        var foundStart = false;
        var charCount = 0, endCharCount;

        for (var i = 0, textNode; textNode = textNodes[i++]; ) {
            endCharCount = charCount + textNode.length;
            if (!foundStart && start >= charCount && (start < endCharCount || (start == endCharCount && i < textNodes.length))) {
                range.setStart(textNode, start - charCount);
                foundStart = true;
            }
            if (foundStart && end <= endCharCount) {
                range.setEnd(textNode, end - charCount);
                break;
            }
            charCount = endCharCount;
        }

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (document.selection && document.body.createTextRange) {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(true);
        textRange.moveEnd("character", end);
        textRange.moveStart("character", start);
        textRange.select();
    }
}

// From: http://javascript.about.com/od/problemsolving/a/modulobug.htm
Number.prototype.mod = function(n) {
  return ((this%n)+n)%n;
}

function variable_color(name) {
  var contrast = 0.9;
  // Make this >1 for COLOR XPLOSION

  var hue = 0;
  var sat = 30;
  var lightness = 50;
  var alpha = 1;

  var letters = name.toLowerCase().split("");
  var len = letters.length;

  for (var j = 0; j < len; j++) {
    // We're running through the characters of the variable name, and
    // adjusting the hue based on the position in the alphabet of that
    // letter. 

    // The fraction of the color range we're adjusting over. 
    // so if this is '0.5', the color can vary over 180.
    var precision = Math.pow(contrast,j);

    // Fraction of the position of this letter in the alphabet, so 
    // 'a' is 0 and 'z' is 1.
    var letter_position = (name.charCodeAt(j) - "a".charCodeAt(0)) / 26;

    // `(letter_position - 0.5)` so we can move backwards in the color
    // wheel as well
    // `mod(360)` to make sure we're staying inside the wheel.
    hue = (hue + 360*precision * (letter_position - 0.5)).mod(360);
  }
  
  return "hsla(" + Math.floor(hue) + ", " + sat + "%, " + lightness + "%, " + alpha + ")";
}
