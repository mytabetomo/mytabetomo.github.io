const firebaseConfig = {
  apiKey: "AIzaSyCPDgySQE3Oqu3IXgxbWXLQhjZPhbCNvQY",
  authDomain: "my-tabetomo.firebaseapp.com",
  projectId: "my-tabetomo",
  storageBucket: "my-tabetomo.firebasestorage.app",
  messagingSenderId: "780129124738",
  appId: "1:780129124738:web:01a30311719b87d0368f9b",
  measurementId: "G-NSGBD8ZKQ0",
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", function() {
  let liform = document.getElementById("login-form");
  liform.addEventListener("submit", loginsubmit);
});

document.addEventListener("turbo:frame-load", function() {
  const suform = document.getElementById("signup-form");
  suform.addEventListener("submit", signupsubmit);

  liform = document.getElementById("login-form");
  liform.addEventListener("submit", loginsubmit);
});

function signupsubmit(event) {
  event.preventDefault();

  const su_nickname = document.getElementById("nickname").value.trim();
  const su_email = document.getElementById("email").value.trim();
  const su_pass = document.getElementById("password").value.trim();
  const su_confirm = document.getElementById("confirm-password").value.trim();
  const su_errorMsg = document.getElementById("signup-error");

  if (su_confirm !== su_pass) {
    su_errorMsg.textContent = "Your passwords do not match. Please try again.";
    return;
  }

  auth
    .createUserWithEmailAndPassword(su_email, su_pass)
    .then(function(userCredential) {
      const user = userCredential.user;
      su_errorMsg.textContent = "";

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0'); 
      const day = String(today.getDate()).padStart(2, '0');
      const joinDate = `${year}-${month}-${day}`;

      for (let i = 1; i <= 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const pastDateStr = `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        db.collection("users")
          .doc(user.uid)
          .collection("days")
          .doc(pastDateStr)
          .set({ daysStatus: 1 });
      }
      
      db.collection("users")
        .doc(user.uid)
        .set({
          tutorialCompleted: false,
          'join-date': joinDate, 
          name: su_nickname,
          selectedBackground: "default",
          selectedPet: "cat",
          music: "Default",
          consecutiveDays: 0,
        lastLoginDate: joinDate,
        healthStatus: "Healthy",
        gender: 1,
        age: 0,
        exerciseLevel: 1,
        goal: 0,
        height: 0,
        targetCalories: 0,
        tdee: 0,
        weight: 0,
        })
        .then(function () {
          window.location.href = "/game.html";
        })
        .catch(function (error) {
          su_errorMsg.textContent = error.message;
        });
    })
    .catch(function (error) {
      if (error.code === "auth/email-already-in-use") {
        su_errorMsg.textContent = "This email is already linked to an existing account. Please try logging in instead.";
      } else if (error.code === "auth/weak-password") {
        su_errorMsg.textContent = "Your password must be at least 6 characters long. Please choose a longer password.";
      } else {
        su_errorMsg.textContent = error.message;
      }
    });
}

function loginsubmit(event) {
  event.preventDefault();

  const li_email = document.getElementById("login-email").value.trim();
  const li_pass = document.getElementById("login-password").value.trim();
  const li_errorMsg = document.getElementById("login-error");

  auth
    .signInWithEmailAndPassword(li_email, li_pass)
    .then((userCredential) => {
      const user = userCredential.user;
      li_errorMsg.textContent = "";

      window.location.href = "/game.html";
    })
    .catch((error) => {
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        li_errorMsg.textContent = "We couldn't find an account with those credentials. Please check your email and password.";
      } else {
        li_errorMsg.textContent = error.message;
      }
    });
}
window.firebaseAuth = auth;
window.firebaseDB = db;
window.user = null;

auth.onAuthStateChanged(function(u) {
  window.user = u;
});