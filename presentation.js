(function () {
  "use strict";

  var pages = [
    "index.html",
    "slide-1.html",
    "slide-2.html",
    "slide-3.html",
    "slide-4.html",
    "slide-5.html",
    "slide-6.html",
    "slide-7.html",
    "slide-8.html",
    "slide-9.html",
    "slide-10.html",
    "slide-11.html",
    "slide-12.html",
    "slide-13.html",
    "slide-14.html",
    "slide-15.html",
    "slide-16.html"
  ];

  var NAV_OUT_MS = 280;
  var NAV_IN_MS = 420;

  var BASE_W = 1280;
  var BASE_H = 720;

  function getFileName() {
    var path = window.location.pathname || "";
    var name = path.substring(path.lastIndexOf("/") + 1);
    return decodeURIComponent(name || "index.html");
  }

  function getIndex() {
    var name = getFileName();
    return pages.indexOf(name);
  }

  function findPageSurface() {
    return document.getElementById("page_container") || document.querySelector(".page_container");
  }

  function findSlideRoot() {
    var page = findPageSurface();
    if (page) {
      return page;
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

  function ensureSlideFitWrapper() {
    var page = findPageSurface();
    if (!page || !page.parentNode) {
      return;
    }
    if (page.parentElement && page.parentElement.classList.contains("slide-fit-chrome")) {
      return;
    }
    var chrome = document.createElement("div");
    chrome.className = "slide-fit-chrome";
    page.parentNode.insertBefore(chrome, page);
    chrome.appendChild(page);
  }

  function measureSlideBase(page, present) {
    if (!present || !page) {
      return { baseW: BASE_W, baseH: BASE_H };
    }

    var sw = Math.ceil(Math.max(BASE_W, page.scrollWidth, page.offsetWidth));
    var sh = Math.ceil(Math.max(BASE_H, page.scrollHeight, page.offsetHeight));
    sw = Math.min(Math.max(sw, BASE_W), 4096);
    sh = Math.min(Math.max(sh, BASE_H), 4096);
    return { baseW: sw, baseH: sh };
  }

  function updateSlideScale() {
    var present = document.body.classList.contains("presentation-mode");
    var render = document.getElementById("o-html-render");
    var page = findPageSurface();
    var dims = measureSlideBase(page, present);
    var baseW = dims.baseW;
    var baseH = dims.baseH;

    var w;
    var h;

    /* In presentation mode, padding only follows safe-area — use the slide root client box. */
    if (present && render && (render.clientWidth > 0 || render.clientHeight > 0)) {
      w = Math.max(160, render.clientWidth);
      h = Math.max(160, render.clientHeight);
    } else {
      var inset = Math.max(12, Math.min(28, Math.round(window.innerWidth * 0.02)));
      var bottomReserve = present ? 88 : 24;
      var topReserve = present ? 12 : 56;
      w = Math.max(160, window.innerWidth - inset * 2);
      h = Math.max(160, window.innerHeight - inset * 2 - bottomReserve - topReserve);
    }

    var scale = Math.min(w / baseW, h / baseH);
    scale = Math.max(0.12, Math.min(scale, 4));
    document.documentElement.style.setProperty("--slide-base-w", String(baseW));
    document.documentElement.style.setProperty("--slide-base-h", String(baseH));
    document.documentElement.style.setProperty("--slide-scale", String(scale));
    document.documentElement.style.setProperty("--presentation-scale", String(scale));
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
    var render = document.getElementById("o-html-render");
    if (render) {
      render.classList.add("slide-root");
    }

    ensureSlideFitWrapper();

    var slide = findSlideRoot();
    var surface = findPageSurface();
    if (surface) {
      var imgs = surface.querySelectorAll("img");
      for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        if (!img.complete) {
          img.addEventListener("load", updateSlideScale, { once: true });
        }
      }
    }

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
      updateSlideScale();
      window.requestAnimationFrame(function () {
        updateSlideScale();
      });
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
      updateSlideScale();
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

    updateSlideScale();
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
      updateSlideScale();
    });

    document.addEventListener("fullscreenchange", function () {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(updateSlideScale);
      });
    });

    window.addEventListener("orientationchange", function () {
      window.setTimeout(updateSlideScale, 200);
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
