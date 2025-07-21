document.addEventListener("turbo:frame-load", function () {
  auth.onAuthStateChanged(function (user) {
    const userDocRef = db.collection("users").doc(user.uid);

    userDocRef.get().then(function (userDoc) {
      var caloriesForRDI;
      const userData = userDoc.data();

      if (userData.targetCalories) {
        caloriesForRDI = userData.targetCalories;
      } else if (userData.tdee) {
        caloriesForRDI = userData.tdee;
      } else {
        caloriesForRDI = 2000;
      }

      const rdi = getAdjustedRDI(caloriesForRDI);

      const mealsData = userDocRef.collection("meals");
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const localDateString = year + "-" + month + "-" + day;

      mealsData
        .where("date", "==", localDateString)
        .get()
        .then(function (querySnapshot) {
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

          window.handleNutrientTotals(summedTotals, rdi);
          window.judgeUser(user, db, summedTotals, rdi);
        });
    });
  });

  window.handleNutrientTotals = function (totals, rdi) {
    const container = document.getElementById("progressBars");
    container.innerHTML = "";

    if (Object.keys(totals).length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 text-sm">No nutrient data for today.</p>';
      return;
    }

    function createPieChart(label, value, unit, recommended) {
      var truePercent;
      if (recommended > 0) {
        truePercent = (value / recommended) * 100;
      } else {
        truePercent = 0;
      }

      const roundedTruePercent = Math.round(truePercent);
      const visualPercent = Math.min(roundedTruePercent, 100);
      const valueText =
        value.toFixed(1) + " / " + recommended.toFixed(0) + " " + unit;

      let colorClass = "progress-low";
      if (truePercent >= 150) {
        colorClass = "progress-extreme";
      } else if (truePercent >= 67) {
        colorClass = "progress-high";
      } else if (truePercent >= 34) {
        colorClass = "progress-medium";
      }

      const wrapper = document.createElement("div");
      wrapper.style.cssText =
        "display: inline-block; text-align: center; margin: 0 1rem;";

      const pie = document.createElement("div");
      pie.className = "progress-pie " + colorClass;
      pie.setAttribute("data-value", visualPercent.toString());
      pie.setAttribute("data-text-value", roundedTruePercent.toString());

      const labelDiv = document.createElement("div");
      labelDiv.className = "text-xs mt-2 font-bold text-black";
      labelDiv.textContent = label;

      const valueDiv = document.createElement("div");
      valueDiv.className = "text-xs text-gray-600";
      valueDiv.textContent = valueText;

      wrapper.append(pie, labelDiv, valueDiv);
      return wrapper;
    }

    const macros = [
      "Energy",
      "Protein",
      "Total lipid (fat)",
      "Carbohydrate, by difference",
      "Sugars, total including NLEA",
      "Fiber, total dietary",
    ];

    for (var i = 0; i < macros.length; i++) {
      var nutrient = macros[i];
      var data;
      if (totals[nutrient]) {
        data = totals[nutrient];
      } else {
        var defaultUnit;
        if (nutrient === "Energy") {
          defaultUnit = "kcal";
        } else {
          defaultUnit = "g";
        }
        data = {
          value: 0,
          unitName: defaultUnit
        };
      }
      container.appendChild(
        createPieChart(nutrient, data.value, data.unitName, rdi[nutrient])
      );
    }
  };

  function getAdjustedRDI(calories) {
    const rdi = {
      Energy: calories,
      Protein: (calories * 0.2) / 4,
      "Total lipid (fat)": (calories * 0.25) / 9,
      "Carbohydrate, by difference": (calories * 0.55) / 4,
      "Sugars, total including NLEA": (calories * 0.1) / 4,
      "Fiber, total dietary": (calories / 1000) * 14,
    };
    return rdi;
  }
});