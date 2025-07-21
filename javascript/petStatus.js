window.petDialogueMessage = "What are we eating today?";

function getCharacterLine(totalNutrients, targetNutrients) {
  const foodSuggestions = {
    Protein: ["meat", "fish", "eggs", "beans", "tofu"],
    "Carbohydrate, by difference": ["bread", "pasta", "rice", "potatoes"],
    "Total lipid (fat)": ["nuts", "olive oil", "avocado", "seeds"],
    "Sugars, total including NLEA": ["fruits", "honey", "juice", "candy"],
    "Fiber, total dietary": ["beans", "broccoli", "berries", "avocados", "popcorn"],
  };

  const excessGroups = [];
  for (const group in targetNutrients) {
    if (group === "Energy") {
      continue;
    }
    var grams = 0;
    if (totalNutrients[group]) {
      grams = totalNutrients[group].value;
    }
    const target = targetNutrients[group];
    if (!target) {
      continue;
    }

    const percent = (grams / target) * 100;
    if (percent > 150) {
      let simpleName = group;
      if (group === "Carbohydrate, by difference") {
        simpleName = "carbs";
      } else if (group === "Total lipid (fat)") {
        simpleName = "fats";
      } else if (group === "Sugars, total including NLEA") {
        simpleName = "sugar";
      } else if (group === "Fiber, total dietary") {
        simpleName = "fiber";
      } else {
        simpleName = simpleName.toLowerCase();
      }
      excessGroups.push(simpleName);
    }
  }

  let direStraights = false;
  const cravings = [];

  for (let group in foodSuggestions) {
    var grams = 0;
    if (totalNutrients[group]) {
      grams = totalNutrients[group].value;
    }
    const target = targetNutrients[group];
    if (!target) {
      continue;
    }

    const percent = (grams / target) * 100;

    if (percent > 90) {} else if (percent > 50) {
      cravings.push(group);
    } else {
      cravings.push(group);
      direStraights = true;
    }
  }

  if (cravings.length === 0 && excessGroups.length === 0) {
    return "I feel amazing! Woohoo!";
  }

  for (var i = cravings.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = cravings[i];
    cravings[i] = cravings[j];
    cravings[j] = temp;
  }
  const selectedCravings = cravings.slice(0, 2);

  var foodList = [];
  for (var i = 0; i < selectedCravings.length; i++) {
    var group = selectedCravings[i];
    if (group === "Carbohydrate, by difference") {
      foodList.push("carbs");
    } else if (group === "Total lipid (fat)") {
      foodList.push("fats");
    } else if (group === "Sugars, total including NLEA") {
      foodList.push("sugar");
    } else if (group === "Fiber, total dietary") {
      foodList.push("fiber");
    } else {
      foodList.push(group.toLowerCase());
    }
  }

  const petName = "I";

  let cravingMessage = "";
  if (foodList.length === 1) {
    if (direStraights) {
      cravingMessage = petName + " really need more " + foodList[0] + "!";
    } else {
      cravingMessage = petName + "'m craving some " + foodList[0] + ".";
    }
  } else if (foodList.length === 2) {
    if (direStraights) {
      cravingMessage =
        petName + " really need more " + foodList[0] + " and " + foodList[1] + "!";
    } else {
      cravingMessage =
        petName + "'m' craving some " + foodList[0] + " and " + foodList[1] + ".";
    }
  } else {
    cravingMessage = petName + "'m feeling good!";
  }

  let combinedSuggestions = [];
  for (var i = 0; i < selectedCravings.length; i++) {
    var group = selectedCravings[i];
    if (foodSuggestions[group]) {
      combinedSuggestions = combinedSuggestions.concat(foodSuggestions[group]);
    }
  }

  function pickDistinct(arr, n) {
    const result = [];
    const usedIndices = {};
    let tries = 0;
    while (result.length < n && tries < arr.length * 2) {
      const idx = Math.floor(Math.random() * arr.length);
      if (!usedIndices[idx]) {
        usedIndices[idx] = true;
        result.push(arr[idx]);
      }
      tries++;
    }
    return result;
  }

  const distinctFoods = pickDistinct(combinedSuggestions, 3);
  const food1 = distinctFoods[0];
  const food2 = distinctFoods[1];
  const food3 = distinctFoods[2];

  cravingMessage += " Can we eat some " + food1 + ", " + food2 + ", or " + food3 + "?";

  var excessMessages = [];
  for (var i = 0; i < excessGroups.length; i++) {
    var group = excessGroups[i];
    excessMessages.push("I ate too much " + group + ", I don't feel well.");
  }

  const possibleMessages = [];
  if (excessMessages.length > 0) {
    for (var i = 0; i < excessMessages.length; i++) {
      possibleMessages.push(excessMessages[i]);
    }
  }
  if (cravings.length > 0) {
    possibleMessages.push(cravingMessage);
  }

  if (possibleMessages.length === 0) {
    return "I feel amazing! Woohoo!";
  }

  const selectedMessage =
    possibleMessages[Math.floor(Math.random() * possibleMessages.length)];

  return selectedMessage;
}

async function judgeUser(user, db, totalNutrients, targetNutrients) {
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
    var targetVal = 0;
    if (targetNutrients[key]) {
        targetVal = targetNutrients[key];
    }
    
    var actualVal = 0;
    if (totalNutrients[key]) {
        actualVal = totalNutrients[key].value;
    }

    var truePercent;
    if (targetVal > 0) {
      truePercent = (actualVal / targetVal) * 100;
    } else {
      truePercent = 0;
    }

    const isWithinTarget = truePercent >= 90 && truePercent <= 110;

    var multiplier;
    if (key === "Energy") {
      multiplier = 5;
    } else {
      multiplier = 1;
    }

    var direction;
    if (isWithinTarget) {
      direction = 1;
    } else {
      direction = -1;
    }
    score += multiplier * direction;
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
    .set({
      daysStatus: daysStatus,
      updatedAt: new Date().toISOString(),
    }, {
      merge: true
    });

  const pastDates = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    pastDates.push(
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
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

  window.petDialogueMessage = getCharacterLine(totalNutrients, targetNutrients);
  await userDocRef.set({
    healthStatus: newHealthStatus,
    dialogue: window.petDialogueMessage,
  }, {
    merge: true
  });

  return newHealthStatus;
}

window.judgeUser = judgeUser;
window.petDialogueMessage = window.petDialogueMessage;

document.addEventListener("turbo:frame-load", async function (event) {
  const frame = event.target;
  const user = window.firebaseAuth.currentUser;
  const totalNutrients = window.latestTotalNutrients;
  const targetNutrients = window.targetNutrients;

  await judgeUser(user, window.firebaseDB, totalNutrients, targetNutrients);

  const dialogueDiv = frame.querySelector("#pet-text");
  dialogueDiv.textContent = window.petDialogueMessage;
});