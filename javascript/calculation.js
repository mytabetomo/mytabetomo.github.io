var inputHeight;
var inputWeight;
var inputAge;
var inputFt;

var genderButtonsContainer;
var exerciseLevelButtonsContainer;
var selectionButtonsContainer;

var heightUnitSelectionContainer;
var cmInputContainer;
var ftInputContainer;

var selectedGender = 1;
var selectedExerciseLevel = 2;
var selectedGoal = 2;
var selectedHeightUnit = "cm";

function updateProfileField(fieldName, fieldValue) {
  var db = window.firebaseDB;
  var auth = window.firebaseAuth;
  var user = auth.currentUser;

  var updateData = {};
  updateData[fieldName] = fieldValue;
  updateData.updatedAt = new Date().toISOString();

  db.collection("users").doc(user.uid).update(updateData);
}

function updateVisibleElements() {
  var tutorialFrame = document.getElementById("tutorial");
  if (!tutorialFrame) {
    return;
  }

  inputHeight = tutorialFrame.querySelector("#height");
  inputWeight = tutorialFrame.querySelector("#weight");
  inputAge = tutorialFrame.querySelector("#age");
  inputFt = tutorialFrame.querySelector("#ft");

  genderButtonsContainer = tutorialFrame.querySelector("#gender");
  exerciseLevelButtonsContainer = tutorialFrame.querySelector("#exercise-level");
  selectionButtonsContainer = tutorialFrame.querySelector("#selection");
  heightUnitSelectionContainer = tutorialFrame.querySelector("#height-unit-selection");
  cmInputContainer = tutorialFrame.querySelector("#cm-input-container");
  ftInputContainer = tutorialFrame.querySelector("#ft-input-container");

  var genderButtons = genderButtonsContainer.querySelectorAll("button");
  for (var i = 0; i < genderButtons.length; i++) {
    genderButtons[i].removeEventListener("click", handleGenderSelection);
    genderButtons[i].addEventListener("click", handleGenderSelection);
  }
  handleButtonSelection(genderButtonsContainer, selectedGender);

  var exerciseButtons = exerciseLevelButtonsContainer.querySelectorAll("button");
  for (var i = 0; i < exerciseButtons.length; i++) {
    exerciseButtons[i].removeEventListener("click", handleExerciseLevelSelection);
    exerciseButtons[i].addEventListener("click", handleExerciseLevelSelection);
  }
  handleButtonSelection(exerciseLevelButtonsContainer, selectedExerciseLevel);

  var goalButtons = selectionButtonsContainer.querySelectorAll("button");
  for (var i = 0; i < goalButtons.length; i++) {
    goalButtons[i].removeEventListener("click", handleGoalSelection);
    goalButtons[i].addEventListener("click", handleGoalSelection);
  }
  handleButtonSelection(selectionButtonsContainer, selectedGoal);

  var heightUnitButtons = heightUnitSelectionContainer.querySelectorAll("button");
  for (var i = 0; i < heightUnitButtons.length; i++) {
    heightUnitButtons[i].removeEventListener("click", handleHeightUnitSelection);
    heightUnitButtons[i].addEventListener("click", handleHeightUnitSelection);
  }
  handleUnitButtonSelection(heightUnitSelectionContainer, selectedHeightUnit);

  var nextStageBtnsConfig = [];
  nextStageBtnsConfig.push({
    id: "next-stage-10",
    validate: validateAge,
    fieldName: "age",
    inputElement: inputAge
  });
  nextStageBtnsConfig.push({
    id: "next-stage-11",
    validate: validateHeight,
    fieldName: "height",
    inputElement: inputHeight,
    ftInputElement: inputFt
  });
  nextStageBtnsConfig.push({
    id: "next-stage-12",
    validate: validateWeight,
    fieldName: "weight",
    inputElement: inputWeight
  });

  for (var i = 0; i < nextStageBtnsConfig.length; i++) {
    var stageConfig = nextStageBtnsConfig[i];
    var nextButton = tutorialFrame.querySelector("#" + stageConfig.id);

    if (nextButton) {
      (function(button, config) {
        var stageClickHandler = function(e) {
          if (!config.validate()) {
            e.preventDefault();
          } else {
            var valueToUpdate;
            var fieldNameToUpdate;

            if (config.fieldName === "height") {
              if (selectedHeightUnit === "cm") {
                valueToUpdate = parseFloat(config.inputElement.value);
                fieldNameToUpdate = "height";
                updateProfileField("heightFt", null);
              } else {
                valueToUpdate = parseFloat(config.ftInputElement.value);
                fieldNameToUpdate = "heightFt";
                updateProfileField("height", null);
              }
            } else {
              valueToUpdate = parseFloat(config.inputElement.value);
              fieldNameToUpdate = config.fieldName;
            }

            if (!isNaN(valueToUpdate) && valueToUpdate > 0) {
              updateProfileField(fieldNameToUpdate, valueToUpdate);
            }
          }
        };
        button.removeEventListener("click", stageClickHandler);
        button.addEventListener("click", stageClickHandler);
      })(nextButton, stageConfig);
    }
  }

  var goToGameButton = tutorialFrame.querySelector("#go-to-game");
  if (goToGameButton) {
    goToGameButton.removeEventListener("click", handleGoToGame);
    goToGameButton.addEventListener("click", handleGoToGame);
  }
}

function handleGenderSelection() {
  selectedGender = parseInt(this.dataset.value, 10);
  handleButtonSelection(genderButtonsContainer, selectedGender);
  updateProfileField("gender", selectedGender);
}

function handleExerciseLevelSelection() {
  selectedExerciseLevel = parseInt(this.dataset.value, 10);
  handleButtonSelection(exerciseLevelButtonsContainer, selectedExerciseLevel);
  updateProfileField("exerciseLevel", selectedExerciseLevel);
}

function handleGoalSelection() {
  selectedGoal = parseInt(this.dataset.value, 10);
  handleButtonSelection(selectionButtonsContainer, selectedGoal);
  updateProfileField("goal", selectedGoal);
}

function handleHeightUnitSelection() {
  var prevSelectedHeightUnit = selectedHeightUnit;
  selectedHeightUnit = this.dataset.unit;
  handleUnitButtonSelection(heightUnitSelectionContainer, selectedHeightUnit);
  updateProfileField("heightUnit", selectedHeightUnit);

  if (selectedHeightUnit === "cm") {
    if (prevSelectedHeightUnit !== "cm") {
      inputFt.value = "";
      updateProfileField("heightFt", null);
    }
  } else {
    if (prevSelectedHeightUnit !== "ft") {
      inputHeight.value = "";
      updateProfileField("height", null);
    }
  }
}

function handleGoToGame(e) {
  e.preventDefault();

  if (!validateAge()) {
    return;
  } else if (!validateHeight()) {
    return;
  } else if (!validateWeight()) {
    return;
  }

  var results = calculate();
  var nutrients = calculateRecommendedNutrients(
    results.age,
    results.height,
    results.weight,
    selectedGender,
    results.tdee
  );

  results.nutrients = nutrients;

  saveProfile(results);

  localStorage.setItem("calculatedTdee", results.tdee);
  localStorage.setItem("calculatedTargetCalories", results.targetCalories);
}

function validateAge() {
  var age = parseFloat(inputAge.value);
  if (age > 0 && !isNaN(age)) {
    return true;
  } else {
    return false;
  }
}

function validateHeight() {
  var isCmSelected;
  isCmSelected = false;
  if (selectedHeightUnit === "cm") {
    isCmSelected = true;
  }

  var heightValue;
  if (isCmSelected) {
    heightValue = parseFloat(inputHeight.value);
  } else {
    heightValue = parseFloat(inputFt.value);
  }

  if (heightValue > 0 && !isNaN(heightValue)) {
    return true;
  } else {
    return false;
  }
}

function validateWeight() {
  var weight = parseFloat(inputWeight.value);
  if (weight > 0 && !isNaN(weight)) {
    return true;
  } else {
    return false;
  }
}

function handleButtonSelection(container, selectedValue) {
  var buttons = container.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("selected-button");
  }
  var selectedButton = container.querySelector("button[data-value='" + selectedValue + "']");
  if (selectedButton) {
    selectedButton.classList.add("selected-button");
  }
}

function handleUnitButtonSelection(container, selectedUnit) {
  var buttons = container.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("selected-unit-button", "bg-blue-500", "text-white");
    buttons[i].classList.add("bg-gray-200", "text-gray-800");
  }
  var clickedButton = container.querySelector("button[data-unit='" + selectedUnit + "']");
  if (clickedButton) {
    clickedButton.classList.remove("bg-gray-200", "text-gray-800");
    clickedButton.classList.add("bg-blue-500", "text-white", "selected-unit-button");
  }

  if (selectedUnit === "cm") {
    cmInputContainer.classList.remove("hidden");
    ftInputContainer.classList.add("hidden");
  } else {
    cmInputContainer.classList.add("hidden");
    ftInputContainer.classList.remove("hidden");
  }
}

function calculate() {
  var heightInCm;

  if (selectedHeightUnit === "ft") {
    heightInCm = convertFtToCm(parseFloat(inputFt.value));
  } else {
    heightInCm = parseFloat(inputHeight.value);
  }

  var weight = parseFloat(inputWeight.value);
  var age = parseFloat(inputAge.value);

  var bmr;

  if (selectedGender === 1) {
    bmr = bmrForMale(heightInCm, weight, age);
  } else {
    bmr = bmrForFemale(heightInCm, weight, age);
  }

  var tdee = calculateTdee(bmr, selectedExerciseLevel);

  var targetCalories;

  if (selectedGoal === 1) {
    targetCalories = tdee - 300;
  } else if (selectedGoal === 3) {
    targetCalories = tdee + 300;
  } else {
    targetCalories = tdee;
  }

  return {
    tdee: tdee,
    targetCalories: targetCalories,
    age: age,
    height: heightInCm,
    weight: weight
  };
}

function bmrForMale(h, w, a) {
  return 13.397 * w + 4.799 * h - 5.677 * a + 88.362;
}

function bmrForFemale(h, w, a) {
  return 9.247 * w + 3.098 * h - 4.33 * a + 447.593;
}

function calculateTdee(bmr, level) {
  if (level === 1) {
    return bmr * 1.5;
  } else if (level === 2) {
    return bmr * 1.75;
  } else {
    return bmr * 2.0;
  }
}

function convertFtToCm(ft) {
  return ft * 30.48;
}

function saveProfile(results) {
  var db = window.firebaseDB;
  var auth = window.firebaseAuth;
  var user = auth.currentUser;

  db.collection("users")
    .doc(user.uid)
    .set(
      {
        gender: selectedGender,
        exerciseLevel: selectedExerciseLevel,
        goal: selectedGoal,
        heightUnit: selectedHeightUnit,
        age: results.age,
        height: results.height,
        heightFt:
          selectedHeightUnit === "ft" ? parseFloat(inputFt.value) : null,
        weight: results.weight,
        tdee: results.tdee,
        targetCalories: results.targetCalories,
        nutrients: results.nutrients,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
}

function setupTooltip() {
  var infoButton = document.getElementById("info-button");
  var infoTooltip = document.getElementById("info-tooltip");

  if (infoButton && infoTooltip) {
    infoButton.removeEventListener("click", toggleInfoTooltip);
    infoButton.addEventListener("click", toggleInfoTooltip);
  }
}

function toggleInfoTooltip(event) {
  event.stopPropagation();
  var infoTooltip = document.getElementById("info-tooltip");
  if (infoTooltip) {
    infoTooltip.classList.toggle("hidden");
  }
}

document.addEventListener("click", function(event) {
  var infoButton = document.getElementById("info-button");
  var infoTooltip = document.getElementById("info-tooltip");

  if (!infoTooltip || infoTooltip.classList.contains("hidden")) {
    return;
  }

  var isClickInsideButton = false;
  if (infoButton) {
    isClickInsideButton = infoButton.contains(event.target);
  }
  var isClickInsideTooltip = infoTooltip.contains(event.target);

  if (!isClickInsideButton && !isClickInsideTooltip) {
    infoTooltip.classList.add("hidden");
  }
});

document.addEventListener("turbo:frame-load", function(event) {
  if (document.getElementById("user-gender-display")) {
    var auth = window.firebaseAuth;
    var db = window.firebaseDB;
    var user = auth.currentUser;

    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function(doc) {
        if (doc.exists) {
          populateUserData(doc.data());
        }
      });

    var editProfileButton = document.getElementById("edit-profile-button");
    if (editProfileButton) {
      editProfileButton.removeEventListener("click", handleEditProfileClick);
      editProfileButton.addEventListener("click", handleEditProfileClick);
    }
  }

  if (event.target && event.target.id === "tutorial") {
    updateVisibleElements();
    setupTooltip();
  }
});

function handleEditProfileClick(e) {
  e.preventDefault();

  anime({
    targets: "#icon-toolbar",
    translateY: [0, 50],
    opacity: [1, 0],
    delay: 0,
    duration: 500,
    easing: "easeOutExpo",
    complete: function() {
      Turbo.visit("overlays/tutorial.html", { frame: "tutorial" });

      var overlayFrame = document.getElementById("overlay");
      if (overlayFrame) {
        overlayFrame.innerHTML = "";
      }
    }
  });
}

function populateUserData(data) {
  var genderMap = {};
  genderMap[1] = "Male";
  genderMap[2] = "Female";

  var activityMap = {};
  activityMap[1] = "Rarely";
  activityMap[2] = "Occasionally";
  activityMap[3] = "Frequently";

  var goalMap = {};
  goalMap[1] = "Lose Weight";
  goalMap[2] = "Maintain Weight";
  goalMap[3] = "Gain Weight";

  var profileTitle = document.getElementById("profile-title");
  if (profileTitle) {
    profileTitle.textContent = data.name;
    if (!profileTitle.textContent) {
      profileTitle.textContent = "Your";
    }
    profileTitle.textContent += "'s Profile";
  }

  var genderDisplay = document.getElementById("user-gender-display");
  if (genderDisplay) {
    if (genderMap[data.gender]) {
      genderDisplay.textContent = genderMap[data.gender];
    } else {
      genderDisplay.textContent = "N/A";
    }
  }

  var ageDisplay = document.getElementById("user-age-display");
  if (ageDisplay) {
    if (data.age) {
      ageDisplay.textContent = data.age + " years";
    } else {
      ageDisplay.textContent = "N/A";
    }
  }

  var displayHeight = "N/A";
  if (data.heightUnit === "ft") {
    if (data.heightFt) {
      displayHeight = data.heightFt + " ft";
    }
  } else {
    if (data.height) {
      displayHeight = Math.round(data.height) + " cm";
    }
  }
  var heightDisplay = document.getElementById("user-height-display");
  if (heightDisplay) {
    heightDisplay.textContent = displayHeight;
  }

  var weightDisplay = document.getElementById("user-weight-display");
  if (weightDisplay) {
    if (data.weight) {
      weightDisplay.textContent = data.weight + " kg";
    } else {
      weightDisplay.textContent = "N/A";
    }
  }

  var activityDisplay = document.getElementById("user-activity-display");
  if (activityDisplay) {
    if (activityMap[data.exerciseLevel]) {
      activityDisplay.textContent = activityMap[data.exerciseLevel];
    } else {
      activityDisplay.textContent = "N/A";
    }
  }

  var goalDisplay = document.getElementById("user-goal-display");
  if (goalDisplay) {
    if (goalMap[data.goal]) {
      goalDisplay.textContent = goalMap[data.goal];
    } else {
      goalDisplay.textContent = "N/A";
    }
  }

  var caloriesDisplay = document.getElementById("user-calories-display");
  if (caloriesDisplay) {
    if (data.targetCalories) {
      caloriesDisplay.textContent = Math.round(data.targetCalories) + " kcal";
    } else {
      caloriesDisplay.textContent = "-- kcal";
    }
  }

  var streakDisplay = document.getElementById("user-streak-display");
  if (streakDisplay) {
    if (data.streak) {
      streakDisplay.textContent = data.streak + " days";
    } else {
      streakDisplay.textContent = "-- days";
    }
  }

  var joinDateDisplay = document.getElementById("user-join-date-display");
  if (joinDateDisplay) {
    if (data['join-date']) {
      joinDateDisplay.textContent = data['join-date'];
    } else {
      joinDateDisplay.textContent = "N/A";
    }
  }
}

document.addEventListener("DOMContentLoaded", function() {
  if (!document.documentElement.hasAttribute("data-turbo-preview")) {
    updateVisibleElements();
    setupTooltip();
  }
});

function calculateRecommendedNutrients(age, height, weight, gender, tdee) {
  var protein = weight * 1.0;
  var fat = (tdee * 0.25) / 9;
  var carb = (tdee * 0.55) / 4;
  var energy = tdee;
  var sugars = carb * 0.9;
  var fiber;

  if (gender === 1) {
    fiber = 21;
  } else {
    fiber = 18;
  }

  var nutrients = {};
  nutrients["Protein"] = protein;
  nutrients["Total lipid (fat)"] = fat;
  nutrients["Carbohydrate, by difference"] = carb;
  nutrients["Energy"] = energy;
  nutrients["Sugars, total including NLEA"] = sugars;
  nutrients["Fiber, total dietary"] = fiber;

  return nutrients;
}
