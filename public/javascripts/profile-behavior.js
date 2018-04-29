/*global $*/
$('#subAccount').click(function() {
    $('.subAccount-modal').show();
});

$('#register').click(function() {
    $('.register-modal').show();
});

$('#login').click(function() {
    $('.login-modal').show();
});

$('.close-modal').click(function() {
    if ($(".register-modal").is(":visible")) {
        $(".register-modal").toggle();
    }

    if ($(".subAccount-modal").is(":visible")) {
        $(".subAccount-modal").toggle();
    }

    if ($(".login-modal").is(":visible")) {
        $(".login-modal").toggle();
    }

});

$("#profile-image").click(function() {
    $("#uploadPic").submit();
});

$('#newOROld-yes').click(function() {
    $("#existent-user").toggle();
    $("#new-user").hide();

});

$('#newOROld-no').click(function() {
    $("#new-user").toggle();
    $("#existent-user").hide();

});
$('#submit').click(function() {
    $('#add-subuser-form').submit();
});



function calculateAge() {
    var age = $('#user-DOB').val();
    var year = age.substring(0, 4);
    var currentYear = new Date().getFullYear();
    if (currentYear - year < 13) {
        $('#new-user-secondary-13plus').hide();
        $('#new-user-secondary-12under').show();
        $('#subaccount-modal-footer').show();
    }
    else {
        $('#new-user-secondary-12under').hide();
        $('#subaccount-modal-footer').hide();
        $('#new-user-secondary-13plus').show();
    }
}

$('.task-cards').hover(function() {
    var actions = $(this).children();
    // console.log(actions[0]);
    $(actions[0]).fadeToggle("slow", function() {
        // Animation complete
    });

});

$('#new-user-form input').on('change', function() {
    var response = $('input[name=ageCheck]:checked', '#new-user-form').val();
    if (response == 'no') {
        $('#new-user-secondary-13plus').hide();
        $('#new-user-secondary-12under').show();
        $('#subaccount-modal-footer').show();
    }
    else {
        $('#new-user-secondary-12under').hide();
        $('#subaccount-modal-footer').hide();
        $('#new-user-secondary-13plus').show();
    }
});



$('#notification-tray').on('show.bs.dropdown', function() {
    // do something…
    $("#notifiaction-icon").addClass('flip');
});

$('#notification-tray').on('hidden.bs.dropdown', function() {
    // do something…
    $("#notifiaction-icon").removeClass('flip');
})

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

function lookupUser() {
    var email = $("input[type=email][name=existentUser]").val();
    $.get("/account/lookup/" + email, function(data, status) {

        if (data.length === 0) {
            $("#emailHelp").text("No User Found!");

        }
        else {
            var profileID = window.location.pathname.split("/")[2];
            $.post("/profile/" + profileID + "/subaccounts/linkaccounts", { existentUser: email }, function(data, status) {
                window.location.href = data;
            });

        }
    });
}

function unlockEmailer() {
    var email = $("input[type=email][name=existentUser]").val();
    $.get("/account/lookup/" + email, function(data, status) {

        if (data.length > 0) {

            $.post("/account/" + data[0]._id + "/helpUnlock", function(data, status) {
                window.location.href = data;
            });

        }
    });
}

function passwordRecover() {
    var email = $("input[type=email][name=existentUser]").val();
    $.get("/account/lookup/" + email, function(data, status) {

        if (data.length > 0) {

            $.post("/account/" + data[0]._id + "/recover", function(data, status) {
                window.location.href = data;
            });

        }
    });
}

function checkMatch() {
    var password1 = $("input[type=password][name=NewPassword1]").val();
    var password2 = $("input[type=password][name=NewPassword2]").val();

    if (password1.localeCompare(password2) != 0) {
        $("#error").text("Passwords Do Not Match!");
    }
    else {
        var userID = window.location.pathname.split("/")[2];
        $.post('/account/' + userID + '/recover?_method=PUT', { newPassword: password1 }, function(data, status) {
            window.location.href = data;

        });
    }
}

function inviteUser() {
    var email = $("input[type=email][name=inviteEmail]").val();
    $.get("/account/lookup/" + email, function(data, status) {

        if (data.length >= 1) {
            $("#inviteEmailHelp").text("This user is already registered");

        }
        else {
            var profileID = window.location.pathname.split("/")[2];
            $.post("/account/invite", { inviteEmail: email, sponsor: profileID }, function(data, status) {
                window.location.href = data;
            });

        }
    });
}

$(function () {
  $('[data-toggle="tooltip"]').tooltip({
      delay: { "show": 500, "hide": 00 }
  })
})