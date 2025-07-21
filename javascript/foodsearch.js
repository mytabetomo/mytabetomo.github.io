document.addEventListener("turbo:frame-load", function() {
  const apiKey = "uZgIcWOqIXPzqv088K7DATaGeGuG7YYuWfzdFns9";
  var foodCache = [];
  var mealItemsData = [];

  var submitSound = new Howl({
    src: ["sounds/ding.mp3"],
    volume: 0.5,
  });

  function getFoodFromCache(fdcId) {
    for (var i = 0; i < foodCache.length; i++) {
      if (foodCache[i].fdcId == fdcId) {
        return foodCache[i];
      }
    }
    return null;
  }

  function searchFood() {
    const searchInput = document.getElementById("foodSearchInput");
    const resultsDiv = document.getElementById("results");

    var query = searchInput.value.trim();
    if (query == "") {
      resultsDiv.innerHTML =
        '<p class="text-red-600 font-bold text-center">Please enter a food to search.</p>';
      return;
    }

    resultsDiv.innerHTML =
      '<p class="text-gray-600 text-center">Loading...</p>';
    foodCache.length = 0;

    var searchUrl =
      "https://api.nal.usda.gov/fdc/v1/foods/search?api_key=" +
      apiKey +
      "&query=" +
      encodeURIComponent(query);

    fetch(searchUrl)
      .then(function(response) {
        return response.json();
      })
      .then(function(searchData) {
        var foodItems = searchData.foods.slice(0, 5);
        var detailPromises = [];

        for (var i = 0; i < foodItems.length; i++) {
          var food = foodItems[i];
          var detailUrl =
            "https://api.nal.usda.gov/fdc/v1/food/" +
            food.fdcId +
            "?api_key=" +
            apiKey;
          detailPromises.push(
            fetch(detailUrl).then(function(res) {
              return res.json();
            })
          );
        }

        Promise.all(detailPromises).then(function(fullFoodDataArray) {
          var html = "";

          for (var i = 0; i < fullFoodDataArray.length; i++) {
            var fullFoodData = fullFoodDataArray[i];
            foodCache.push(fullFoodData);

            var portionOptionsHtml = "";
            var j = 0;

            if (fullFoodData.foodPortions.length > 0) {
              var portions = fullFoodData.foodPortions.slice(0, 5);
              for (j = 0; j < portions.length; j++) {
                var portion = portions[j];
                if (portion.gramWeight) {
                  var unitName = portion.measureUnit.name;
                  if (!unitName) {
                    unitName = "";
                  }

                  if (unitName.toLowerCase() == "undetermined") {
                    unitName = portion.portionDescription;
                    if (!unitName) {
                      unitName = portion.modifier;
                      if (!unitName) {
                        unitName = "";
                      }
                    }
                  }
                  var cleanUnitName = unitName.replace(/^"+|"+$/g, "").trim();
                  var amount = portion.amount;
                  if (!amount) {
                    amount = 1;
                  }

                  var label =
                    amount +
                    " " +
                    cleanUnitName +
                    " (" +
                    portion.gramWeight +
                    " g)";
                  if (j == 0) {
                    portionOptionsHtml +=
                      '<option value="' +
                      portion.gramWeight +
                      '" selected>' +
                      label +
                      "</option>";
                  } else {
                    portionOptionsHtml +=
                      '<option value="' + portion.gramWeight + '">' + label + "</option>";
                  }
                }
              }
            } else if (fullFoodData.servingSize) {
              var label2 =
                fullFoodData.servingSize +
                " " +
                fullFoodData.servingSizeUnit.toLowerCase();
              portionOptionsHtml +=
                '<option value="' + fullFoodData.servingSize * 1 + '">' + label2 + "</option>";
            } else {
              portionOptionsHtml += '<option value="100">100 g (default)</option>';
            }

            var nutrientsHtml = "";
            var nutrientsToDisplay = [
              "Protein",
              "Total lipid (fat)",
              "Carbohydrate, by difference",
              "Energy",
              "Sugars, total including NLEA",
              "Fiber, total dietary",
            ];
            if (fullFoodData.foodNutrients.length > 0) {
              nutrientsHtml += '<ul class="list-none p-0 mt-3">';
              for (j = 0; j < fullFoodData.foodNutrients.length; j++) {
                var nutrient = fullFoodData.foodNutrients[j];
                if (
                  nutrientsToDisplay.indexOf(nutrient.nutrient.name) !== -1
                ) {
                  var nutrientAmount = nutrient.amount;
                  if (!nutrientAmount) {
                    nutrientAmount = 0;
                  }
                  var nutrientUnit = nutrient.nutrient.unitName;
                  if (!nutrientUnit) {
                    nutrientUnit = "";
                  }
                  nutrientsHtml +=
                    '<li class="mb-1 text-sm"><strong>' +
                    nutrient.nutrient.name +
                    ":</strong> " +
                    nutrientAmount +
                    nutrientUnit +
                    "</li>";
                }
              }
              nutrientsHtml += "</ul>";
            }

            html +=
              '<div class="bg-gray-50 border border-gray-200 p-4 mb-4 rounded-md text-left">';
            html +=
              '<h2 class="mt-0 text-xl font-semibold text-gray-800">' +
              fullFoodData.description;
            if (fullFoodData.brandOwner) {
              html += " - " + fullFoodData.brandOwner;
            }
            if (fullFoodData.dataType) {
              html += " (" + fullFoodData.dataType + ")";
            }
            html += "</h2>";
            html += nutrientsHtml;
            html +=
              '<p class="mt-2 text-sm text-gray-700 font-semibold">Select Portion Size:</p>';
            html +=
              '<select class="portion-select border border-gray-300 rounded p-1 text-sm w-full max-w-xs mt-1" data-fdcid="' +
              fullFoodData.fdcId +
              '">' +
              portionOptionsHtml +
              "</select>";
            html +=
              '<button class="add-to-meal-btn mt-3 px-4 py-2 bg-green-500 text-white rounded-md text-sm" data-fdcid="' +
              fullFoodData.fdcId +
              '">Add to Meal</button>';
            html += "</div>";
          }

          resultsDiv.innerHTML = html;
        });
      });
  }

  function addToMeal(food) {
    var currentMealList = document.getElementById("currentMealList");
    for (var i = 0; i < mealItemsData.length; i++) {
      if (mealItemsData[i].fdcId == food.fdcId) return;
    }

    if (food.portionSize) {} else {
      food.portionSize = 100;
    }
    food.portionCount = 1;

    mealItemsData.push(food);

    var noMealItemsElem = document.getElementById("noMealItems");
    noMealItemsElem.parentNode.removeChild(noMealItemsElem);


    var listItem = document.createElement("li");
    listItem.className =
      "bg-blue-50 border border-blue-200 p-3 mb-2 rounded-md flex justify-between items-center text-blue-800";
    listItem.dataset.fdcId = food.fdcId;
    listItem.innerHTML =
      '<span>' +
      food.description +
      "</span>" +
      '<div class="portion-controls flex items-center space-x-1 ml-2">' +
      '<button class="decrement-portion-btn bg-gray-300 rounded px-2 py-0.5 text-sm select-none">-</button>' +
      '<input type="number" min="1" class="portion-count-input w-12 text-center text-sm border rounded px-1 py-0.5" value="1" />' +
      '<button class="increment-portion-btn bg-gray-300 rounded px-2 py-0.5 text-sm select-none">+</button>' +
      '<span class="ml-1 text-gray-600 text-xs">portion(s)</span>' +
      "</div>" +
      '<button class="remove-from-meal-btn text-red-500 hover:text-red-700 text-sm font-semibold ml-4">Remove</button>';

    currentMealList.appendChild(listItem);
    updateTotalNutrients();
  }

  function normalizeNutrientName(name) {
    var lowerName = name.toLowerCase();

    if (lowerName.includes("energy") || lowerName.includes("calorie")) {
      return "Energy";
    }
    if (lowerName.includes("protein")) {
      return "Protein";
    }
    if (lowerName.includes("total lipid") || lowerName.includes("fat")) {
      return "Total lipid (fat)";
    }
    if (lowerName.includes("carbohydrate")) {
      return "Carbohydrate, by difference";
    }
    if (lowerName.includes("sugar")) {
      return "Sugars, total including NLEA";
    }
    if (lowerName.includes("fiber")) {
      return "Fiber, total dietary";
    }

    return name;
  }

  function updateTotalNutrients() {
    var totals = {};
    var essentialNutrients = [
      "Energy",
      "Protein",
      "Total lipid (fat)",
      "Carbohydrate, by difference",
      "Sugars, total including NLEA",
      "Fiber, total dietary",
    ];

    for (var i = 0; i < mealItemsData.length; i++) {
      var item = mealItemsData[i];
      var portionSize = item.portionSize;
      if (!portionSize) {
        portionSize = 100;
      }
      var portionCount = item.portionCount;
      if (!portionCount) {
        portionCount = 1;
      }

      var portionFactor = (portionSize * portionCount) / 100;

      for (var j = 0; j < item.foodNutrients.length; j++) {
        var nutrient = item.foodNutrients[j];
        var name = normalizeNutrientName(nutrient.nutrient.name);

        if (essentialNutrients.indexOf(name) !== -1) {
          if (!totals[name]) {
            var unitName = nutrient.nutrient.unitName;
            if (!unitName) {
              unitName = "";
            }
            totals[name] = {
              value: 0,
              unitName: unitName
            };
          }
          var amount = nutrient.amount;
          if (!amount) {
            amount = 0;
          }
          totals[name].value += amount * portionFactor;
        }
      }
    }
    return totals;
  }

  document.getElementById("searchButton").addEventListener("click", searchFood);

  document
    .getElementById("foodSearchInput")
    .addEventListener("keypress", function(event) {
      if (event.key == "Enter") {
        event.preventDefault();
        searchFood();
      }
    });

  document.getElementById("results").addEventListener("click", function(event) {
    if (event.target.classList.contains("add-to-meal-btn")) {
      var fdcId = parseInt(event.target.dataset.fdcid, 10);
      var foodData = getFoodFromCache(fdcId);

      var container = event.target.closest("div");
      var portionSelect = container.querySelector(".portion-select");
      var portionValue = parseFloat(portionSelect.value);
      if (!portionValue) {
        portionValue = 100;
      }
      foodData.portionSize = portionValue;
      addToMeal(foodData);
    }
  });

  var currentMealList = document.getElementById("currentMealList");

  currentMealList.addEventListener("click", function(event) {
    if (event.target.classList.contains("remove-from-meal-btn")) {
      var listItem = event.target.closest("li");
      var fdcIdToRemove = parseInt(listItem.dataset.fdcId, 10);

      var newMealItemsData = [];
      for (var i = 0; i < mealItemsData.length; i++) {
        if (mealItemsData[i].fdcId !== fdcIdToRemove) {
          newMealItemsData.push(mealItemsData[i]);
        }
      }
      mealItemsData = newMealItemsData;

      listItem.remove();

      if (currentMealList.children.length === 0) {
        var msg = document.createElement("li");
        msg.id = "noMealItems";
        msg.className = "text-gray-500 text-sm";
        msg.textContent = "No items added to your meal yet.";
        currentMealList.appendChild(msg);
      }
      updateTotalNutrients();
    }

    if (
      event.target.classList.contains("increment-portion-btn") ||
      event.target.classList.contains("decrement-portion-btn")
    ) {
      var listItem = event.target.closest("li");
      var fdcId = parseInt(listItem.dataset.fdcId, 10);
      var portionInput = listItem.querySelector(".portion-count-input");

      for (var i = 0; i < mealItemsData.length; i++) {
        if (mealItemsData[i].fdcId === fdcId) {
          var currentCount = mealItemsData[i].portionCount;
          if (!currentCount) {
            currentCount = 1;
          }
          if (event.target.classList.contains("increment-portion-btn")) {
            currentCount++;
          } else if (event.target.classList.contains("decrement-portion-btn")) {
            currentCount = currentCount - 1;
            if (currentCount < 1) {
              currentCount = 1;
            }
          }
          mealItemsData[i].portionCount = currentCount;
          portionInput.value = currentCount;
          break;
        }
      }
      updateTotalNutrients();
    }
  });

  currentMealList.addEventListener("input", function(event) {
    if (event.target.classList.contains("portion-count-input")) {
      var listItem = event.target.closest("li");
      var fdcId = parseInt(listItem.dataset.fdcId, 10);
      var newCount = parseInt(event.target.value, 10);

      for (var i = 0; i < mealItemsData.length; i++) {
        if (mealItemsData[i].fdcId === fdcId) {
          mealItemsData[i].portionCount = newCount;
          break;
        }
      }
      updateTotalNutrients();
    }
  });

  document.getElementById("submitMealButton").addEventListener("click", function() {
    var nutrientTotals = updateTotalNutrients();
    var totalKeys = Object.keys(nutrientTotals);

    if (totalKeys.length > 0) {
      submitSound.play();
      anime({
        targets: "#icon-shell-2",
        scale: [1.3, 1],
        duration: 100,
        easing: "easeOutExpo",
      });

      var mealItemNames = [];
      for (var i = 0; i < mealItemsData.length; i++) {
        mealItemNames.push(mealItemsData[i].description);
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const localDateString = year + "-" + month + "-" + day;


      db.collection("users")
        .doc(user.uid)
        .collection("meals")
        .add({
          nutrients: nutrientTotals,
          items: mealItemNames,
          date: localDateString,
        });
    }

    resetAllIcons();
  });

  updateTotalNutrients();
});