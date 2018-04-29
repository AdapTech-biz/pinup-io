var validator = require('validator');

var sanitizer = function (input){
    
    var escapedInput = validator.escape(input);
   var trimmedInput = validator.trim(escapedInput);
   
   return trimmedInput;
};


module.exports = sanitizer;