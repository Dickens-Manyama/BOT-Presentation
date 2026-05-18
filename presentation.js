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

  var SLIDE_ASSET_ATTR = "data-presentation-slide-asset";

  var navHooks = {
    updateButtons: function () {}
  };

  function removePresentationSlideHeadAssets() {
    var list = document.head.querySelectorAll("[" + SLIDE_ASSET_ATTR + "]");
    for (var i = 0; i < list.length; i++) {
      list[i].parentNode.removeChild(list[i]);
    }
  }

  function mergeSlideHeadFromDoc(doc, slideFileName) {
    var slideBase = new URL(slideFileName, window.location.href).href;
    var nodes = doc.head.querySelectorAll("style, link[rel='stylesheet']");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.tagName === "LINK") {
        var href = node.getAttribute("href");
        if (!href) {
          continue;
        }
        var absolute;
        try {
          absolute = new URL(href, slideBase).href;
        } catch (e1) {
          continue;
        }
        var existing = document.querySelectorAll("link[rel='stylesheet']");
        var skip = false;
        for (var j = 0; j < existing.length; j++) {
          try {
            if (existing[j].href === absolute) {
              skip = true;
              break;
            }
          } catch (e2) {
            /* ignore */
          }
        }
        if (skip) {
          continue;
        }
        var cloneL = node.cloneNode(true);
        cloneL.setAttribute(SLIDE_ASSET_ATTR, "1");
        document.head.appendChild(cloneL);
      } else if (node.tagName === "STYLE") {
        var cloneS = node.cloneNode(true);
        cloneS.setAttribute(SLIDE_ASSET_ATTR, "1");
        document.head.appendChild(cloneS);
      }
    }
  }

  function loadSlideHtmlIntoDocument(nextIndex, onSuccess, onError) {
    var slideFileName = pages[nextIndex];
    fetch(slideFileName, { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("fetch failed");
        }
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        var render = document.getElementById("o-html-render");
        var newRender = doc.getElementById("o-html-render");
        if (!render || !newRender) {
          throw new Error("missing #o-html-render");
        }
        removePresentationSlideHeadAssets();
        mergeSlideHeadFromDoc(doc, slideFileName);
        render.innerHTML = newRender.innerHTML;
        onSuccess();
      })
      .catch(function () {
        if (onError) {
          onError();
        }
      });
  }

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

  function getVisualViewportSize() {
    var vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      return { w: vv.width, h: vv.height };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function isNarrowPhone() {
    return window.matchMedia("(max-width: 640px)").matches;
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
    var narrow = isNarrowPhone();
    var vv = getVisualViewportSize();

    /* In presentation mode, use slide root box intersected with visual viewport (mobile browser chrome). */
    if (present && render && (render.clientWidth > 0 || render.clientHeight > 0)) {
      w = Math.max(160, Math.min(render.clientWidth, vv.w));
      h = Math.max(160, Math.min(render.clientHeight, vv.h));
    } else {
      var inset = narrow
        ? 4
        : Math.max(12, Math.min(28, Math.round(window.innerWidth * 0.02)));
      var bottomReserve = present ? 88 : narrow ? 6 : 24;
      var topReserve = present ? 12 : narrow ? 52 : 56;
      w = Math.max(160, vv.w - inset * 2);
      h = Math.max(160, vv.h - inset * 2 - bottomReserve - topReserve);
    }

    var scale = Math.min(w / baseW, h / baseH);
    scale = Math.max(0.12, Math.min(scale, 4));
    document.documentElement.style.setProperty("--slide-base-w", String(baseW));
    document.documentElement.style.setProperty("--slide-base-h", String(baseH));
    document.documentElement.style.setProperty("--slide-scale", String(scale));
    document.documentElement.style.setProperty("--presentation-scale", String(scale));
  }

  function bindImageLoadsForCurrentSlide() {
    var surface = findPageSurface();
    if (!surface) {
      return;
    }
    var imgs = surface.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.complete) {
        img.addEventListener("load", updateSlideScale, { once: true });
      }
    }
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
      loadSlideHtmlIntoDocument(
        nextIndex,
        function () {
          window.history.pushState({ presentation: true }, "", nextUrl);
          document.body.classList.remove("presentation-nav-out");
          var el = findSlideRoot();
          if (el) {
            el.classList.add("presentation-slide");
          }
          ensureSlideFitWrapper();
          bindImageLoadsForCurrentSlide();
          updateSlideScale();
          window.requestAnimationFrame(function () {
            updateSlideScale();
          });

          document.body.classList.remove("presentation-nav-in-active");
          document.body.classList.add("presentation-nav-in");
          window.requestAnimationFrame(function () {
            document.body.classList.add("presentation-nav-in-active");
          });
          window.setTimeout(function () {
            document.body.classList.remove("presentation-nav-in", "presentation-nav-in-active");
          }, NAV_IN_MS);
          navHooks.updateButtons();
        },
        function () {
          document.body.classList.remove("presentation-nav-out");
          window.location.href = nextUrl;
        }
      );
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

  function ensureMobileViewportMeta() {
    var content =
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes";
    var metas = document.querySelectorAll('meta[name="viewport"]');
    if (metas.length === 0) {
      var m = document.createElement("meta");
      m.name = "viewport";
      m.content = content;
      document.head.insertBefore(m, document.head.firstChild);
    } else {
      for (var i = 0; i < metas.length; i++) {
        metas[i].setAttribute("content", content);
      }
    }
  }

  function attach() {
    ensureMobileViewportMeta();

    var render = document.getElementById("o-html-render");
    if (render) {
      render.classList.add("slide-root");
    }

    ensureSlideFitWrapper();

    bindImageLoadsForCurrentSlide();

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
    ui.exit.addEventListener("click", function () {
      exitPresentation();
      disablePresentationMode();
    });

    function updateButtons() {
      var index = getIndex();
      ui.prev.disabled = index <= 0;
      ui.next.disabled = index < 0 || index >= pages.length - 1;
      updateStatus(ui.status, index);
    }

    navHooks.updateButtons = updateButtons;

    function enablePresentationMode() {
      document.body.classList.remove("presentation-nav-out");
      document.body.classList.add("presentation-mode");
      var cur = findSlideRoot();
      if (cur) {
        cur.classList.add("presentation-slide");
      }
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
      var cur = findSlideRoot();
      document.body.classList.remove(
        "presentation-mode",
        "presentation-nav-out",
        "presentation-nav-in",
        "presentation-nav-in-active"
      );
      if (cur) {
        cur.classList.remove("presentation-slide");
      }
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

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateSlideScale);
      window.visualViewport.addEventListener("scroll", updateSlideScale);
    }

    window.addEventListener("orientationchange", function () {
      window.setTimeout(updateSlideScale, 200);
    });

    var present = isPresentationMode();
    if (present) {
      enablePresentationMode();
    }

    function syncPresentationState() {
      if (!isPresentationMode()) {
        disablePresentationMode();
        return;
      }

      var idx = getIndex();
      if (idx < 0) {
        return;
      }

      loadSlideHtmlIntoDocument(
        idx,
        function () {
          document.body.classList.remove("presentation-nav-out");
          var el = findSlideRoot();
          if (el) {
            el.classList.add("presentation-slide");
          }
          ensureSlideFitWrapper();
          bindImageLoadsForCurrentSlide();
          updateSlideScale();
          window.requestAnimationFrame(function () {
            updateSlideScale();
          });
          updateButtons();
        },
        function () {
          window.location.reload();
        }
      );
    }

    window.addEventListener("popstate", syncPresentationState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
