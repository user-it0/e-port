document.addEventListener("DOMContentLoaded", function() {
    // Socket.IO 初期化
    const socket = io();
  
    // グローバル変数
    let currentUser = null;
    let currentChatFriend = null;
  
    // DOM 要素取得
    const pageAuth = document.getElementById("page-auth");
    const loginForm = document.getElementById("form-login");
    const registrationForm = document.getElementById("form-register");
    const loginDiv = document.getElementById("login-form");
    const registrationDiv = document.getElementById("registration-form");
    const toRegistrationBtn = document.getElementById("to-registration");
    const toLoginBtn = document.getElementById("to-login");
  
    const pageHome = document.getElementById("page-home");
    const displayUsername = document.getElementById("display-username");
    const userSearchInput = document.getElementById("user-search");
    const searchResultUl = document.getElementById("search-result");
    const friendRequestsUl = document.getElementById("friend-requests");
    const contactListUl = document.getElementById("contact-list");
  
    const pageChat = document.getElementById("page-chat");
    const backToHomeBtn = document.getElementById("back-to-home");
    const messageHistory = document.getElementById("message-history");
    const chatInput = document.getElementById("chat-input");
    const sendMessageBtn = document.getElementById("send-message");
  
    // フォーム切替
    toRegistrationBtn.addEventListener("click", function() {
      loginDiv.style.display = "none";
      registrationDiv.style.display = "block";
    });
    toLoginBtn.addEventListener("click", function() {
      registrationDiv.style.display = "none";
      loginDiv.style.display = "block";
    });
  
    // 新規ユーザー登録
    registrationForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const username = document.getElementById("register-username").value;
      const password = document.getElementById("register-password").value;
      try {
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if(data.error) {
          alert(data.error);
        } else {
          currentUser = data.user;
          alert("登録成功: " + currentUser.username);
          showHomePage();
        }
      } catch(err) {
        console.error(err);
      }
    });
  
    // ログイン処理
    loginForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if(data.error) {
          alert(data.error);
        } else {
          currentUser = data.user;
          alert("ログイン成功: " + currentUser.username);
          showHomePage();
        }
      } catch(err) {
        console.error(err);
      }
    });
  
    // ホーム画面表示
    function showHomePage() {
      displayUsername.value = currentUser.username;
      pageAuth.style.display = "none";
      pageHome.style.display = "block";
      pageChat.style.display = "none";
      socket.emit('join', currentUser.username);
      loadApprovedFriends();
      loadFriendRequests();
    }
  
    // 承認済み友達一覧をサーバーから取得
    async function loadApprovedFriends() {
      try {
        const res = await fetch(`/approvedFriends?username=${currentUser.username}`);
        const data = await res.json();
        renderApprovedFriends(data.approvedFriends);
      } catch(err) {
        console.error(err);
      }
    }
  
    // 承認済み友達リストをレンダリング
    function renderApprovedFriends(friends) {
      contactListUl.innerHTML = "";
      friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        li.className = "contact-item";
        li.addEventListener("click", function() {
           openChat(friend);
        });
        contactListUl.appendChild(li);
      });
    }
  
    // 友達リクエスト一覧をサーバーから取得
    async function loadFriendRequests() {
      try {
        const res = await fetch(`/friendRequests?username=${currentUser.username}`);
        const data = await res.json();
        renderFriendRequests(data.friendRequests);
      } catch(err) {
        console.error(err);
      }
    }
  
    // 友達リクエストリストをレンダリング（各リクエストに承認／拒否ボタン付き）
    function renderFriendRequests(requests) {
      friendRequestsUl.innerHTML = "";
      requests.forEach(requester => {
        const li = document.createElement("li");
        li.textContent = requester;
        li.className = "contact-item";
        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "承認";
        acceptBtn.addEventListener("click", function() {
          respondFriendRequest(requester, 'accept');
        });
        const declineBtn = document.createElement("button");
        declineBtn.textContent = "拒否";
        declineBtn.addEventListener("click", function() {
          respondFriendRequest(requester, 'decline');
        });
        li.appendChild(acceptBtn);
        li.appendChild(declineBtn);
        friendRequestsUl.appendChild(li);
      });
    }
  
    // 友達リクエストに対する応答（承認／拒否）
    async function respondFriendRequest(from, response) {
      try {
        const res = await fetch('/respondFriendRequest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser.username, from, response })
        });
        const data = await res.json();
        alert(data.message);
        loadFriendRequests();
        loadApprovedFriends();
      } catch(err) {
        console.error(err);
      }
    }
  
    // ユーザー検索機能：サーバーから取得した一覧から絞り込み
    userSearchInput.addEventListener("input", async function() {
      const query = this.value.trim().toLowerCase();
      searchResultUl.innerHTML = "";
      if(query === "") return;
      try {
        const res = await fetch(`/users?username=${currentUser.username}`);
        const data = await res.json();
        const results = data.users.filter(u => u.toLowerCase().includes(query));
        results.forEach(user => {
          const li = document.createElement("li");
          li.textContent = user;
          li.className = "contact-item";
          li.addEventListener("click", async function() {
            // 友達追加リクエスト送信
            try {
              const res = await fetch('/sendFriendRequest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: currentUser.username, to: user })
              });
              const resultData = await res.json();
              alert(resultData.message || resultData.error);
            } catch(err) {
              console.error(err);
            }
          });
          searchResultUl.appendChild(li);
        });
      } catch(err) {
        console.error(err);
      }
    });
  
    // チャット画面を開く（チャット履歴をサーバーから取得して表示）
    function openChat(friend) {
      currentChatFriend = friend;
      pageHome.style.display = "none";
      pageChat.style.display = "block";
      messageHistory.innerHTML = "";
      fetch(`/chatHistory?user1=${currentUser.username}&user2=${friend}`)
        .then(res => res.json())
        .then(data => {
           if(data.chatHistory && data.chatHistory.length > 0) {
               data.chatHistory.forEach(msgObj => {
                   const div = document.createElement("div");
                   if(msgObj.from === currentUser.username) {
                      div.textContent = "【自分】 " + msgObj.message;
                   } else {
                      div.textContent = `【${msgObj.from}】 ${msgObj.message}`;
                   }
                   messageHistory.appendChild(div);
               });
           } else {
               const welcome = document.createElement("div");
               welcome.textContent = "チャット開始: " + friend;
               messageHistory.appendChild(welcome);
           }
           messageHistory.scrollTop = messageHistory.scrollHeight;
        })
        .catch(err => {
           console.error(err);
           const welcome = document.createElement("div");
           welcome.textContent = "チャット開始: " + friend;
           messageHistory.appendChild(welcome);
        });
    }
  
    // ホーム画面に戻る
    backToHomeBtn.addEventListener("click", function() {
      pageChat.style.display = "none";
      pageHome.style.display = "block";
    });
  
    // チャット送信処理
    sendMessageBtn.addEventListener("click", function() {
      const msg = chatInput.value.trim();
      if(msg === "" || !currentChatFriend) return;
      const div = document.createElement("div");
      div.textContent = "【自分】 " + msg;
      messageHistory.appendChild(div);
      socket.emit('private message', { to: currentChatFriend, message: msg });
      chatInput.value = "";
      messageHistory.scrollTop = messageHistory.scrollHeight;
    });
  
    // 受信したプライベートメッセージの表示
    socket.on('private message', (data) => {
      if(data.from === currentChatFriend) {
        const div = document.createElement("div");
        div.textContent = `【${data.from}】 ${data.message}`;
        messageHistory.appendChild(div);
        messageHistory.scrollTop = messageHistory.scrollHeight;
      }
    });
  });
  