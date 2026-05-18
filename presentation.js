(function () {
  "use strict";

  var pages = [
    "html.html",
    "html(1a).html",
    "html(2).html",
    "html(3).html",
    "html(4).html",
    "html(5).html",
    "html(6).html",
    "html(7).html",
    "html(8).html",
    "html(9).html",
    "html(10).html",
    "html(11).html",
    "html(12).html",
    "html(13).html",
    "html(14).html",
    "html(15).html",
    "html(16).html"
  ];

  var NAV_OUT_MS = 280;
  var NAV_IN_MS = 420;

  function getFileName() {
    var path = window.location.pathname || "";
    var name = path.substring(path.lastIndexOf("/") + 1);
    return decodeURIComponent(name || "html.html");
  }

  function getIndex() {
    var name = getFileName();
    return pages.indexOf(name);
  }

  function setScale() {
    var baseWidth = 1280;
    var baseHeight = 720;
    var scale = Math.max(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
    document.body.style.setProperty("--presentation-scale", scale.toString());
  }

  function findSlideRoot() {
    var direct = document.getElementById("page_container");
    if (direct) {
      return direct;
    }

    var alt = document.querySelector(".page_container");
    if (alt) {
      return alt;
    }

    var render = document.getElementById("o-html-render");
    if (render && render.firstElementChild) {
      return render.firstElementChild;
    }

    return document.body;
  }

  function buildToolbar() {
    var toolbar = document.createElement("div");
    toolbar.className = "presentation-toolbar";

    var prev = document.createElement("button");
    prev.textContent = "Prev";

    var next = document.createElement("button");
    next.textContent = "Next";

    var exit = document.createElement("button");
    exit.textContent = "Exit";

    var status = document.createElement("span");
    status.className = "presentation-status";

    toolbar.appendChild(prev);
    toolbar.appendChild(next);
    toolbar.appendChild(status);
    toolbar.appendChild(exit);

    return {
      toolbar: toolbar,
      prev: prev,
      next: next,
      exit: exit,
      status: status
    };
  }

  function updateStatus(status, index) {
    if (index < 0) {
      status.textContent = "Slide";
      return;
    }

    status.textContent = "Slide " + (index + 1) + " / " + pages.length;
  }

  function navigate(delta) {
    var index = getIndex();
    if (index < 0) {
      return;
    }

    var nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= pages.length) {
      return;
    }

    var nextUrl = pages[nextIndex] + "?present=1";
    if (!isPresentationMode()) {
      window.location.href = nextUrl;
      return;
    }

    document.body.classList.add("presentation-nav-out");
    window.setTimeout(function () {
      window.location.href = nextUrl;
    }, NAV_OUT_MS);
  }

  function isPresentationMode() {
    return new URLSearchParams(window.location.search).get("present") === "1";
  }

  function setPresentationParam(enabled) {
    var url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set("present", "1");
    } else {
      url.searchParams.delete("present");
    }

    window.history.replaceState(null, "", url.toString());
  }

  function requestFullscreen() {
    var root = document.documentElement;
    if (root.requestFullscreen) {
      return root.requestFullscreen();
    }

    return Promise.resolve();
  }

  function addFullscreenClickHandler() {
    if (document.fullscreenElement) {
      return;
    }

    var handler = function () {
      requestFullscreen().catch(function () {
        return;
      });
      document.removeEventListener("click", handler, true);
    };

    document.addEventListener("click", handler, true);
  }

  function enterPresentation() {
    setPresentationParam(true);
  }

  function exitPresentation() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {
        return;
      });
    }

    setPresentationParam(false);
  }

  function togglePresentation() {
    if (isPresentationMode()) {
      exitPresentation();
      return;
    }

    enterPresentation();
  }

  function attach() {
    var slide = findSlideRoot();
    var launch = document.createElement("button");
    launch.className = "presentation-launch";
    launch.textContent = isPresentationMode() ? "Exit Presentation" : "Presentation";
    launch.addEventListener("click", handleToggle);
    document.body.appendChild(launch);

    var ui = buildToolbar();
    document.body.appendChild(ui.toolbar);

    ui.prev.addEventListener("click", function () {
      navigate(-1);
    });
    ui.next.addEventListener("click", function () {
      navigate(1);
    });
    ui.exit.addEventListener("click", exitPresentation);

    function updateButtons() {
      var index = getIndex();
      ui.prev.disabled = index <= 0;
      ui.next.disabled = index < 0 || index >= pages.length - 1;
      updateStatus(ui.status, index);
    }

    function enablePresentationMode() {
      document.body.classList.remove("presentation-nav-out");
      document.body.classList.add("presentation-mode");
      slide.classList.add("presentation-slide");
      setScale();
      updateButtons();
      launch.textContent = "Exit Presentation";
      requestFullscreen().catch(function () {
        return;
      });
      addFullscreenClickHandler();

      document.body.classList.remove("presentation-nav-in-active");
      document.body.classList.add("presentation-nav-in");
      window.requestAnimationFrame(function () {
        document.body.classList.add("presentation-nav-in-active");
      });
      window.setTimeout(function () {
        document.body.classList.remove("presentation-nav-in", "presentation-nav-in-active");
      }, NAV_IN_MS);
    }

    function disablePresentationMode() {
      document.body.classList.remove(
        "presentation-mode",
        "presentation-nav-out",
        "presentation-nav-in",
        "presentation-nav-in-active"
      );
      slide.classList.remove("presentation-slide");
      launch.textContent = "Presentation";
    }

    function handleToggle() {
      if (isPresentationMode()) {
        exitPresentation();
        disablePresentationMode();
        return;
      }

      enterPresentation();
      enablePresentationMode();
    }

    updateButtons();

    document.addEventListener("keydown", function (event) {
      if (!isPresentationMode()) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        navigate(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleToggle();
      }
    });

    window.addEventListener("resize", function () {
      if (isPresentationMode()) {
        setScale();
      }
    });

    var present = isPresentationMode();
    if (present) {
      enablePresentationMode();
    }

    function syncPresentationState() {
      if (isPresentationMode()) {
        enablePresentationMode();
      } else {
        disablePresentationMode();
      }
    }

    window.addEventListener("popstate", syncPresentationState);

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
