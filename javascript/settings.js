document.addEventListener("turbo:frame-load", function () {
  const petSelect = document.getElementById("pet-select");
  const musicSelect = document.getElementById("music-select");
  const backgroundSelect = document.getElementById("background-select");
  const applyButton = document.getElementById("apply-settings-button");

  const auth = window.firebaseAuth;
  const db = window.firebaseDB;
  const user = auth.currentUser;

  function loadSettingsFromFirestore() {
    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (doc) {
        const userData = doc.data();
        if (userData.selectedPet) {
          petSelect.value = userData.selectedPet;
        }
        if (userData.music) {
          musicSelect.value = userData.music;
        }
        if (userData.selectedBackground) {
          backgroundSelect.value = userData.selectedBackground;
        }
      });
  }

  loadSettingsFromFirestore();

  applyButton.addEventListener("click", function () {
    db.collection("users")
      .doc(user.uid)
      .set({
        selectedPet: petSelect.value,
        music: musicSelect.value,
        selectedBackground: backgroundSelect.value,
      }, {
        merge: true
      });
    window.location.href = "/game.html";
  });
});