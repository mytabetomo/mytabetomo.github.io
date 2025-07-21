document.addEventListener("turbo:frame-load", function () {
  const auth = window.firebaseAuth;
  const db = window.firebaseDB;
  const user = auth.currentUser;

  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function (doc) {
      const userData = doc.data();
      populateUserData(userData);

      var streak = userData.consecutiveDays;
      if (!streak) {
        streak = 0;
      }

      var petStatus = userData.healthStatus;
      if (!petStatus) {
        petStatus = "Healthy";
      }

      document.getElementById("game-streak-display").textContent =
        "Streak: " + streak + " days";
      document.getElementById("pet-status-display").textContent =
        "Pet Status: " + petStatus;
    });

  document
    .getElementById("edit-profile-button")
    .addEventListener("click", function () {
      anime({
        targets: "#icon-toolbar",
        translateY: [0, 50],
        opacity: [1, 0],
        delay: 0,
        duration: 500,
        easing: "easeOutExpo",
      });
      Turbo.visit("overlays/tutorial.html", {
        frame: "tutorial"
      });
      const overlayFrame = document.getElementById("overlay");
      overlayFrame.innerHTML = "";
    });
});

function populateUserData(data) {
  const genderMap = {
    1: "Male",
    2: "Female"
  };
  const activityMap = {
    1: "Rarely",
    2: "Occasionally",
    3: "Frequently"
  };
  const goalMap = {
    1: "Lose Weight",
    2: "Maintain Weight",
    3: "Gain Weight"
  };

  document.getElementById("profile-title").textContent = data.name + "'s Profile";

  var genderText = genderMap[data.gender];
  if (!genderText) {
    genderText = "N/A";
  }
  document.getElementById("user-gender-display").textContent = genderText;

  var ageText;
  if (data.age) {
    ageText = data.age + " years";
  } else {
    ageText = "N/A";
  }
  document.getElementById("user-age-display").textContent = ageText;

  var heightText;
  if (data.height) {
    heightText = data.height.toFixed(0) + " cm";
  } else {
    heightText = "N/A";
  }
  document.getElementById("user-height-display").textContent = heightText;

  var weightText;
  if (data.weight) {
    weightText = data.weight + " kg";
  } else {
    weightText = "N/A";
  }
  document.getElementById("user-weight-display").textContent = weightText;

  var activityText = activityMap[data.exerciseLevel];
  if (!activityText) {
    activityText = "N/A";
  }
  document.getElementById("user-activity-display").textContent = activityText;

  var goalText = goalMap[data.goal];
  if (!goalText) {
    goalText = "N/A";
  }
  document.getElementById("user-goal-display").textContent = goalText;

  var caloriesText;
  if (data.targetCalories) {
    caloriesText = data.targetCalories.toFixed(0) + " kcal";
  } else {
    caloriesText = "-- kcal";
  }
  document.getElementById("user-calories-display").textContent = caloriesText;

  var streakText;
  if (data.consecutiveDays) {
    streakText = data.consecutiveDays + " days";
  } else {
    streakText = "-- days";
  }
  document.getElementById("user-streak-display").textContent = streakText;

  var joinDateText;
  if (data["join-date"]) {
    joinDateText = data["join-date"];
  } else {
    joinDateText = "N/A";
  }
  document.getElementById("user-join-date-display").textContent = joinDateText;
}