let tutorial = new Howl({
  src: ["sounds/tutorial.mp3"],
  loop: true,
});

let bgm1 = new Howl({
  src: ["sounds/bgm1.mp3"],
  loop: true,
});

let bgm2 = new Howl({
  src: ["sounds/bgm2.mp3"],
  loop: true,
});

let gamestart = new Howl({
  src: ["sounds/start.mp3"],
});
gamestart.volume(0.5);

function playBackgroundMusic(selectedMusic) {
  bgm1.stop();
  bgm2.stop();
  tutorial.stop();

  if (selectedMusic === "Default") {
    bgm1.play();
  } else if (selectedMusic === "Piano") {
    bgm2.play();
  }
}

auth.onAuthStateChanged(function (user) {
  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function (doc) {
      var selectedMusic = doc.data().music;
      if (!selectedMusic) {
        selectedMusic = "Default";
      }

      document
        .getElementById("click-screen")
        .addEventListener("click", function () {
          gamestart.play();
          if (doc.data().tutorialCompleted !== true) {
            tutorial.play();
          } else {
            playBackgroundMusic(selectedMusic);
          }
        });
    });
});