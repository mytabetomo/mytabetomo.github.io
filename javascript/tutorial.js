const click = new Howl({
  src: ["/sounds/start.mp3"],
});
click.volume(0.5);

const petSounds = {
  cat: new Howl({
    src: ["/sounds/meow.mp3"],
    volume: 1.0
  }),
  bunny: new Howl({
    src: ["/sounds/squeak.mp3"],
    volume: 2.0
  }),
  slime: new Howl({
    src: ["/sounds/squish.mp3"],
    volume: 0.7
  }),
};

document.addEventListener("turbo:frame-load", function () {
  var buttons = document.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      click.play();
    });
  }
});

const toolbar = document.getElementById("icon-toolbar");
toolbar.classList.add("hidden");
const topbar = document.getElementById("topbar");
topbar.classList.add("hidden");

auth.onAuthStateChanged(function (user) {
  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function (doc) {
      if (doc.data().tutorialCompleted !== true) {
        document
          .getElementById("click-screen")
          .addEventListener("click", function () {
            toolbar.classList.add("hidden");
            topbar.classList.add("hidden");
            Turbo.visit("overlays/tutorial.html", {
              frame: "tutorial"
            });
          });
      }
    });
});

let tutorialstage = 0;
let activeStageId = null;
let typingTimeouts = [];

const tutorialStages = [{
  contentId: "stage-1"
}, {
  contentId: "stage-2",
  field: "selectedPet"
}, {
  contentId: "stage-3"
}, {
  contentId: "stage-4"
}, {
  contentId: "stage-5"
}, {
  contentId: "stage-6"
}, {
  contentId: "stage-7"
}, {
  contentId: "stage-8"
}, {
  contentId: "stage-9"
}, {
  contentId: "stage-10",
  field: "age"
}, {
  contentId: "stage-11",
  field: "height"
}, {
  contentId: "stage-12",
  field: "weight"
}, {
  contentId: "stage-13"
}, {
  contentId: "stage-14"
}, {
  contentId: "stage-15"
}, ];

const typing = new Howl({
  src: ["/sounds/pop.mp3"],
});
typing.volume(0.15);

const typing2 = new Howl({
  src: ["/sounds/press.mp3"],
});
typing2.volume(0.2);

const button = new Howl({
  src: ["/sounds/bloop.mp3"],
});
button.volume(0.8);

function animateTextInStage(stageElement) {
  for (var i = 0; i < typingTimeouts.length; i++) {
    clearTimeout(typingTimeouts[i]);
  }
  typingTimeouts = [];

  const textElements = stageElement.querySelectorAll(".animated-text");

  for (var i = 0; i < textElements.length; i++) {
    var textEl = textElements[i];
    const text = textEl.textContent;
    const lettersHTML = text.replace(/\S/g, "<span class='letter'>$&</span>");
    textEl.innerHTML = lettersHTML;
  }

  const letters = stageElement.querySelectorAll(".letter");

  anime({
    targets: letters,
    opacity: [0, 1],
    translateY: [10, 0],
    easing: "easeOutExpo",
    duration: 600,
    delay: anime.stagger(50),
  });

  for (var i = 0; i < letters.length; i++) {
    const timeoutId = setTimeout(function () {
      typing.play();
    }, i * 50);
    typingTimeouts.push(timeoutId);
  }
}

function animateTextInStage2(stageElement) {
  for (var i = 0; i < typingTimeouts.length; i++) {
    clearTimeout(typingTimeouts[i]);
  }
  typingTimeouts = [];

  const textElements = stageElement.querySelectorAll(".animated-text");

  for (var i = 0; i < textElements.length; i++) {
    var textEl = textElements[i];
    const text = textEl.textContent;
    const lettersHTML = text.replace(/\S/g, "<span class='letter'>$&</span>");
    textEl.innerHTML = lettersHTML;
  }

  const letters = stageElement.querySelectorAll(".letter");

  anime({
    targets: letters,
    opacity: [0, 1],
    translateY: [10, 0],
    easing: "easeOutExpo",
    duration: 600,
    delay: anime.stagger(50),
  });

  for (var i = 0; i < letters.length; i++) {
    const timeoutId = setTimeout(function () {
      typing2.play();
    }, i * 50);
    typingTimeouts.push(timeoutId);
  }
}

function showStage(stageId) {
  const nextStage = document.getElementById(stageId);

  function showNextStage() {
    nextStage.classList.remove("hidden");
    animateTextInStage(nextStage);
    anime({
      targets: nextStage,
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 400,
      easing: "easeOutExpo",
    });
    activeStageId = stageId;
  }

  if (activeStageId != null && activeStageId !== stageId) {
    const prevStage = document.getElementById(activeStageId);
    anime({
      targets: prevStage,
      opacity: [1, 0],
      scale: [1, 0.5],
      duration: 300,
      easing: "easeInExpo",
      complete: function () {
        prevStage.classList.add("hidden");
        showNextStage();
      },
    });
  } else {
    showNextStage();
  }
}

async function validateInputOrFirestore(fieldName) {
  let hasValidInput = false;

  if (fieldName === "height") {
    const heightCm = document.getElementById("height").value;
    if (heightCm && parseFloat(heightCm) > 0) {
      hasValidInput = true;
    }
  } else {
    const inputElement = document.getElementById(fieldName);
    if (inputElement && inputElement.value && parseFloat(inputElement.value) > 0) {
      hasValidInput = true;
    }
  }

  if (hasValidInput) {
    return true;
  }

  const user = auth.currentUser;
  const doc = await db.collection("users").doc(user.uid).get();
  if (doc.exists && doc.data()[fieldName] != null) {
    return true;
  }

  return false;
}

document.addEventListener("turbo:frame-load", function () {
  const container = document.getElementById("tutorial-content-container");
  showStage(tutorialStages[tutorialstage].contentId);

  const petButtons = document.querySelectorAll("#pet-selection .pet-choice");
  for (var i = 0; i < petButtons.length; i++) {
    petButtons[i].addEventListener("click", function (event) {
      const selectedPet = event.currentTarget.dataset.pet;
      const user = auth.currentUser;

      if (petSounds[selectedPet]) {
        petSounds[selectedPet].play();
      }

      db.collection("users").doc(user.uid).set({
        selectedPet: selectedPet,
      }, {
        merge: true
      });

      for (var j = 0; j < petButtons.length; j++) {
        petButtons[j].classList.remove("border-blue-500", "scale-105");
        petButtons[j].classList.add("border-transparent");
      }

      event.currentTarget.classList.add("border-blue-500", "scale-105");
      event.currentTarget.classList.remove("border-transparent");
    });
  }


  container.addEventListener("click", async function (event) {
    if (event.target.classList.contains("launch")) {
      button.play();

      let canProceed = true;
      const currentStageInfo = tutorialStages[tutorialstage];

      if (currentStageInfo.field) {
        canProceed = await validateInputOrFirestore(currentStageInfo.field);
      }

      if (!canProceed) {
        return;
      }

      tutorialstage++;

      if (tutorialstage < tutorialStages.length) {
        showStage(tutorialStages[tutorialstage].contentId);
      } else {
        anime({
          targets: "#tutorial-content-container",
          opacity: [1, 0],
          duration: 400,
          easing: "easeInExpo",
        });

        const user = auth.currentUser;
        await db.collection("users").doc(user.uid).set({
          tutorialCompleted: true,
          selectedBackground: "Blue Living Room",
        }, {
          merge: true
        });

        const toolbar = document.getElementById("icon-toolbar");
        toolbar.classList.remove("hidden");
        const topbar = document.getElementById("topbar");
        topbar.classList.remove("hidden");
        window.location.href = "game.html";
      }
    }
  });
});