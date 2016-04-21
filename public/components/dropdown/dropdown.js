$(function(){
  /* When the user clicks on the button,
  toggle between hiding and showing the dropdown content */
  var $dropDown = $('.dropbtn');
  $dropDown.on("click", function() {
    document.getElementById("myDropdown").classList.toggle("show");
  });

  window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {

      var dropdowns = document.getElementsByClassName("dropdown-content");
      var i;
      for (i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
        }
      }
    }
  }

  var $changeName = $('.changeName');
  $changeName.on("click", function() {
    changeName();
  });

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  function changeName(){
    var username = prompt("Change your username", localStorage.getItem('username'));
    var $usernameInput = $('.usernameInput'); // Input for username

    if (username != null) {
        $usernameInput.val(username);
        window.socket.emit('change username', window.socket.username);
        window.socket.emit('check username', cleanInput($usernameInput.val().trim()));
    }
  }
});
