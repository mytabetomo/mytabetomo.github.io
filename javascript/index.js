let intro = new Howl({
  src: ["sounds/createintro.mp3"],
  onend: function() {
    bgm.play();
  },
});

let bgm = new Howl({
  src: ["sounds/createpet.mp3"],
  loop: true,
});

let click = new Howl({
  src: ["sounds/click.mp3"],
});
click.volume(0.5);

document.getElementById("click-screen").addEventListener("click", function() {
  anime({
    targets: document.getElementById("click-screen"),
    opacity: [1, 0],
    duration: 200,
    easing: "easeOutQuad",
    complete: function() {
      document.getElementById("click-screen").remove();
    },
  });
  document.getElementById("page").classList.remove("hidden");
  document.getElementById("main-header").classList.remove("hidden");
  document.getElementById("main-footer").classList.remove("hidden");
  intro.play();
});

function setupButtonListeners() {
  let createBtn = document.getElementById("create-btn");
  createBtn.addEventListener("click", function() {
    Turbo.visit("signup.html", {
      frame: "page"
    });
  });

  let loginRtrBtn = document.getElementById("login-rtr-btn");
  loginRtrBtn.addEventListener("click", function() {
    Turbo.visit("index.html", {
      frame: "page"
    });
  });
}

document.addEventListener("DOMContentLoaded", setupButtonListeners);
document.addEventListener("turbo:frame-load", setupButtonListeners);

document.addEventListener("turbo:before-fetch-request", function(event) {
  let frame = event.target;
  if (frame.tagName.toLowerCase() == "turbo-frame") {
    frame.style.opacity = 0;
    anime({
      targets: frame,
      opacity: 0,
      duration: 300,
      easing: "easeInOutQuad",
    });
    click.play();
  }
});

document.addEventListener("turbo:frame-load", function(event) {
  let frame = event.target;
  if (frame.tagName.toLowerCase() == "turbo-frame") {
    frame.style.opacity = 0;
    anime({
      targets: frame,
      opacity: [0, 1],
      duration: 300,
      easing: "easeInOutQuad",
    });
  }
});

let logo = document.getElementById("logo");

logo.addEventListener("mouseenter", function() {
  anime({
    targets: logo,
    rotate: [{
      value: -3,
      duration: 100
    }, {
      value: 3,
      duration: 100
    }, {
      value: -1,
      duration: 100
    }, {
      value: 0,
      duration: 100
    }, ],
    easing: "easeInOutSine",
  });
});

document.getElementById("click-screen").addEventListener("click", function() {
  function wiggleLogo() {
    anime({
      targets: logo,
      rotate: [{
        value: -3,
        duration: 100
      }, {
        value: 3,
        duration: 100
      }, {
        value: -1,
        duration: 100
      }, {
        value: 0,
        duration: 100
      }, ],
      easing: "easeInOutSine",
    });
  }

  let mstiming = (60000 / 90) * 4;
  setInterval(wiggleLogo, mstiming);
});

let initdelay = 167;

document.getElementById("click-screen").addEventListener("click", function() {
  anime({
    targets: "#login-box, #info",
    translateY: [50, 0],
    opacity: [0, 1],
    delay: initdelay,
    duration: 800,
    easing: "easeOutExpo",
  });

  anime({
    targets: "#login-email",
    opacity: [0, 1],
    delay: initdelay + 167,
    duration: 800,
    easing: "easeOutExpo",
  });

  anime({
    targets: "#login-password",
    opacity: [0, 1],
    delay: initdelay + (167 + 333),
    duration: 800,
    easing: "easeOutExpo",
  });

  anime({
    targets: "#login-btn",
    opacity: [0, 1],
    delay: initdelay + (333 + 333 + 167),
    duration: 800,
    easing: "easeOutExpo",
  });

  anime({
    targets: "#create-btn",
    opacity: [0, 1],
    delay: initdelay + (333 + 333 + 167 + 50),
    duration: 800,
    easing: "easeOutExpo",
  });
});