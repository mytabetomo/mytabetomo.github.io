document.addEventListener("turbo:frame-load", function () {
  const mealsList = document.getElementById("mealsList");
  const noMealsMessage = document.getElementById("noMeals");
  const mealTemplate = document.getElementById("meal-template");

  auth.onAuthStateChanged(function (user) {
    const db = firebase.firestore();
    const mealsCollectionRef = db
      .collection("users")
      .doc(user.uid)
      .collection("meals");
    const today = new Date();
    const localDateString =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    mealsCollectionRef
      .where("date", "==", localDateString)
      .get()
      .then(function (querySnapshot) {
        mealsList.innerHTML = "";
        if (querySnapshot.empty) {
          noMealsMessage.style.display = "block";
        } else {
          noMealsMessage.style.display = "none";
          var docs = querySnapshot.docs;
          for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            const meal = {
              id: doc.id,
              ...doc.data()
            };

            var mealItems;
            if (meal.items) {
              mealItems = meal.items.join(", ");
            } else {
              mealItems = "No items listed";
            }

            const newListItem = mealTemplate.cloneNode(true);
            newListItem.style.display = "";
            newListItem.setAttribute("data-meal-id", meal.id);

            newListItem.querySelector(".meal-items-p").textContent = mealItems;
            newListItem
              .querySelector(".remove-meal-btn")
              .setAttribute("data-meal-id", meal.id);

            const nutrientListUl = newListItem.querySelector(".nutrient-list-ul");
            nutrientListUl.innerHTML = "";
            for (const name in meal.nutrients) {
              const data = meal.nutrients[name];
              const nutrientLi = document.createElement("li");
              nutrientLi.textContent =
                name + ": " + data.value.toFixed(2) + " " + data.unitName;
              nutrientListUl.appendChild(nutrientLi);
            }

            mealsList.appendChild(newListItem);
          }
        }
      });

    mealsList.addEventListener("click", function (event) {
      if (event.target.matches(".remove-meal-btn")) {
        const mealId = event.target.getAttribute("data-meal-id");

        mealsCollectionRef
          .doc(mealId)
          .delete()
          .then(function () {
            document.querySelector('li[data-meal-id="' + mealId + '"]').remove();
            if (mealsList.children.length === 0) {
              noMealsMessage.style.display = "block";
            }
          });
      }
    });
  });
});