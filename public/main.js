$(function() {
    const FADE_TIME = 150; // ms
    const TYPING_TIMER_LENGTH = 400; // ms
    const COLORS = [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
  
    // Initialize variables
    const $window = $(window);
    const $usernameInput = $('.usernameInput'); // Input for username
    const $messages = $('.messages');           // Messages area
    const $inputMessage = $('.inputMessage');   // Input message input box
  
    const $loginPage = $('.login.page');        // The login page
    const $chatPage = $('.chat.page');          // The chatroom page
  
    const socket = io();
  
    // Prompt for setting a username
    const urlParams = new URLSearchParams(window.location.search);
    let username = urlParams.get('username');
    let groupName = urlParams.get('groupName') ?  urlParams.get('password') : ""
    let password = groupName != "" ? urlParams.get('password') : ""
    let connected = false;
    let typing = false;
    let lastTypingTime;
    let $currentInput = $usernameInput.focus();

    if(groupName != ""){
        if(password==null){
          password = prompt("enter password")
        }
        socket.emit('join-or-create', {username, groupName, password});
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();
    }
    const addParticipantsMessage = (data) => {
      let message = '';
      if (data.numUsers === 1) {
        message += `there's 1 participant`;
      } else {
        message += `there are ${data.numUsers} participants`;
      }
      log(message);
    }
  
    // Sets the client's username
    const setUsername = () => {
      groupName = cleanInput($usernameInput.val().trim());
  
      
      if (groupName) {
        
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();
        password = prompt("Enter password")
        // Tell the server your username
        socket.emit('join-or-create', {username, groupName, password});
        connected = true;
      }
    }
  
    // Sends a chat message
    const sendMessage = () => {
      let message = $inputMessage.val();
      // Prevent markup from being injected into the message
      message = cleanInput(message);
      // if there is a non-empty message and a socket connection
      if (message) {
        $inputMessage.val('');
        addChatMessage({ username, message });
        // tell server to execute 'new message' and send along one parameter
        socket.emit('new message', message);
      }
    }
  
    // Log a message
    const log = (message, options) => {
      const $el = $('<li>').addClass('log').text(message);
      addMessageElement($el, options);
    }
  
    // Adds the visual chat message to the message list
    const addChatMessage = (data, options) => {
      alert(data.username)
      // Don't fade the message in if there is an 'X was typing'
      const $typingMessages = getTypingMessages(data);
      if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
      }
  
      const $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username));
      const $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);
  
      const typingClass = data.typing ? 'typing' : '';
      const $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
  
      addMessageElement($messageDiv, options);
    }
  

  
    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
      getTypingMessages(data).fadeOut(function () {
        $(this).remove();
      });
    }
  
    const addMessageElement = (el, options) => {
      const $el = $(el);
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
    const cleanInput = (input) => {
      return $('<div/>').text(input).html();
    }

  
    // Gets the 'X is typing' messages of a user
    const getTypingMessages = (data) => {
      return $('.typing.message').filter(function (i) {
        return $(this).data('username') === data.username;
      });
    }
  
    // Gets the color of a username through our hash function
    const getUsernameColor = (username) => {
      // Compute hash code
      let hash = 7;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
      }
      // Calculate color
      const index = Math.abs(hash % COLORS.length);
      return COLORS[index];
    }
  
    // Keyboard events
  
    $window.keydown(event => {
      // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
      }
      // When the client hits ENTER on their keyboard
      if (event.which === 13) {
        if (groupName) {
          sendMessage();
          socket.emit('stop typing');
          typing = false;
        } else {
          if(!username){
            alert("please provide username in query string")
            window.location.reload()
          }
          setUsername();
        }
      }
    });
  

    $loginPage.click(() => {
      $currentInput.focus();
    });
  
    // Focus input when clicking on the message input's border
    $inputMessage.click(() => {
      $inputMessage.focus();
    });
  
   
    socket.on('new message', (data) => {
      addChatMessage(data);
    });
  
    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', (data) => {
      log(`${data.username} joined`);
      addParticipantsMessage(data);
    });
  
    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', (data) => {
      log(`${data.username} left`);
      addParticipantsMessage(data);
      removeChatTyping(data);
    });
    
    socket.on(`joined-to-group-success ${username}`,(data)=>{
      log(`Group Invite Link - http://localhost:3000/?groupName=${groupName}&password=${password}`)
      log("Joined to existing group ")
      // alert(data)
    })

    socket.on(`invalid-password ${username}`, (data)=>{
      alert("Invalid group password")
      window.location.reload();
      
    })



    socket.on(`created-new-group ${username}`, (data)=>{
      log("Created new group")
      log("Group Name is "+ groupName)
      log(`Group Invite Link - http://localhost:3000/?groupName=${groupName}&password=${password}`)

      
    })
  
    socket.on('disconnect', () => {
      log('you have been disconnected');
    });
  
    socket.on('reconnect', () => {
      log('you have been reconnected');
      if (username) {
        socket.emit('add user', username);
      }
    });
  
    socket.on('reconnect_error', () => {
      log('attempt to reconnect has failed');
    });
  
  });