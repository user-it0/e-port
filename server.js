const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

// 永続的なチャット履歴保存用ファイルの設定
const chatHistoryFile = path.join(__dirname, 'chatHistory.json');
let chatHistory = {};

// 既存のチャット履歴を読み込む（ファイルが存在しない場合は空のオブジェクト）
if (fs.existsSync(chatHistoryFile)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(chatHistoryFile));
  } catch (e) {
    console.error('Error reading chatHistory file:', e);
    chatHistory = {};
  }
}

// 簡易的なメモリ上のユーザーストア
// 各ユーザーは { username, password, approvedFriends: [], friendRequests: [] } の形式
let users = [];

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'ユーザー名は既に存在します' });
  }
  let newUser = { username, password, approvedFriends: [], friendRequests: [] };
  users.push(newUser);
  res.json({ message: '登録成功', user: newUser });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  let user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '認証失敗' });
  }
  res.json({ message: 'ログイン成功', user });
});

app.get('/users', (req, res) => {
  const { username } = req.query;
  const filtered = users.filter(u => u.username !== username).map(u => u.username);
  res.json({ users: filtered });
});

app.post('/sendFriendRequest', (req, res) => {
  const { from, to } = req.body;
  let targetUser = users.find(u => u.username === to);
  if (!targetUser) {
    return res.status(404).json({ error: '対象ユーザーが見つかりません' });
  }
  if (targetUser.friendRequests.includes(from)) {
    return res.status(400).json({ error: '既にリクエストを送信済みです' });
  }
  targetUser.friendRequests.push(from);
  res.json({ message: '友達追加リクエストを送信しました' });
});

app.get('/friendRequests', (req, res) => {
  const { username } = req.query;
  let user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }
  res.json({ friendRequests: user.friendRequests });
});

app.post('/respondFriendRequest', (req, res) => {
  const { username, from, response } = req.body;
  let user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }
  const index = user.friendRequests.indexOf(from);
  if (index === -1) {
    return res.status(400).json({ error: 'リクエストが存在しません' });
  }
  user.friendRequests.splice(index, 1);
  if (response === 'accept') {
    if (!user.approvedFriends.includes(from)) {
      user.approvedFriends.push(from);
    }
    let fromUser = users.find(u => u.username === from);
    if (fromUser && !fromUser.approvedFriends.includes(username)) {
      fromUser.approvedFriends.push(username);
    }
    return res.json({ message: '友達追加リクエストを承認しました' });
  } else {
    return res.json({ message: '友達追加リクエストを拒否しました' });
  }
});

app.get('/approvedFriends', (req, res) => {
  const { username } = req.query;
  let user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }
  res.json({ approvedFriends: user.approvedFriends });
});

// チャット履歴取得用エンドポイント
app.get('/chatHistory', (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    return res.status(400).json({ error: 'user1 and user2 are required' });
  }
  const conversationKey = [user1, user2].sort().join('|');
  const history = chatHistory[conversationKey] || [];
  res.json({ chatHistory: history });
});

// Socket.IO によるリアルタイムチャット処理
io.on('connection', (socket) => {
  console.log('a user connected');
  
  // ユーザー名を受け取り、そのユーザー専用のルームに参加
  socket.on('join', (username) => {
    socket.username = username;
    socket.join(username);
    console.log(username + ' joined their room');
  });
  
  // プライベートメッセージ送信
  socket.on('private message', (data) => {
    console.log(`Message from ${socket.username} to ${data.to}: ${data.message}`);
    io.to(data.to).emit('private message', { from: socket.username, message: data.message });
    
    // チャット履歴にメッセージを保存
    const conversationKey = [socket.username, data.to].sort().join('|');
    if (!chatHistory[conversationKey]) {
      chatHistory[conversationKey] = [];
    }
    const messageObj = {
      from: socket.username,
      to: data.to,
      message: data.message,
      timestamp: new Date().toISOString()
    };
    chatHistory[conversationKey].push(messageObj);
    // chatHistory.json に書き出し
    fs.writeFile(chatHistoryFile, JSON.stringify(chatHistory, null, 2), (err) => {
      if (err) console.error('Error saving chat history:', err);
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
