/*global $*/

var myInput = document.getElementById("NewPassword");
var letter = document.getElementById("letter");
var capital = document.getElementById("capital");
var number = document.getElementById("number");
var symbol = document.getElementById("symbol");
var length = document.getElementById("length");

// When the user clicks on the password field, show the message box
myInput.onfocus = function() {
  document.getElementById("message").style.display = "block";
}

// When the user clicks outside of the password field, hide the message box
myInput.onblur = function() {
  document.getElementById("message").style.display = "none";
}

// When the user starts to type something inside the password field
myInput.onkeyup = function() {
  // Validate lowercase letters
  var lowerCaseLetters = /[a-z]/g;
  if(myInput.value.match(lowerCaseLetters)) { 
    letter.classList.remove("invalid");
    letter.classList.add("valid");
  } else {
    letter.classList.remove("valid");
    letter.classList.add("invalid");
}

  // Validate capital letters
  var upperCaseLetters = /[A-Z]/g;
  if(myInput.value.match(upperCaseLetters)) { 
    capital.classList.remove("invalid");
    capital.classList.add("valid");
  } else {
    capital.classList.remove("valid");
    capital.classList.add("invalid");
  }

  // Validate numbers
  var numbers = /[0-9]/g;
  if(myInput.value.match(numbers)) { 
    number.classList.remove("invalid");
    number.classList.add("valid");
  } else {
    number.classList.remove("valid");
    number.classList.add("invalid");
  }
  
    // Validate symbol
  var symbols = /[!@#\$%\^&\*]/g;
  if(myInput.value.match(symbols)) { 
    symbol.classList.remove("invalid");
    symbol.classList.add("valid");
  } else {
    symbol.classList.remove("valid");
    symbol.classList.add("invalid");
  }

  // Validate length
  if(myInput.value.length >= 8) {
    length.classList.remove("invalid");
    length.classList.add("valid");
  } else {
    length.classList.remove("valid");
    length.classList.add("invalid");
  }
}

function checkReq(password){
  if(!password.match('(?=.*[a-z])')) //lowercase
    return false;
   if(!password.match('(?=.*[A-Z])')) //uppercase
       return false;
   if(!password.match('(?=.*[0-9])'))  //number
       return false;
   if(!password.match('(?=.*[!@#\$%\^&\*])'))  //special char
       return false;
   if(!password.match('(?=.{8,})'))  //at least 8 chars
       return false;
       
  return true;

}

function checkPassword(){
   var password = $('input[type=password][name=password]').val();
    var firstName = $('input[type=password][name=fName]').val();
   var lastName = $('input[type=password][name=lName]').val();
   var DOB = $('input[type=password][name=DOB]').val();
      var email = $('input[type=password][name=email]').val();


  if (checkReq(password)){
    
    return true;

  }else return false;
   
   
}

// Example starter JavaScript for disabling form submissions if there are invalid fields
(function() {
    'use strict';
    window.addEventListener('load', function() {
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var forms = document.getElementsByClassName('needs-validation');
        // Loop over them and prevent submission
        var validation = Array.prototype.filter.call(forms, function(form) {
            form.addEventListener('submit', function(event) {
                if (form.checkValidity() === false) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    }, false);
})();