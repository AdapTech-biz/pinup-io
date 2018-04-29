var validator = require('validator');

var passwordChecker = function (input){
    if(!validator.isLength(input, {min: 8, max: 30}))
        return false;
     if(!input.match('(?=.*[a-z])')) //lowercase
    return false;
   if(!input.match('(?=.*[A-Z])')) //uppercase
       return false;
   if(!input.match('(?=.*[0-9])'))  //number
       return false;
   if(!input.match('(?=.*[!@#\$%\^&\*])'))  //special char
       return false;
   if(!input.match('(?=.{8,})'))  //at least 8 chars
       return false;
       
  return true;

        
};


module.exports = passwordChecker;