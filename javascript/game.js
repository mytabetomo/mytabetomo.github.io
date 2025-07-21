async function judgeUser(user, db, totalNutrients, targetNutrients) {
  let petStatus = "Healthy";
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = year + "-" + month + "-" + day;

  const userDocRef = db.collection("users").doc(user.uid);

  const nutrientKeys = [
    "Protein",
    "Total lipid (fat)",
    "Carbohydrate, by difference",
    "Energy",
    "Sugars, total including NLEA",
    "Fiber, total dietary",
  ];

  let score = 0;

  for (var i = 0; i < nutrientKeys.length; i++) {
    var key = nutrientKeys[i];
    var targetVal;
    if (targetNutrients[key]) {
      targetVal = targetNutrients[key];
    } else {
      targetVal = 0;
    }

    var actualVal;
    if (totalNutrients[key]) {
      actualVal = totalNutrients[key].value;
    } else {
      actualVal = 0;
    }

    var truePercent;
    if (targetVal > 0) {
      truePercent = (actualVal / targetVal) * 100;
    } else {
      truePercent = 0;
    }

    const isWithinTarget = truePercent >= 90 && truePercent <= 110;

    if (key === "Energy") {
      if (isWithinTarget) {
        score += 5;
      } else {
        score += -5;
      }
    } else {
      if (isWithinTarget) {
        score += 1;
      } else {
        score += -1;
      }
    }
  }

  var daysStatus;
  if (score >= 5) {
    daysStatus = 1;
  } else {
    daysStatus = -1;
  }

  await db
    .collection("users")
    .doc(user.uid)
    .collection("days")
    .doc(todayStr)
    .set(
      {
        daysStatus: daysStatus,
        updatedAt: new Date().toISOString(),
      },
      {
        merge: true,
      }
    );

  const pastDates = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    pastDates.push(y + "-" + m + "-" + dd);
  }

  const daysSnapshot = await db
    .collection("users")
    .doc(user.uid)
    .collection("days")
    .where(firebase.firestore.FieldPath.documentId(), "in", pastDates)
    .get();

  let healthyCount = 0;
  var docs = daysSnapshot.docs;
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    if (doc.data().daysStatus >= 1) {
      healthyCount++;
    }
  }

  var newHealthStatus;
  if (healthyCount >= 2) {
    newHealthStatus = "Healthy";
  } else {
    newHealthStatus = "Unhealthy";
  }

  await userDocRef.set(
    {
      healthStatus: newHealthStatus,
    },
    {
      merge: true,
    }
  );

  document.getElementById("pet-status-display").textContent =
    "Pet Status: " + newHealthStatus;

  return newHealthStatus;
}

function getAdjustedRDI(calories) {
  return {
    Energy: calories,
    Protein: (calories * 0.2) / 4,
    "Total lipid (fat)": (calories * 0.25) / 9,
    "Carbohydrate, by difference": (calories * 0.55) / 4,
    "Sugars, total including NLEA": (calories * 0.1) / 4,
    "Fiber, total dietary": (calories / 1000) * 14,
  };
}

async function runHealthCheck() {
  const user = auth.currentUser;
  const userDocRef = db.collection("users").doc(user.uid);
  const userDoc = await userDocRef.get();
  const userData = userDoc.data();

  var tutorialCompleted = userData.tutorialCompleted;
  if (!tutorialCompleted) {
    tutorialCompleted = false;
  }

  if (tutorialCompleted) {
    var caloriesForRDI = userData.targetCalories;
    if (!caloriesForRDI) {
      caloriesForRDI = userData.tdee;
      if (!caloriesForRDI) {
        caloriesForRDI = 2000;
      }
    }

    const rdi = getAdjustedRDI(caloriesForRDI);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const localDateString = year + "-" + month + "-" + day;

    const querySnapshot = await userDocRef
      .collection("meals")
      .where("date", "==", localDateString)
      .get();
    const summedTotals = {};

    var docs = querySnapshot.docs;
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      const nutrients = doc.data().nutrients;
      for (const nutrientName in nutrients) {
        const nutrientData = nutrients[nutrientName];
        if (!summedTotals[nutrientName]) {
          summedTotals[nutrientName] = {
            value: 0,
            unitName: nutrientData.unitName,
          };
        }
        summedTotals[nutrientName].value += nutrientData.value;
      }
    }
    judgeUser(user, db, summedTotals, rdi);
  }
}

auth.onAuthStateChanged(async function (user) {
  if (!user) {
    window.location.href = "/index.html";
    return;
  }

  const userDocRef = db.collection("users").doc(user.uid);
  const userDoc = await userDocRef.get();

  await runHealthCheck();

  const updatedUserDoc = await userDocRef.get();
  const updatedUserData = updatedUserDoc.data();

  var streak = updatedUserData.consecutiveDays;
  if (!streak) {
    streak = 0;
  }
  petStatus = updatedUserData.healthStatus;
  if (!petStatus) {
    petStatus = "Healthy";
  }
  var selectedBackground = updatedUserData.selectedBackground;
  if (!selectedBackground) {
    selectedBackground = "Blue Living Room";
  }

  const statusBG = document.getElementById("pet-status-display");

  statusBG.textContent = "Pet Status: " + petStatus;

  statusBG.offsetHeight;

  document.getElementById("game-streak-display").textContent =
    "Streak: " + streak + " days";
  document.getElementById("pet-status-display").textContent =
    "Pet Status: " + petStatus;
  setBackgroundImage(selectedBackground);

  document
    .getElementById("click-screen")
    .addEventListener("click", function () {
      anime({
        targets: document.getElementById("click-screen"),
        opacity: [1, 0],
        duration: 200,
        easing: "easeOutQuad",
        complete: function () {
          document.getElementById("click-screen").remove();
        },
      });
    });
});

function setBackgroundImage(backgroundName) {
  let imageUrl = "";
  switch (backgroundName) {
    case "Blue Living Room":
      imageUrl = "graphics/game-bg1.jpeg";
      break;
    case "Pink Bedroom":
      imageUrl = "graphics/game-bg2.jpeg";
      break;
    case "Grey Living Room":
      imageUrl = "graphics/game-bg3.jpeg";
      break;
    case "Gamer's Room":
      imageUrl = "graphics/game-bg4.jpeg";
      break;
    case "Medieval Castle":
      imageUrl = "graphics/game-bg5.jpeg";
      break;
    default:
      imageUrl = "graphics/bg-main.jpeg";
  }
  document.body.style.backgroundImage = "url('" + imageUrl + "')";
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
}

let logoutBtn = document.getElementById("logout");
logoutBtn.addEventListener("click", function () {
  auth.signOut().then(function () {
    window.location.href = "/index.html";
  });
});

let tutorialBtn = document.getElementById("tutorial-btn");
tutorialBtn.addEventListener("click", function () {
  const user = auth.currentUser;
  db.collection("users")
    .doc(user.uid)
    .set(
      {
        tutorialCompleted: false,
      },
      {
        merge: true,
      }
    )
    .then(function () {
      window.location.href = "/game.html";
    });
});

document.getElementById("click-screen").addEventListener("click", function () {
  document.getElementById("icon-toolbar").classList.remove("hidden");
  document.getElementById("topbar").classList.remove("hidden");
  anime({
    targets: "#icon-toolbar",
    translateY: [50, 0],
    opacity: [0, 1],
    delay: 200,
    duration: 500,
    easing: "easeOutExpo",
  });
  anime({
    targets: "#user-icon, #date-display, #volume-icon, #setting-icon",
    opacity: [0, 1],
    delay: 500,
    duration: 800,
    easing: "easeOutExpo",
  });
  anime({
    targets: "#info-icon",
    opacity: [0, 1],
    scale: [0, 1],
    delay: 700,
    duration: 150,
    easing: "easeOutExpo",
  });
  anime({
    targets: "#heart-icon, #icon-shell-1",
    opacity: [0, 1],
    scale: [0, 1],
    delay: 800,
    duration: 150,
    easing: "easeOutExpo",
  });
  anime({
    targets: "#food-icon",
    opacity: [0, 1],
    scale: [0, 1],
    delay: 900,
    duration: 150,
    easing: "easeOutExpo",
  });
});

document.addEventListener("turbo:frame-load", function () {
  anime({
    targets: "#overlay-content",
    opacity: [0, 1],
    scale: [0, 1],
    translateY: [30, 0],
    duration: 500,
    easing: "easeOutExpo",
  });
  runHealthCheck();
  const statusBG = document.getElementById("pet-status-display");
  statusBG.classList.remove("bg-green-500", "bg-red-600", "text-white");

  if (petStatus == "Healthy") {
    statusBG.classList.add("bg-green-500", "text-white");
    statusBG.textContent = "Pet Status: " + petStatus;
  } else if (petStatus == "Unhealthy") {
    statusBG.classList.add("bg-red-500", "text-white");
    statusBG.textContent = "Pet Status: " + petStatus;
  }
});

let datetext = document.getElementById("date-display");
let date = new Date();
datetext.textContent = date.toLocaleDateString();

let muteButtonSVG = document.getElementById("volume-icon");
let isMuted = false;
let notMuted =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume2-icon lucide-volume-2"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
let muted =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-off-icon lucide-volume-off"><path d="M16 9a5 5 0 0 1 .95 2.293"/><path d="m2 2 20 20"/><path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"/><path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686"/></svg>';
const muteSound = new Howl({
  src: ["/sounds/mute.mp3"],
  volume: 0.5,
});

muteButtonSVG.addEventListener("click", function () {
  isMuted = !isMuted;
  if (isMuted) {
    Howler.mute(true);
    muteButtonSVG.innerHTML = muted;
    muteButtonSVG.querySelector("svg").classList.add("h-[4vh]");
  } else {
    Howler.mute(false);
    muteSound.play();
    muteButtonSVG.innerHTML = notMuted;
    muteButtonSVG.querySelector("svg").classList.add("h-[4vh]");
  }
});

const popup = new Howl({
  src: ["/sounds/popup.mp3"],
  volume: 0.5,
});
const page = new Howl({
  src: ["/sounds/paper.mp3"],
  volume: 0.5,
});
const popdown = new Howl({
  src: ["/sounds/popdown.mp3"],
  volume: 0.5,
});

let menustatus = -1;
let usericon = document.getElementById("user-icon");
let usershell = document.getElementById("user-shell");
let foodicon = document.getElementById("food-icon");
let foodshell = document.getElementById("icon-shell-2");
let hearticon = document.getElementById("heart-icon");
let heartshell = document.getElementById("icon-shell-1");
let logicon = document.getElementById("info-icon");
let logshell = document.getElementById("icon-shell-0");
let settingicon = document.getElementById("setting-icon");
let settingshell = document.getElementById("icon-shell-s");

function setupToolbarListeners() {
  usershell.addEventListener("click", function () {
    handleMenuClick(0, "overlays/user.html");
  });
  foodshell.addEventListener("click", function () {
    handleMenuClick(1, "overlays/food.html");
  });
  heartshell.addEventListener("click", function () {
    handleMenuClick(2, "overlays/log.html");
  });
  logshell.addEventListener("click", function () {
    handleMenuClick(3, "overlays/meal.html");
  });
  settingshell.addEventListener("click", function () {
    handleMenuClick(4, "overlays/settings.html");
  });
}

function handleMenuClick(menuIndex, url) {
  if (menustatus !== menuIndex) {
    activateIcon(menuIndex);
    popup.play();
    page.play();
    Turbo.visit(url, {
      frame: "overlay",
    });
    menustatus = menuIndex;
  } else {
    resetAllIcons();
    menustatus = -1;
  }
}

function activateIcon(activeIndex) {
  const icons = [
    {
      shell: usershell,
      icon: usericon,
    },
    {
      shell: foodshell,
      icon: foodicon,
    },
    {
      shell: heartshell,
      icon: hearticon,
    },
    {
      shell: logshell,
      icon: logicon,
    },
    {
      shell: settingshell,
      icon: settingicon,
    },
  ];

  for (var index = 0; index < icons.length; index++) {
    var item = icons[index];
    var scaleValue;
    if (activeIndex === index) {
      if (index === 2) {
        scaleValue = 1.1;
      } else {
        scaleValue = 1.3;
      }
    } else {
      scaleValue = 1;
    }
    anime({
      targets: item.shell,
      scale: scaleValue,
      duration: 100,
      easing: "easeInExpo",
    });
  }
}

async function resetAllIcons() {
  popdown.play();
  anime({
    targets: "#overlay-content",
    opacity: [1, 0],
    translateY: [0, 30],
    duration: 500,
    easing: "easeOutExpo",
  });
  activateIcon(-1);
  await anime({
    targets: "#overlay-content",
    opacity: 0,
    duration: 500,
  }).finished;
  Turbo.visit("game.html", {
    frame: "overlay",
  });
}

document.addEventListener("DOMContentLoaded", setupToolbarListeners);
