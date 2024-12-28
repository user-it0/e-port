// chat.js (Firebaseのリアルタイムデータベースを使ったサンプルコード)
import firebase from 'firebase/app';
import 'firebase/database';

// Firebaseの設定
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  databaseURL: "your-database-url",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// ランダムチャット用のコード（ユーザーがチャットメッセージを送信する部分）
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

chatInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        const message = chatInput.value;
        firebase.database().ref('chats').push({ message });
        chatInput.value = '';
    }
});

// Firebaseデータベースからチャットメッセージを取得して表示
firebase.database().ref('chats').on('child_added', (snapshot) => {
    const message = snapshot.val().message;
    const messageElement = document.createElement('li');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
});