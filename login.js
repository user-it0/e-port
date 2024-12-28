// login.js
document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Firebase Authenticationを使ってログイン
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ログイン成功
            const user = userCredential.user;
            alert('ログインに成功しました！');
            window.location.href = "index.html";  // ログイン後にメインページへリダイレクト
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert(`ログインエラー: ${errorMessage}`);
        });
});