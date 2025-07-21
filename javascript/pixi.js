let pixiApp;
let pet;
let currentPetData;
let allTextures;
let petConfig;
let backgroundConfig;
let petState = "sitting";
let currentActiveSprite;
let blinkTimeout, walkTimeout;
let petSound;
let userDocUnsubscribe;

async function updatePetSprite(isInitialLoad = false, userData) {
  if (!pixiApp) return;

  const selectedPet = userData.selectedPet || "cat";
  const selectedBackground = userData.selectedBackground || "Blue Living Room";
  const healthStatus = userData.healthStatus || "Healthy";
  const tutorialIsComplete = userData.tutorialCompleted !== false;
  const statusBG = document.getElementById("pet-status-display");

  if (!tutorialIsComplete) {
    if (pet) {
      pet.visible = false;
    }
    return;
  } else if (pet) {
    pet.visible = true;
  }

  let finalPetType = selectedPet;
  statusBG.classList.remove("bg-green-500", "bg-red-500");
  statusBG.classList.add("bg-green-500");
  statusBG.textContent = `Pet Status: ${healthStatus}`;
  if (healthStatus === "Unhealthy") {
    finalPetType = `${selectedPet}_uh`;
    statusBG.classList.add("bg-red-500");
    statusBG.textContent = `Pet Status: ${healthStatus}`;
  }

  const newPetData = petConfig[finalPetType];

  if (
    !isInitialLoad &&
    newPetData.basePath === currentPetData.basePath &&
    newPetData.defaultSit === currentPetData.defaultSit
  ) {
    const yOffset = backgroundConfig[selectedBackground]?.[finalPetType] ?? 0;
    if (pet) pet.yOffset = yOffset;
    resizeSprite();
    return;
  }

  let lastX = pixiApp.screen.width / 2;
  if (currentActiveSprite) {
    lastX = currentActiveSprite.x;
  }

  if (pet) {
    clearTimeout(walkTimeout);
    clearTimeout(blinkTimeout);
    pixiApp.ticker.remove(movePet);
    pixiApp.stage.removeChild(currentActiveSprite);
    if (currentActiveSprite !== pet) pet.destroy();
    currentActiveSprite.destroy();
  }

  currentPetData = newPetData;

  const assetsToLoad = [
    currentPetData.basePath + currentPetData.defaultSit,
    currentPetData.basePath + currentPetData.interactTexture,
    currentPetData.sound,
  ];
  if (currentPetData.isAlwaysAnimated) {
    assetsToLoad.push(
      ...currentPetData.animationFrames.map((f) => currentPetData.basePath + f)
    );
  } else {
    assetsToLoad.push(
      ...currentPetData.blinkFrames.map((f) => currentPetData.basePath + f),
      ...currentPetData.walkFrames.map((f) => currentPetData.basePath + f)
    );
  }

  allTextures = await PIXI.Assets.load(assetsToLoad);
  petSound = new Howl({
    src: [currentPetData.sound],
    volume: currentPetData.volume,
  });

  if (currentPetData.isAlwaysAnimated) {
    const baseAnimationTextures = currentPetData.animationFrames.map(
      (f) => allTextures[currentPetData.basePath + f]
    );
    pet = new PIXI.AnimatedSprite(baseAnimationTextures);
    pet.animationSpeed = currentPetData.animationSpeed;
    pet.loop = true;
    pet.play();
  } else {
    const defaultSitTexture =
      allTextures[currentPetData.basePath + currentPetData.defaultSit];
    pet = new PIXI.Sprite(defaultSitTexture);
  }

  currentActiveSprite = pet;
  window.petSprite = pet;
  pet.interactive = true;
  pet.cursor = "pointer";
  pet.on("pointerdown", handleInteraction);

  const yOffset = backgroundConfig[selectedBackground]?.[finalPetType] ?? 0;
  pet.yOffset = yOffset;
  pet.x = lastX;

  resizeSprite();
  pixiApp.stage.addChild(pet);
  petState = "sitting";
  scheduleNextAction();
  setupPetInteraction();
}

function resizeSprite() {
  if (!pet || !currentPetData || !pixiApp) return;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const referenceTexture = currentPetData.isAlwaysAnimated ?
    allTextures[currentPetData.basePath + currentPetData.animationFrames[0]] :
    allTextures[currentPetData.basePath + currentPetData.defaultSit];

  if (!referenceTexture) return;

  const scaleX = windowWidth / referenceTexture.width;
  const scaleY = windowHeight / referenceTexture.height;
  const baseScale = Math.min(scaleX, scaleY) * 0.4;

  const yOffset = pet.yOffset || 0;

  currentActiveSprite.y = pixiApp.screen.height / 2 + 70 + yOffset;

  if (petState === "walking") {
    const walkScale = baseScale * currentPetData.walkScale;
    const walkDirection = currentActiveSprite.walkDirection || 1;
    currentActiveSprite.scale.x =
      currentPetData.flipMultiplier(walkDirection) * (walkScale * -1);
    currentActiveSprite.scale.y = walkScale;
    currentActiveSprite.y += currentPetData.walkOffsetY;
  } else {
    currentActiveSprite.scale.set(baseScale);
  }
  currentActiveSprite.anchor.set(0.5);
}
let messageOn = false;

function handleInteraction() {
  if (messageOn) return;
  messageOn = true;

  clearTimeout(blinkTimeout);
  clearTimeout(walkTimeout);
  pixiApp.ticker.remove(movePet);

  if (petState === "walking") {
    pet.x = currentActiveSprite.x;
    pixiApp.stage.removeChild(currentActiveSprite);
    pixiApp.stage.addChild(pet);
    currentActiveSprite = pet;
    resizeSprite();
  }

  petState = "interacting";
  Turbo.visit("/overlays/message.html", {
    frame: "messagebox"
  });

  if (currentPetData.isAlwaysAnimated) {
    currentActiveSprite.stop();
  }
  currentActiveSprite.texture =
    allTextures[currentPetData.basePath + currentPetData.interactTexture];
  petSound.play();

  setTimeout(() => {
    petState = "sitting";
    if (currentPetData.isAlwaysAnimated) {
      currentActiveSprite.textures = currentPetData.animationFrames.map(
        (f) => allTextures[currentPetData.basePath + f]
      );
      currentActiveSprite.play();
    } else {
      currentActiveSprite.texture =
        allTextures[currentPetData.basePath + currentPetData.defaultSit];
    }
    scheduleNextAction();
  }, 400);
}

document.addEventListener("turbo:frame-load", (event) => {
  const frame = event.target;

  if (frame.id === "messagebox") {
    frame.classList.remove("hidden");

    const dialogueDiv = frame.querySelector("#pet-text");
    if (dialogueDiv) {
      dialogueDiv.textContent = window.petDialogueMessage;
      animateTextInStage2(frame);
    }

    const navigateButton = frame.querySelector("#navigateBtn");
    if (navigateButton) {
      const newButton = navigateButton.cloneNode(true);
      navigateButton.parentNode.replaceChild(newButton, navigateButton);

      newButton.addEventListener(
        "click",
        async () => {
          messageOn = false;
          await resetAllIcons();
          frame.classList.add("hidden");
        }, {
          once: true
        }
      );
    }
  }
});

function scheduleNextAction() {
  clearTimeout(blinkTimeout);
  clearTimeout(walkTimeout);
  if (petState !== "sitting") return;

  const isWalkingLikely = Math.random() < 0.6;
  if (isWalkingLikely) {
    const delay = Math.random() * 2000 + 3000;
    walkTimeout = setTimeout(startWalkAnimation, delay);
  } else {
    if (!currentPetData.isAlwaysAnimated) {
      const delay = Math.random() * 2000 + 2000;
      blinkTimeout = setTimeout(startBlinkAnimation, delay);
    } else {
      setTimeout(scheduleNextAction, 5000);
    }
  }
}

function startBlinkAnimation() {
  if (petState !== "sitting") return;
  petState = "blinking";
  const blinkTextures = currentPetData.blinkFrames.map(
    (f) => allTextures[currentPetData.basePath + f]
  );
  const blinkSprite = new PIXI.AnimatedSprite(blinkTextures);
  blinkSprite.animationSpeed = 0.1;
  blinkSprite.loop = false;
  blinkSprite.anchor.copyFrom(pet.anchor);
  blinkSprite.scale.copyFrom(pet.scale);
  blinkSprite.position.copyFrom(pet.position);
  blinkSprite.on("pointerdown", handleInteraction);

  pixiApp.stage.removeChild(currentActiveSprite);
  pixiApp.stage.addChild(blinkSprite);
  currentActiveSprite = blinkSprite;

  blinkSprite.play();
  blinkSprite.onComplete = () => {
    petState = "sitting";
    pixiApp.stage.removeChild(currentActiveSprite);
    pixiApp.stage.addChild(pet);
    currentActiveSprite = pet;
    scheduleNextAction();
  };
}

function startWalkAnimation() {
  if (petState !== "sitting") return;
  petState = "walking";

  const walkTextures = currentPetData.walkFrames.map(
    (f) => allTextures[currentPetData.basePath + f]
  );
  const walkSprite = new PIXI.AnimatedSprite(walkTextures);
  walkSprite.animationSpeed = 0.15;
  walkSprite.loop = true;
  walkSprite.anchor.copyFrom(pet.anchor);
  walkSprite.x = pet.x;
  walkSprite.y = pet.y;
  walkSprite.on("pointerdown", handleInteraction);

  const walkDirection = Math.random() < 0.5 ? 1 : -1;
  walkSprite.walkDirection = walkDirection;

  pixiApp.stage.removeChild(currentActiveSprite);
  pixiApp.stage.addChild(walkSprite);
  currentActiveSprite = walkSprite;

  resizeSprite();

  walkSprite.play();
  pixiApp.ticker.add(movePet);

  const walkDuration = Math.random() * 2000 + 2000;
  walkTimeout = setTimeout(endWalkAnimation, walkDuration);
}

function movePet() {
  if (petState !== "walking") {
    pixiApp.ticker.remove(movePet);
    return;
  }
  const walkSpeed = 0.5;
  currentActiveSprite.x += currentActiveSprite.walkDirection * walkSpeed;
  const halfWidth = currentActiveSprite.width / 2;
  if (
    currentActiveSprite.x - halfWidth < 0 ||
    currentActiveSprite.x + halfWidth > pixiApp.screen.width
  ) {
    endWalkAnimation();
  }
}

function endWalkAnimation() {
  if (petState !== "walking") return;

  pixiApp.ticker.remove(movePet);
  clearTimeout(walkTimeout);

  pet.x = currentActiveSprite.x;
  pixiApp.stage.removeChild(currentActiveSprite);
  pixiApp.stage.addChild(pet);
  currentActiveSprite = pet;

  petState = "sitting";
  resizeSprite();
  scheduleNextAction();
}

async function initializePixiApp() {
  if (pixiApp) return;

  pixiApp = new PIXI.Application();
  await pixiApp.init({
    width: 800,
    height: 600,
    backgroundAlpha: 0,
  });
  const container = document.getElementById("pixi-container");
  if (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(pixiApp.canvas);

  petConfig = {
    cat: {
      basePath: "graphics/cat/",
      defaultSit: "sit/sprite_0.png",
      blinkFrames: ["sit/sprite_1.png", "sit/sprite_2.png", "sit/sprite_3.png"],
      walkFrames: [
        "walk/sprite_0.png",
        "walk/sprite_1.png",
        "walk/sprite_2.png",
        "walk/sprite_3.png",
        "walk/sprite_4.png",
        "walk/sprite_5.png",
        "walk/sprite_6.png",
        "walk/sprite_7.png",
      ],
      interactTexture: "cat_heart.png",
      sound: "sounds/meow.mp3",
      volume: 1.0,
      walkOffsetY: 20,
      walkScale: 0.5,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: false,
    },
    cat_uh: {
      basePath: "graphics/cat/",
      defaultSit: "sit_uh/sprite_0.png",
      blinkFrames: [
        "sit_uh/sprite_1.png",
        "sit_uh/sprite_2.png",
        "sit_uh/sprite_3.png",
        "sit_uh/sprite_4.png",
        "sit_uh/sprite_5.png",
      ],
      walkFrames: [
        "walk_uh/sprite_0.png",
        "walk_uh/sprite_1.png",
        "walk_uh/sprite_2.png",
        "walk_uh/sprite_3.png",
        "walk_uh/sprite_4.png",
        "walk_uh/sprite_5.png",
      ],
      interactTexture: "cat_sad.png",
      sound: "sounds/meow.mp3",
      volume: 1.0,
      walkOffsetY: 20,
      walkScale: 0.5,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: false,
    },
    bunny: {
      basePath: "graphics/rabbit/",
      defaultSit: "sit/sprite_1.png",
      blinkFrames: [
        "sit/sprite_2.png",
        "sit/sprite_3.png",
        "sit/sprite_4.png",
        "sit/sprite_5.png",
        "sit/sprite_6.png",
      ],
      walkFrames: [
        "jump/sprite_0.png",
        "jump/sprite_1.png",
        "jump/sprite_2.png",
        "jump/sprite_3.png",
        "jump/sprite_4.png",
        "jump/sprite_5.png",
        "jump/sprite_6.png",
        "jump/sprite_7.png",
        "jump/sprite_8.png",
      ],
      interactTexture: "rabbit_heart.png",
      sound: "sounds/squeak.mp3",
      volume: 2.0,
      walkOffsetY: 0,
      walkScale: 1.0,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: false,
    },
    bunny_uh: {
      basePath: "graphics/rabbit/",
      defaultSit: "sit_uh/sprite_0.png",
      blinkFrames: [
        "sit_uh/sprite_1.png",
        "sit_uh/sprite_2.png",
        "sit_uh/sprite_3.png",
        "sit_uh/sprite_4.png",
        "sit_uh/sprite_5.png",
      ],
      walkFrames: [
        "walk_uh/sprite_0.png",
        "walk_uh/sprite_1.png",
        "walk_uh/sprite_2.png",
        "walk_uh/sprite_3.png",
        "walk_uh/sprite_4.png",
        "walk_uh/sprite_5.png",
      ],
      interactTexture: "rabbit_sad.png",
      sound: "sounds/squeak.mp3",
      volume: 2.0,
      walkOffsetY: 0,
      walkScale: 1.0,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: false,
    },
    slime: {
      basePath: "graphics/slime/",
      animationFrames: [
        "h/sprite_0.png",
        "h/sprite_1.png",
        "h/sprite_2.png",
        "h/sprite_3.png",
        "h/sprite_4.png",
        "h/sprite_5.png",
        "h/sprite_6.png",
      ],
      defaultSit: "h/sprite_0.png",
      blinkFrames: [],
      walkFrames: [],
      interactTexture: "slime_heart.png",
      sound: "sounds/squish.mp3",
      volume: 0.7,
      walkOffsetY: 0,
      walkScale: 1.0,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: true,
      animationSpeed: 0.08,
    },
    slime_uh: {
      basePath: "graphics/slime/",
      animationFrames: [
        "uh/sprite_0.png",
        "uh/sprite_1.png",
        "uh/sprite_2.png",
        "uh/sprite_3.png",
        "uh/sprite_4.png",
        "uh/sprite_5.png",
      ],
      defaultSit: "uh/sprite_0.png",
      blinkFrames: [],
      walkFrames: [],
      interactTexture: "slime_sad.png",
      sound: "sounds/squish.mp3",
      volume: 0.7,
      walkOffsetY: 0,
      walkScale: 1.0,
      flipMultiplier: (d) => (d === 1 ? 1 : -1),
      isAlwaysAnimated: true,
      animationSpeed: 0.08,
    },
  };

  backgroundConfig = {
    "Blue Living Room": {
      cat: -115,
      bunny: -75,
      slime: -125,
      cat_uh: -115,
      bunny_uh: -75,
      slime_uh: -125,
    },
    "Pink Bedroom": {
      cat: -75,
      bunny: 20,
      slime: -40,
      cat_uh: -75,
      bunny_uh: 20,
      slime_uh: -40,
    },
    "Grey Living Room": {
      cat: 35,
      bunny: 70,
      slime: 25,
      cat_uh: 35,
      bunny_uh: 70,
      slime_uh: 25,
    },
    "Gamer's Room": {
      cat: 125,
      bunny: 165,
      slime: 105,
      cat_uh: 125,
      bunny_uh: 165,
      slime_uh: 105,
    },
    "Medieval Castle": {
      cat: 40,
      bunny: 75,
      slime: 35,
      cat_uh: 40,
      bunny_uh: 75,
      slime_uh: 35,
    },
  };

  window.addEventListener("resize", resizeSprite);

  const user = window.firebaseAuth.currentUser;
  if (user) {
    const userDocRef = window.firebaseDB.collection("users").doc(user.uid);
    if (userDocUnsubscribe) userDocUnsubscribe();
    userDocUnsubscribe = userDocRef.onSnapshot((doc) => {
      if (doc.exists) {
        updatePetSprite(false, doc.data());
      }
    });
  }

  document.addEventListener("turbo:frame-load", () => {
    const user = window.firebaseAuth.currentUser;
    if (user) {
      window.firebaseDB
        .collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) updatePetSprite(false, doc.data());
        });
    }
  });

  const initialDoc = await window.firebaseDB
    .collection("users")
    .doc(user.uid)
    .get();
  if (initialDoc.exists) {
    await updatePetSprite(true, initialDoc.data());
  }
}

window.firebaseAuth.onAuthStateChanged(async (user) => {
  if (user) {
    initializePixiApp();
  } else {
    if (userDocUnsubscribe) userDocUnsubscribe();
  }
});