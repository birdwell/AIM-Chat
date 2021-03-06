$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  const $sendButton = $('.sendButton');
  const $exitButton =$('.exitButton');

  const $loginPage = $('.login.page'); // The login page
  const $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username = localStorage.getItem('username') || null;
  var room = '';
  var groups = localStorage.getItem('groups');
  var newgroups = []
  var groupStart = localStorage.getItem('groupStart');
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  // Sounds
  const buddyIn = new Audio("./assets/sounds/BuddyIn.mp3");
  const buddyOut = new Audio("./assets/sounds/BuddyOut.mp3");
  const imReceived = new Audio("./assets/sounds/im.wav");

  // Group
  const $groupUl = $('.group-tabs');

  window.socket = io.connect('http://localhost:3000');

  if(username){

    $currentInput = $inputMessage.focus();
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');

    socket.emit('add user', username);
  }

  if (groups) {
    var newGroups = JSON.parse(groups);
    groups = newGroups;
    for (var i = 0; i < groups.length; i++) {
      addGroupLi(groups[i]);
    }
  }

  if (groupStart) {
    activeGroup(groupStart);
  }

  function addParticipantsMessage (data) {
    // var message = '';
    // if (data.numUsers === 1) {
    //   message += "1 participant";
    // } else {
    //   message += data.numUsers + " participants";
    // }
    // log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      localStorage.setItem('username',username);

      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val(),
    // Prevent markup from being injected into the message
    message = cleanInput(message);

    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      // addChatMessage({
      //   username: username,
      //   message: message
      // });

      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    if(!username) return;
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        // setUsername();
        socket.emit('check username', cleanInput($usernameInput.val().trim()));
      }
    }
  });


  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  $sendButton.on("click", function(){
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    }
  });

  $exitButton.on("click", function(){
    window.close();
  });

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (loginInfo) {
    connected = true;
    addGroupLi(loginInfo.room);
    activeGroup(loginInfo.room);
    addParticipantsMessage(loginInfo.numUsers);
  });

  socket.on('checked username', function (isNameAvailable) {
    if(isNameAvailable){
      setUsername();
    } else{
      alert("Username already exists. Choose another name.");
    }
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (newMessage) {
    if(username != newMessage.username){
      imReceived.play();
    }
    addChatMessage(newMessage);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    buddyIn.play();
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    buddyOut.play();
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });


  /* Group Logic */

  socket.on('update room', function(room){
    addGroupLi(room);
    activeGroup(room);
  });

  function addGroupLi(name) {
  	if (newgroups.indexOf(name) == -1 && name != "main")
 	   newgroups.push(name);
    localStorage.setItem('groups',JSON.stringify(newgroups));
    $groupUl.append('<li class="nav-item"><a class="nav-link" groupName= "' + name + '" >' + name + '</a></li>')
  }

  function activeGroup(name) {
    localStorage.setItem('groupStart', name);
    var group = $('[groupname="'+ name + '"]');
    var activeGroup = $('.nav-link.active');

    $messages.empty();

    group.addClass('active');
    if (activeGroup) activeGroup.removeClass('active');
  }

  function onGroupClick(e){
    const target = $(e.target);
    if(target.is('.group-tabs, .active')) {
      return;
    } else if(target.is('.addGroup')){
      addGroup();
    } else if(target.is('.nav-link')) {
      const group = target.attr('groupname');
      socket.emit('switch room', group);
      activeGroup(group);
    }
  }

  function addGroup(){
    var newGroup = prompt("Join Group");
    socket.emit('switch room', newGroup);
    addGroupLi(newGroup);
    activeGroup(newGroup);
  }

  $groupUl.on('click', onGroupClick);
});
