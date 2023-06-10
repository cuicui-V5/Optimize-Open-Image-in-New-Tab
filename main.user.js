
// ==UserScript==
// @name           optimize-open-image-in-new-tab
// @namespace      optimize-open-image-in-new-tab
// @version        0.0.1
// @description    This practical Greasemonkey script enhances the functionality of opening images in new tabs by adding a viewing feature that enables users to conveniently zoom in or out, view in full screen mode, 
// @include        *
// @run-at         document-end
// @license        MIT
// ==/UserScript==
(function () {
    'use strict';

    /**
     * @param node
     * @param class_name
     */

    function addClass(node, class_name) {
      toggleClass(node, class_name, true);
    }

    /**
     * @param node
     * @param class_name
     */

    function removeClass(node, class_name) {
      toggleClass(node, class_name);
    }

    /**
     * @param node
     * @param class_name
     * @param {?=} state
     */

    function toggleClass(node, class_name, state) {
      node.classList[state ? "add" : "remove"](class_name);
    }

    /**
     * @param {HTMLElement} node
     * @param {string} style
     * @param {string|number} value
     */

    function setStyle(node, style, value) {
      value = "" + value;
      if (node["_s_" + style] !== value) {
        node.style.setProperty(style, value);
        node["_s_" + style] = value;
      }
    }
    let tmp = 0;

    /**
     * @param node
     * @param {Function=} fn
     */

    function prepareStyle(node, fn) {
      if (fn) {
        setStyle(node, "transition", "none");
        fn();
      }

      // force applying styles (quick-fix for closure compiler):
      tmp || (tmp = node.clientTop && 0); // clientWidth

      fn && setStyle(node, "transition", "");
    }
    function setText(node, text) {
      node.firstChild.nodeValue = text;
    }

    /**
     * @param {string} classname
     * @param {Node|Element=} context
     * @returns {HTMLCollection}
     */

    function getByClass(classname, context) {
      return (context || document).getElementsByClassName(classname);
    }

    /**
     * @param {!Window|Document|Element} node
     * @param {string} event
     * @param {Function} fn
     * @param {AddEventListenerOptions|boolean=} mode
     */

    function addListener(node, event, fn, mode) {
      toggleListener(true, node, event, fn, mode);
    }

    /**
     * @param {boolean|undefined} state
     * @param {!Window|Document|Element} node
     * @param {string} event
     * @param {Function} fn
     * @param {EventListenerOptions|boolean=} mode
     */

    function toggleListener(state, node, event, fn, mode) {
      node[(state ? "add" : "remove") + "EventListener"](event, fn, mode || mode === false ? mode : true);
    }

    /**
     * @param event
     * @param {boolean=} prevent
     */

    function cancelEvent(event, prevent) {
      event.stopPropagation();
      //event.stopImmediatePropagation();
      prevent && event.preventDefault();
    }
    function downloadImage(body, image) {
      const link = /** @type {HTMLAnchorElement} */createElement("a");
      const src = image.src;
      link.href = src;
      link.download = src.substring(src.lastIndexOf("/") + 1);
      body.appendChild(link);
      link.click();
      body.removeChild(link);
    }

    /**
     * @param {!string} element
     * @return {Element}
     */

    function createElement(element) {
      return document.createElement(element);
    }

    /**
     * @param node
     * @param {boolean=} state
     */

    function toggleDisplay(node, state) {
      setStyle(node, "display", state ? "" : "none");
    }

    /**
     * @param node
     * @param {boolean=} state
     */

    function toggleVisibility(node, state) {
      setStyle(node, "visibility", state ? "" : "hidden");
    }

    /**
     * @param node
     * @param {boolean=} state
     */

    function toggleAnimation(node, state) {
      setStyle(node, "transition", state ? "" : "none");
    }

    const controls = ["info", "theme", "download", "play", "page", "close", "autofit", "zoom-in", "zoom-out", "prev", "next", "fullscreen"];
    const controls_default = {
      "info": 1,
      "page": 1,
      "close": 1,
      "autofit": 1,
      "zoom-in": 1,
      "zoom-out": 1,
      "prev": 1,
      "next": 1,
      "fullscreen": 1
    };

    /**
     * @enum {number}
     */

    const keycodes = {
      BACKSPACE: 8,
      ESCAPE: 27,
      SPACEBAR: 32,
      LEFT: 37,
      RIGHT: 39,
      UP: 38,
      NUMBLOCK_PLUS: 107,
      PLUS: 187,
      DOWN: 40,
      NUMBLOCK_MINUS: 109,
      MINUS: 189,
      INFO: 73
    };

    const template = createElement("div");
    template.id = "spotlight";
    template.innerHTML =
    // the spinner needs to be a separated element to apply animation
    '<div class=spl-spinner></div>' +
    // the wrapper "spl-track" is required to forward pointer events
    '<div class=spl-track>' + '<div class=spl-scene>' + '<div class=spl-pane></div>' + '</div>' + '</div>' + '<div class=spl-header>' + '<div class=spl-page> </div>' +
    // added via addControl()
    /*
    '<div class=spl-close></div>' +
    '<div class=spl-fullscreen></div>' +
    '<div class=spl-autofit></div>' +
    '<div class=spl-zoom-in></div>' +
    '<div class=spl-zoom-out></div>' +
    '<div class=spl-theme></div>' +
    '<div class=spl-play></div>' +
    '<div class=spl-download></div>' +
     */
    '</div>' + '<div class=spl-progress></div>' + '<div class=spl-footer>' + '<div class=spl-title> </div>' + '<div class=spl-description> </div>' + '<div class=spl-button> </div>' + '</div>' + '<div class=spl-prev></div>' + '<div class=spl-next></div>';

    const video_support = {};
    const tpl_video = /** @type {HTMLVideoElement} */createElement("video");
    function parse_src (anchor, size, options, media) {
      let src, diff;
      if (media !== "node") {
        const keys = Object.keys( /** @type {!Object} */options);
        for (let x = 0, key; x < keys.length; x++) {
          key = keys[x];
          if (key.length > 3 && key.indexOf("src") === 0) {
            if (media === "video") {
              const cache = video_support[key];
              if (cache) {
                if (cache > 0) {
                  src = options[key];
                  break;
                }
              } else if (tpl_video.canPlayType("video/" + key.substring(3).replace("-", "").toLowerCase())) {
                video_support[key] = 1;
                src = options[key];
                break;
              } else {
                video_support[key] = -1;
              }
            } else {
              // Image Media:

              const res = parseInt(key.substring(4), 10);
              if (res) {
                const abs = Math.abs(size - res);
                if (!diff || abs < diff) {
                  diff = abs;
                  src = options[key];
                }
              }
            }
          }
        }
      }
      return src || options["src"] || options["href"] || anchor["src"] || anchor["href"];
    }

    /**
     * Spotlight.js
     * Copyright 2019-2021 Nextapps GmbH
     * Author: Thomas Wilkerling
     * Licence: Apache-2.0
     * https://github.com/nextapps-de/spotlight
     */
    const controls_dom = {};
    const connection = navigator["connection"];
    const dpr = window["devicePixelRatio"] || 1;
    let x;
    let y;
    let startX;
    let startY;
    let viewport_w;
    let viewport_h;
    let media_w;
    let media_h;
    let scale;
    let is_down;
    let dragged;
    let slidable;
    let toggle_autofit;
    let toggle_theme;
    let current_slide;
    let slide_count;
    let anchors;
    let options;
    let options_media;
    let options_group;
    let options_infinite;
    let options_progress;
    let options_onshow;
    let options_onchange;
    let options_onclose;
    let options_fit;
    let options_autohide;
    let options_autoslide;
    let options_theme;
    let options_preload;
    let options_href;
    let options_click;
    let options_class;
    let delay;
    let animation_scale;
    let animation_fade;
    let animation_slide;
    let animation_custom;
    let body;
    let panel;
    let panes;
    let media;
    let media_next = createElement("img");
    let slider;
    let header;
    let footer;
    let footer_visible = 0;
    let title;
    let description;
    let button;
    let page_prev;
    let page_next;
    let maximize;
    let page;
    let player;
    let progress;
    let spinner;
    let gallery;
    let gallery_next;
    let playing;
    let hide;
    let hide_cooldown;
    let prefix_request, prefix_exit;
    addListener(document, "click", dispatch);
    function init() {
      if (body) {
        return;
      }

      //console.log("init");

      body = document.body;
      slider = getOneByClass("scene");
      header = getOneByClass("header");
      footer = getOneByClass("footer");
      title = getOneByClass("title");
      description = getOneByClass("description");
      button = getOneByClass("button");
      page_prev = getOneByClass("prev");
      page_next = getOneByClass("next");
      page = getOneByClass("page");
      progress = getOneByClass("progress");
      spinner = getOneByClass("spinner");
      panes = [getOneByClass("pane")];
      addControl("close", close);
      body[prefix_request = "requestFullscreen"] || body[prefix_request = "msRequestFullscreen"] || body[prefix_request = "webkitRequestFullscreen"] || body[prefix_request = "mozRequestFullscreen"] || (prefix_request = "");
      if (prefix_request) {
        prefix_exit = prefix_request.replace("request", "exit").replace("mozRequest", "mozCancel").replace("Request", "Exit");
        maximize = addControl("fullscreen", fullscreen);
      } else {
        controls.pop(); // => "fullscreen"
      }

      addControl("info", info);
      addControl("autofit", autofit);
      addControl("zoom-in", zoom_in);
      addControl("zoom-out", zoom_out);
      addControl("theme", theme);
      player = addControl("play", play);
      addControl("download", download);
      addListener(page_prev, "click", prev);
      addListener(page_next, "click", next);

      /*
       * binding the tracking listeners to the "widget" will prevent all click listeners to be fired
       * binding the tracking listeners to the "spl-scene" breaks on iOS (seems to be a bug in their visual/touchable overflow calculation)
       * binding the tracking listeners to a wrapper "track" will fix both
       * the spinner element could not be used, it is below the widget to allow user actions (pointers)
       */

      const track = getOneByClass("track");
      addListener(track, "mousedown", start);
      addListener(track, "mousemove", move);
      addListener(track, "mouseleave", end);
      addListener(track, "mouseup", end);
      addListener(track, "touchstart", start, {
        "passive": false
      });
      addListener(track, "touchmove", move, {
        "passive": true
      });
      //addListener(track, "touchcancel", end);
      addListener(track, "touchend", end);
      // click listener for the wrapper "track" is already covered
      //addListener(track, "click", menu);

      addListener(button, "click", function () {
        if (options_click) {
          options_click(current_slide, options);
        } else if (options_href) {
          location.href = options_href;
        }
      });

      /**
       * @param {string} classname
       * @returns {HTMLElement}
       */

      function getOneByClass(classname) {
        //console.log("getOneByClass", classname);

        return controls_dom[classname] = getByClass("spl-" + classname, template)[0];
      }
    }
    function addControl(classname, fn) {
      //console.log("addControl", classname, fn);

      const div = createElement("div");
      div.className = "spl-" + classname;
      addListener(div, "click", fn);
      header.appendChild(div);
      return controls_dom[classname] = div;
    }
    function removeControl(classname) {
      //console.log("dispatch", classname);

      const div = controls_dom[classname];
      if (div) {
        header.removeChild(div);
        controls_dom[classname] = null;
      }
    }
    function dispatch(event) {
      //console.log("dispatch");

      const target = event.target.closest(".spotlight");
      if (target) {
        cancelEvent(event, true);
        const group = target.closest(".spotlight-group");
        anchors = getByClass("spotlight", group);

        // determine current selected index

        for (let i = 0; i < anchors.length; i++) {
          if (anchors[i] === target) {
            options_group = group && group.dataset;
            init_gallery(i + 1);
            break;
          }
        }
      }
    }

    /**
     * @param {!HTMLCollection|Array} gallery
     * @param {Object=} group
     * @param {number=} index
     */

    function show(gallery, group, index) {
      //console.log("show", gallery, config);

      anchors = gallery;
      if (group) {
        options_group = group;
        options_onshow = group["onshow"];
        options_onchange = group["onchange"];
        options_onclose = group["onclose"];
        index = index || group["index"];
      }
      init_gallery(index);
    }
    function init_gallery(index) {
      //console.log("init_gallery", index);

      slide_count = anchors.length;
      if (slide_count) {
        body || init();
        options_onshow && options_onshow(index);
        const pane = panes[0];
        const parent = pane.parentNode;
        for (let i = panes.length; i < slide_count; i++) {
          const clone = pane.cloneNode(false);
          setStyle(clone, "left", i * 100 + "%");
          parent.appendChild(clone);
          panes[i] = clone;
        }
        if (!panel) {
          body.appendChild(template);
          update_widget_viewport();
          //resize_listener();
        }

        current_slide = index || 1;
        toggleAnimation(slider);
        setup_page(true);
        prefix_request && detect_fullscreen();
        show_gallery();
      }
    }

    /**
     * @param {string} key
     * @param {boolean|string|number=} is_default
     */

    function parse_option(key, is_default) {
      //console.log("parse_option", key, is_default);

      let val = options[key];
      if (typeof val !== "undefined") {
        val = "" + val;
        return val !== "false" && (val || is_default);
      }
      return is_default;
    }

    /**
     * @param {Object} anchor
     */

    function apply_options(anchor) {
      //console.log("apply_options", anchor);

      options = {};
      options_group && Object.assign(options, options_group);
      Object.assign(options, anchor.dataset || anchor);

      // TODO: theme is icon and option field!

      options_media = options["media"];
      options_click = options["onclick"];
      options_theme = options["theme"];
      options_class = options["class"];
      options_autohide = parse_option("autohide", true);
      options_infinite = parse_option("infinite");
      options_progress = parse_option("progress", true);
      options_autoslide = parse_option("autoslide");
      options_preload = parse_option("preload", true);
      options_href = options["buttonHref"];
      delay = options_autoslide && parseFloat(options_autoslide) || 7;
      toggle_theme || options_theme && theme(options_theme);
      options_class && addClass(template, options_class);
      options_class && prepareStyle(template);
      const control = options["control"];

      // determine controls

      if (control) {
        const whitelist = typeof control === "string" ? control.split(",") : control;

        // prepare to false when using whitelist

        for (let i = 0; i < controls.length; i++) {
          options[controls[i]] = false;
        }

        // apply whitelist

        for (let i = 0; i < whitelist.length; i++) {
          const option = whitelist[i].trim();

          // handle shorthand "zoom"

          if (option === "zoom") {
            options["zoom-in"] = options["zoom-out"] = true;
          } else {
            options[option] = true;
          }
        }
      }

      // determine animations

      const animation = options["animation"];
      animation_scale = animation_fade = animation_slide = !animation;
      animation_custom = false;
      if (animation) {
        const whitelist = typeof animation === "string" ? animation.split(",") : animation;

        // apply whitelist

        for (let i = 0; i < whitelist.length; i++) {
          const option = whitelist[i].trim();
          if (option === "scale") {
            animation_scale = true;
          } else if (option === "fade") {
            animation_fade = true;
          } else if (option === "slide") {
            animation_slide = true;
          } else if (option) {
            animation_custom = option;
          }
        }
      }
      options_fit = options["fit"];
    }

    /**
     * @param {boolean=} prepare
     */

    function prepare_animation(prepare) {
      //console.log("prepare_animation", prepare);

      if (prepare) {
        prepareStyle(media, prepare_animation);
      } else {
        toggleAnimation(slider, animation_slide);
        setStyle(media, "opacity", animation_fade ? 0 : 1);
        update_scroll(animation_scale && 0.8);
        animation_custom && addClass(media, animation_custom);
      }
    }
    function init_slide(index) {
      //console.log("init_slide", index);

      panel = panes[index - 1];
      media = /** @type {Image|HTMLVideoElement|HTMLElement} */panel.firstChild;
      current_slide = index;
      if (media) {
        disable_autoresizer();
        if (options_fit) {
          addClass(media, options_fit);
        }
        prepare_animation(true);
        animation_custom && removeClass(media, animation_custom);
        animation_fade && setStyle(media, "opacity", 1);
        animation_scale && setStyle(media, "transform", "");
        setStyle(media, "visibility", "visible");
        gallery_next && (media_next.src = gallery_next);
        options_autoslide && animate_bar(playing);
      } else {
        const type = gallery.media;
        const options_spinner = parse_option("spinner", true);
        if (type === "video") {
          toggle_spinner(options_spinner, true);
          media = /** @type {HTMLVideoElement} */createElement("video");
          media.onloadedmetadata = function () {
            if (media === this) {
              media.onerror = null;
              media.width = media.videoWidth;
              media.height = media.videoHeight;
              update_media_viewport();
              toggle_spinner(options_spinner);
              init_slide(index);
            }
          };
          media.poster = options["poster"];
          media.preload = options_preload ? "auto" : "metadata";
          media.controls = parse_option("controls", true);
          media.autoplay = options["autoplay"];
          media.playsinline = parse_option("inline");
          media.muted = parse_option("muted");
          media.src = gallery.src; //files[i].src;

          // const source = createElement("source");
          // source.type = "video/" + files[i].type;
          // source.src = files[i].src;
          // media.appendChild(source);

          panel.appendChild(media);
        } else if (type === "node") {
          media = gallery.src;
          if (typeof media === "string") {
            media = document.querySelector(media);
          }
          if (media) {
            media._root || (media._root = media.parentNode);
            update_media_viewport();
            panel.appendChild(media);
            init_slide(index);
          }
          return;
        } else {
          toggle_spinner(options_spinner, true);
          media = /** @type {HTMLVideoElement|Image} */createElement("img");
          media.onload = function () {
            if (media === this) {
              media.onerror = null;
              toggle_spinner(options_spinner);
              init_slide(index);
              update_media_viewport();
            }
          };

          //media.crossOrigin = "anonymous";
          media.src = gallery.src;
          panel.appendChild(media);
        }
        if (media) {
          options_spinner || setStyle(media, "visibility", "visible");
          media.onerror = function () {
            if (media === this) {
              checkout(media);
              addClass(spinner, "error");
              toggle_spinner(options_spinner);
            }
          };
        }
      }
    }

    /**
     *
     * @param {boolean=} options_spinner
     * @param {boolean=} is_on
     */

    function toggle_spinner(options_spinner, is_on) {
      //console.log("toggle_spinner", options_spinner, is_on);

      options_spinner && toggleClass(spinner, "spin", is_on);
    }
    function has_fullscreen() {
      //console.log("has_fullscreen");

      return document["fullscreen"] || document["fullscreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"];
    }
    function resize_listener() {
      //console.log("resize_listener");

      update_widget_viewport();
      media && update_media_viewport();
      if (prefix_request) {
        const is_fullscreen = has_fullscreen();
        toggleClass(maximize, "on", is_fullscreen);

        // handle when user toggles the fullscreen state manually
        // entering the fullscreen state manually needs to be hide the fullscreen icon, because
        // the exit fullscreen handler will not work due to a browser restriction

        is_fullscreen || detect_fullscreen();
      }

      //update_scroll();
    }

    function detect_fullscreen() {
      toggleDisplay(maximize, screen.availHeight - window.innerHeight > 0);
    }
    function update_widget_viewport() {
      //console.log("update_widget_viewport");

      viewport_w = template.clientWidth;
      viewport_h = template.clientHeight;
    }
    function update_media_viewport() {
      //console.log("update_media_viewport");

      media_w = media.clientWidth;
      media_h = media.clientHeight;
    }

    // function update_media_dimension(){
    //
    //     media_w = media.width;
    //     media_h = media.height;
    // }

    /**
     * @param {number=} force_scale
     */

    function update_scroll(force_scale) {
      //console.log("update_scroll", force_scale);

      setStyle(media, "transform", "translate(-50%, -50%) scale(" + (force_scale || scale) + ")");
    }

    /**
     * @param {number=} x
     * @param {number=} y
     */

    function update_panel(x, y) {
      //console.log("update_panel", x, y);

      setStyle(panel, "transform", x || y ? "translate(" + x + "px, " + y + "px)" : "");
    }

    /**
     * @param {number} index
     * @param {boolean=} prepare
     * @param {number=} offset
     */

    function update_slider(index, prepare, offset) {
      //console.log("update_slider", prepare, offset);

      if (prepare) {
        prepareStyle(slider, function () {
          update_slider(index, false, offset);
        });
      } else {
        setStyle(slider, "transform", "translateX(" + (-index * 100 + (offset || 0)) + "%)");
      }
    }

    /**
     * @param {boolean=} install
     */

    function toggle_listener(install) {
      //console.log("toggle_listener", install);

      toggleListener(install, window, "keydown", key_listener);
      toggleListener(install, window, "wheel", wheel_listener);
      toggleListener(install, window, "resize", resize_listener);
      toggleListener(install, window, "popstate", history_listener);
    }
    function history_listener(event) {
      //console.log("history_listener");

      if (panel && /*event.state &&*/event.state["spl"]) {
        close(true);
      }
    }
    function key_listener(event) {
      //console.log("key_listener");

      if (panel) {
        const zoom_enabled = options["zoom-in"] !== false;
        switch (event.keyCode) {
          case keycodes.BACKSPACE:
            zoom_enabled && autofit();
            break;
          case keycodes.ESCAPE:
            close();
            break;
          case keycodes.SPACEBAR:
            options_autoslide && play();
            break;
          case keycodes.LEFT:
            prev();
            break;
          case keycodes.RIGHT:
            next();
            break;
          case keycodes.UP:
          case keycodes.NUMBLOCK_PLUS:
          case keycodes.PLUS:
            zoom_enabled && zoom_in();
            break;
          case keycodes.DOWN:
          case keycodes.NUMBLOCK_MINUS:
          case keycodes.MINUS:
            zoom_enabled && zoom_out();
            break;
          case keycodes.INFO:
            info();
            break;
        }
      }
    }
    function wheel_listener(event) {
      //console.log("wheel_listener");

      if (panel && options["zoom-in"] !== false) {
        let delta = event["deltaY"];
        delta = (delta < 0 ? 1 : delta ? -1 : 0) * 0.5;
        if (delta < 0) {
          zoom_out();
        } else {
          zoom_in();
        }
      }
    }

    /**
     * @param {Event|boolean=} init
     * @param {boolean=} _skip_animation
     */

    function play(init, _skip_animation) {
      //console.log("play", init);

      const state = typeof init === "boolean" ? init : !playing;
      if (state === !playing) {
        playing = playing ? clearTimeout(playing) : 1;
        toggleClass(player, "on", playing);
        _skip_animation || animate_bar(playing);
      }
    }

    /**
     * @param {?=} start
     */

    function animate_bar(start) {
      //console.log("animate_bar", start);

      if (options_progress) {
        prepareStyle(progress, function () {
          setStyle(progress, "transition-duration", "");
          setStyle(progress, "transform", "");
        });
        if (start) {
          setStyle(progress, "transition-duration", delay + "s");
          setStyle(progress, "transform", "translateX(0)");
        }
      }
      if (start) {
        playing = setTimeout(next, delay * 1000);
      }
    }
    function autohide() {
      //console.log("autohide");

      if (options_autohide) {
        hide_cooldown = Date.now() + 2950;
        if (!hide) {
          addClass(template, "menu");
          schedule(3000);
        }
      }
    }
    function schedule(cooldown) {
      //console.log("schedule", cooldown);

      hide = setTimeout(function () {
        const now = Date.now();
        if (now >= hide_cooldown) {
          removeClass(template, "menu");
          hide = 0;
        } else {
          schedule(hide_cooldown - now);
        }
      }, cooldown);
    }

    /**
     * @param {boolean=} state
     */

    function menu(state) {
      //console.log("menu");

      if (typeof state === "boolean") {
        hide = state ? hide : 0;
      }
      if (hide) {
        hide = clearTimeout(hide);
        removeClass(template, "menu");
      } else {
        autohide();
      }
    }
    function start(e) {
      //console.log("start");

      cancelEvent(e, true);
      is_down = true;
      dragged = false;
      let touches = e.touches;
      if (touches && (touches = touches[0])) {
        e = touches;
      }
      slidable = /* !toggle_autofit && */media_w * scale <= viewport_w;
      startX = e.pageX;
      startY = e.pageY;
      toggleAnimation(panel);
    }
    function end(e) {
      //console.log("end");

      cancelEvent(e);
      if (is_down) {
        if (!dragged) {
          menu();
        } else {
          if (slidable && dragged) {
            const has_next = x < -(viewport_w / 7) && (current_slide < slide_count || options_infinite);
            const has_prev = has_next || x > viewport_w / 7 && (current_slide > 1 || options_infinite);
            if (has_next || has_prev) {
              update_slider(current_slide - 1, /* prepare? */true, x / viewport_w * 100);
              has_next && next() || has_prev && prev();
            }
            x = 0;
            update_panel();
          }
          toggleAnimation(panel, true);
        }
        is_down = false;
      }
    }
    function move(e) {
      //console.log("move");

      cancelEvent(e);
      if (is_down) {
        let touches = e.touches;
        if (touches && (touches = touches[0])) {
          e = touches;
        }

        // handle x-axis in slide mode and in drag mode

        let diff = (media_w * scale - viewport_w) / 2;
        x -= startX - (startX = e.pageX);
        if (!slidable) {
          if (x > diff) {
            x = diff;
          } else if (x < -diff) {
            x = -diff;
          }

          // handle y-axis in drag mode

          if (media_h * scale > viewport_h) {
            diff = (media_h * scale - viewport_h) / 2;
            y -= startY - (startY = e.pageY);
            if (y > diff) {
              y = diff;
            } else if (y < -diff) {
              y = -diff;
            }
          }
        }
        dragged = true;
        update_panel(x, y);
      } else {
        autohide();
      }
    }

    /**
     * @param {Event|boolean=} init
     */

    function fullscreen(init) {
      //console.log("fullscreen", init);

      const is_fullscreen = has_fullscreen();
      if (typeof init !== "boolean" || init !== !!is_fullscreen) {
        if (is_fullscreen) {
          document[prefix_exit]();
          //removeClass(maximize, "on");
        } else {
          template[prefix_request]();
          //addClass(maximize, "on");
        }
      }
    }

    /**
     * @param {Event|string=} theme
     */

    function theme(theme) {
      //console.log("theme", theme);

      if (typeof theme !== "string") {
        // toggle:

        theme = toggle_theme ? "" : options_theme || "white";
      }
      if (toggle_theme !== theme) {
        // set:

        toggle_theme && removeClass(template, toggle_theme);
        theme && addClass(template, theme);
        toggle_theme = theme;
      }
    }

    /**
     * @param {Event|boolean=} init
     */

    function autofit(init) {
      //console.log("autofit", init);

      if (typeof init === "boolean") {
        toggle_autofit = !init;
      }
      toggle_autofit = scale === 1 && !toggle_autofit;
      toggleClass(media, "autofit", toggle_autofit);
      setStyle(media, "transform", "");
      scale = 1;
      x = 0;
      y = 0;
      update_media_viewport();
      toggleAnimation(panel);
      update_panel();
      //autohide();
    }

    /**
     * @param {Event=} e
     */

    function zoom_in(e) {
      //console.log("zoom_in");

      let value = scale / 0.65;
      if (value <= 50) {
        //console.log(toggle_autofit);

        disable_autoresizer();

        // if(options_fit){
        //
        //     removeClass(media, options_fit);
        // }

        x /= 0.65;
        y /= 0.65;
        update_panel(x, y);
        zoom(value);
      }

      //e && autohide();
    }

    /**
     * @param {Event=} e
     */

    function zoom_out(e) {
      //console.log("zoom_out");

      let value = scale * 0.65;
      disable_autoresizer();
      if (value >= 1) {
        if (value === 1) {
          x = y = 0;

          // if(options_fit){
          //
          //     addClass(media, options_fit);
          // }
        } else {
          x *= 0.65;
          y *= 0.65;
        }
        update_panel(x, y);
        zoom(value);
      }

      //e && autohide();
    }

    /**
     * @param {number=} factor
     */

    function zoom(factor) {
      //console.log("zoom", factor);

      scale = factor || 1;
      update_scroll();
    }
    function info() {
      //console.log("info");

      footer_visible = !footer_visible;
      toggleVisibility(footer, footer_visible);
    }
    function disable_autoresizer() {
      //console.log("disable_autoresizer");

      //update_media_dimension();

      if (toggle_autofit) {
        // removeClass(media, "autofit");
        // toggle_autofit = false;

        autofit();
      }
    }
    function show_gallery() {
      //console.log("show_gallery");

      history.pushState({
        "spl": 1
      }, "");
      history.pushState({
        "spl": 2
      }, "");
      toggleAnimation(template, true);
      addClass(body, "hide-scrollbars");
      addClass(template, "show");
      toggle_listener(true);
      update_widget_viewport();
      //resize_listener();
      autohide();
      options_autoslide && play(true, true);
    }
    function download() {
      //console.log("download", media);

      downloadImage(body, media);
    }

    /**
     * @param {boolean=} hashchange
     */

    function close(hashchange) {
      //console.log("close", hashchange);

      setTimeout(function () {
        body.removeChild(template);
        panel = media = gallery = options = options_group = anchors = options_onshow = options_onchange = options_onclose = options_click = null;
      }, 200);
      removeClass(body, "hide-scrollbars");
      removeClass(template, "show");
      fullscreen(false);
      toggle_listener();
      history.go(hashchange === true ? -1 : -2);

      // teardown

      gallery_next && (media_next.src = "");
      playing && play();
      media && checkout(media);
      hide && (hide = clearTimeout(hide));
      toggle_theme && theme();
      options_class && removeClass(template, options_class);
      options_onclose && options_onclose();
    }
    function checkout(media) {
      //console.log("checkout");

      if (media._root) {
        media._root.appendChild(media);
        media._root = null;
      } else {
        const parent = media.parentNode;
        parent && parent.removeChild(media);
        media = media.src = media.onerror = "";
      }
    }

    /**
     * @param {Event=} e
     */

    function prev(e) {
      //console.log("prev");

      e && autohide();
      if (slide_count > 1) {
        if (current_slide > 1) {
          return goto(current_slide - 1);
        } else if (options_infinite) {
          update_slider(slide_count, true);
          return goto(slide_count);
        }
      }
    }

    /**
     * @param {Event=} e
     */

    function next(e) {
      //console.log("next");

      e && autohide();
      if (slide_count > 1) {
        if (current_slide < slide_count) {
          return goto(current_slide + 1);
        } else if (options_infinite) {
          update_slider(-1, true);
          return goto(1);
        } else if (playing) {
          play();
        }
      }
    }
    function goto(slide) {
      //console.log("goto", slide);

      if (slide !== current_slide) {
        if (playing) {
          clearTimeout(playing);
          animate_bar();
        } else {
          autohide();
        }

        //playing ? animate_bar() : autohide();

        const direction = slide > current_slide;
        current_slide = slide;
        setup_page(direction);
        //options_autoslide && play(true, true);

        return true;
      }
    }
    function prepare(direction) {
      //console.log("prepare", direction);

      let anchor = anchors[current_slide - 1];
      apply_options(anchor);
      const speed = connection && connection["downlink"];
      let size = Math.max(viewport_h, viewport_w) * dpr;
      if (speed && speed * 1200 < size) {
        size = speed * 1200;
      }
      let tmp;
      gallery = {
        media: options_media,
        src: parse_src(anchor, size, options, options_media),
        title: parse_option("title", anchor["alt"] || anchor["title"] ||
        // inherit title from a direct child only
        (tmp = anchor.firstElementChild) && (tmp["alt"] || tmp["title"]))
      };
      gallery_next && (media_next.src = gallery_next = "");
      if (options_preload && direction) {
        if (anchor = anchors[current_slide]) {
          const options_next = anchor.dataset || anchor;
          const next_media = options_next["media"];
          if (!next_media || next_media === "image") {
            gallery_next = parse_src(anchor, size, options_next, next_media);
          }
        }
      }

      // apply controls

      for (let i = 0; i < controls.length; i++) {
        const option = controls[i];

        //console.log(option + ": ", options[option]);

        toggleDisplay(controls_dom[option], parse_option(option, controls_default[option]));
      }
    }
    function setup_page(direction) {
      //console.log("setup_page", direction);

      x = 0;
      y = 0;
      scale = 1;
      if (media) {
        // Note: the onerror callback was removed when the image was fully loaded (also for video)

        if (media.onerror) {
          checkout(media);
        } else {
          let ref = media;
          setTimeout(function () {
            if (ref && media !== ref) {
              checkout(ref);
              ref = null;
            }
          }, 650);

          // animate out the old image

          prepare_animation();
          update_panel();
        }
      }
      footer && toggleVisibility(footer, 0);
      prepare(direction);
      update_slider(current_slide - 1);
      removeClass(spinner, "error");
      init_slide(current_slide);
      toggleAnimation(panel);
      update_panel();
      const str_title = gallery.title;
      const str_description = parse_option("description");
      const str_button = parse_option("button");
      const has_content = str_title || str_description || str_button;
      if (has_content) {
        str_title && setText(title, str_title);
        str_description && setText(description, str_description);
        str_button && setText(button, str_button);
        toggleDisplay(title, str_title);
        toggleDisplay(description, str_description);
        toggleDisplay(button, str_button);
        setStyle(footer, "transform", options_autohide === "all" ? "" : "none");
      }
      options_autohide || addClass(template, "menu");
      toggleVisibility(footer, footer_visible && has_content);
      toggleVisibility(page_prev, options_infinite || current_slide > 1);
      toggleVisibility(page_next, options_infinite || current_slide < slide_count);
      setText(page, slide_count > 1 ? current_slide + " / " + slide_count : "");
      options_onchange && options_onchange(current_slide, options);
    }
    var Spotlight = {
      init: init,
      theme: theme,
      fullscreen: fullscreen,
      download: download,
      autofit: autofit,
      next: next,
      prev: prev,
      goto: goto,
      close: close,
      zoom: zoom,
      menu: menu,
      show: show,
      play: play,
      addControl: addControl,
      removeControl: removeControl
    };

    const css = `@keyframes pulsate{0%,to{opacity:1}50%{opacity:.2}}#spotlight{position:fixed;top:-1px;bottom:-1px;width:100%;z-index:99999;color:#fff;background-color:#000;opacity:0;overflow:hidden;-webkit-user-select:none;-ms-user-select:none;user-select:none;transition:opacity .2s ease-out;font-family:Arial,sans-serif;font-size:16px;font-weight:400;contain:strict;touch-action:none;pointer-events:none}#spotlight.show{opacity:1;transition:none;pointer-events:auto}#spotlight.white{color:#212529;background-color:#fff}#spotlight.white .spl-next,#spotlight.white .spl-page~*,#spotlight.white .spl-prev,#spotlight.white .spl-spinner{filter:invert(1)}#spotlight.white .spl-progress{background-color:rgba(0,0,0,.35)}#spotlight.white .spl-footer,#spotlight.white .spl-header{background-color:rgba(255,255,255,.65)}#spotlight.white .spl-button{background:#212529;color:#fff}.spl-footer,.spl-header{background-color:rgba(0,0,0,.45)}#spotlight .contain,#spotlight .cover{object-fit:cover;height:100%;width:100%}#spotlight .contain{object-fit:contain}#spotlight .autofit{object-fit:none;width:auto;height:auto;max-height:none;max-width:none;transition:none}.spl-scene,.spl-spinner,.spl-track{width:100%;height:100%;position:absolute}.spl-track{contain:strict}.spl-spinner{background-position:center;background-repeat:no-repeat;background-size:42px;opacity:0}.spl-spinner.spin{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzgiIGhlaWdodD0iMzgiIHZpZXdCb3g9IjAgMCAzOCAzOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IiNmZmYiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2Utb3BhY2l0eT0iLjY1Ij48Y2lyY2xlIHN0cm9rZS1vcGFjaXR5PSIuMTUiIGN4PSIxOCIgY3k9IjE4IiByPSIxOCIvPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOCI+PGFuaW1hdGVUcmFuc2Zvcm0gYXR0cmlidXRlTmFtZT0idHJhbnNmb3JtIiB0eXBlPSJyb3RhdGUiIGZyb209IjAgMTggMTgiIHRvPSIzNjAgMTggMTgiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+PC9wYXRoPjwvZz48L2c+PC9zdmc+);transition:opacity .2s linear .25s;opacity:1}.spl-spinner.error{background-image:url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjMyIiB3aWR0aD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTYsMUExNSwxNSwwLDEsMCwzMSwxNiwxNSwxNSwwLDAsMCwxNiwxWm0wLDJhMTMsMTMsMCwwLDEsOC40NSwzLjE0TDYuMTQsMjQuNDVBMTMsMTMsMCwwLDEsMTYsM1ptMCwyNmExMywxMywwLDAsMS04LjQ1LTMuMTRMMjUuODYsNy41NUExMywxMywwLDAsMSwxNiwyOVoiIGlkPSJiYW5fc2lnbl9jcm9zc2VkX2NpcmNsZSIvPjwvc3ZnPg==);background-size:128px;transition:none;opacity:.5}.spl-scene{transition:transform .65s cubic-bezier(.1,1,.1,1);contain:layout size;will-change:transform}.spl-pane>*{position:absolute;width:auto;height:auto;max-width:100%;max-height:100%;left:50%;top:50%;margin:0;padding:0;border:0;transform:translate(-50%,-50%) scale(1);transition:transform .65s cubic-bezier(.3,1,.3,1),opacity .65s ease;contain:layout style;will-change:transform,opacity;visibility:hidden}.spl-header,.spl-pane,.spl-progress{position:absolute;top:0}.spl-pane{width:100%;height:100%;transition:transform .65s cubic-bezier(.3,1,.3,1);contain:layout size;will-change:transform,contents}.spl-header{width:100%;height:50px;text-align:right;transform:translateY(-100px);transition:transform .35s ease;overflow:hidden;will-change:transform}#spotlight.menu .spl-footer,#spotlight.menu .spl-header,.spl-footer:hover,.spl-header:hover{transform:translateY(0)}.spl-header div{display:inline-block;vertical-align:middle;white-space:nowrap;width:50px;height:50px;opacity:.5}.spl-progress{width:100%;height:3px;background-color:rgba(255,255,255,.45);transform:translateX(-100%);transition:transform linear}.spl-footer,.spl-next,.spl-prev{position:absolute;transition:transform .35s ease;will-change:transform}.spl-footer{left:0;right:0;bottom:0;line-height:20px;padding:20px 20px 0;padding-bottom:env(safe-area-inset-bottom,0);text-align:left;font-size:15px;font-weight:400;transform:translateY(100%)}.spl-title{font-size:22px}.spl-button,.spl-description,.spl-title{margin-bottom:20px}.spl-button{display:inline-block;background:#fff;color:#000;border-radius:5px;padding:10px 20px;cursor:pointer}.spl-next,.spl-page~*,.spl-prev{background-position:center;background-repeat:no-repeat}.spl-page{float:left;width:auto;line-height:50px}.spl-page~*{background-size:21px;float:right}.spl-fullscreen{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHZpZXdCb3g9Ii0xIC0xIDI2IDI2IiB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTggM0g1YTIgMiAwIDAgMC0yIDJ2M20xOCAwVjVhMiAyIDAgMCAwLTItMmgtM20wIDE4aDNhMiAyIDAgMCAwIDItMnYtM00zIDE2djNhMiAyIDAgMCAwIDIgMmgzIi8+PC9zdmc+)}.spl-fullscreen.on{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik04IDN2M2EyIDIgMCAwIDEtMiAySDNtMTggMGgtM2EyIDIgMCAwIDEtMi0yVjNtMCAxOHYtM2EyIDIgMCAwIDEgMi0yaDNNMyAxNmgzYTIgMiAwIDAgMSAyIDJ2MyIvPjwvc3ZnPg==)}.spl-autofit{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBoZWlnaHQ9Ijk2cHgiIHZpZXdCb3g9IjAgMCA5NiA5NiIgd2lkdGg9Ijk2cHgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoOTAgNTAgNTApIiBmaWxsPSIjZmZmIiBkPSJNNzEuMzExLDgwQzY5LjY3LDg0LjY2LDY1LjIzLDg4LDYwLDg4SDIwYy02LjYzLDAtMTItNS4zNy0xMi0xMlYzNmMwLTUuMjMsMy4zNC05LjY3LDgtMTEuMzExVjc2YzAsMi4yMSwxLjc5LDQsNCw0SDcxLjMxMSAgeiIvPjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKDkwIDUwIDUwKSIgZmlsbD0iI2ZmZiIgZD0iTTc2LDhIMzZjLTYuNjMsMC0xMiw1LjM3LTEyLDEydjQwYzAsNi42Myw1LjM3LDEyLDEyLDEyaDQwYzYuNjMsMCwxMi01LjM3LDEyLTEyVjIwQzg4LDEzLjM3LDgyLjYzLDgsNzYsOHogTTgwLDYwICBjMCwyLjIxLTEuNzksNC00LDRIMzZjLTIuMjEsMC00LTEuNzktNC00VjIwYzAtMi4yMSwxLjc5LTQsNC00aDQwYzIuMjEsMCw0LDEuNzksNCw0VjYweiIvPjwvc3ZnPg==)}.spl-zoom-in,.spl-zoom-out{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMSIgY3k9IjExIiByPSI4Ii8+PGxpbmUgeDE9IjIxIiB4Mj0iMTYuNjUiIHkxPSIyMSIgeTI9IjE2LjY1Ii8+PGxpbmUgeDE9IjgiIHgyPSIxNCIgeTE9IjExIiB5Mj0iMTEiLz48L3N2Zz4=);background-size:22px}.spl-zoom-in{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMSIgY3k9IjExIiByPSI4Ii8+PGxpbmUgeDE9IjIxIiB4Mj0iMTYuNjUiIHkxPSIyMSIgeTI9IjE2LjY1Ii8+PGxpbmUgeDE9IjExIiB4Mj0iMTEiIHkxPSI4IiB5Mj0iMTQiLz48bGluZSB4MT0iOCIgeDI9IjE0IiB5MT0iMTEiIHkyPSIxMSIvPjwvc3ZnPg==)}.spl-download{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgaGVpZ2h0PSIxNDEuNzMycHgiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDE0MS43MzIgMTQxLjczMiIgd2lkdGg9IjE0MS43MzJweCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMTIwLjY3NCwxMjUuMTM4SDIwLjc5M3YxNi41OTRoOTkuODgxVjEyNS4xMzh6IE0xMTkuMDE5LDU4Ljc3NmMtMi41NjEtMi41NjItNi43MTYtMi41NjItOS4yNzUsMEw3Ny4yMSw5MS4zMTJWNi41NjIgICBDNzcuMjEsMi45MzYsNzQuMjY5LDAsNzAuNjQ4LDBjLTMuNjI0LDAtNi41NiwyLjkzNy02LjU2LDYuNTYzdjg0Ljc1TDMxLjk5Miw1OS4yMThjLTIuNTYyLTIuNTY0LTYuNzE1LTIuNTY0LTkuMjc3LDAgICBjLTIuNTY1LDIuNTYyLTIuNTY1LDYuNzE2LDAsOS4yNzlsNDMuMjk0LDQzLjI5M2MwLjE1LDAuMTU0LDAuMzE0LDAuMjk5LDAuNDgxLDAuNDM4YzAuMDc2LDAuMDYyLDAuMTU1LDAuMTEzLDAuMjM0LDAuMTc2ICAgYzAuMDk0LDAuMDY1LDAuMTg2LDAuMTQyLDAuMjc5LDAuMjA2YzAuMDk3LDAuMDYzLDAuMTkyLDAuMTE0LDAuMjg2LDAuMTc0YzAuMDg4LDAuMDU0LDAuMTc0LDAuMTA1LDAuMjY1LDAuMTUzICAgYzAuMSwwLjA1NiwwLjE5OSwwLjEsMC4yOTgsMC4xNDdjMC4wOTcsMC4wNDUsMC4xOSwwLjA5MSwwLjI4MywwLjEzMmMwLjA5OCwwLjA0LDAuMTk2LDAuMDcyLDAuMjk1LDAuMTA1ICAgYzAuMTA0LDAuMDM4LDAuMjA3LDAuMDc4LDAuMzEyLDAuMTA5YzAuMTAxLDAuMDMsMC4xOTcsMC4wNTIsMC4yOTcsMC4wNzdjMC4xMDgsMC4wMjMsMC4yMTQsMC4wNTgsMC4zMjQsMC4wNzggICBjMC4xMTUsMC4wMjEsMC4yMzEsMC4wMzMsMC4zNDYsMC4wNTRjMC4wOTcsMC4wMTUsMC4xOTIsMC4wMzIsMC4yODksMC4wNDJjMC40MywwLjA0MiwwLjg2NSwwLjA0MiwxLjI5NSwwICAgYzAuMS0wLjAxLDAuMTkxLTAuMDI3LDAuMjg5LTAuMDQyYzAuMTE0LTAuMDIxLDAuMjMzLTAuMDI5LDAuMzQ0LTAuMDU0YzAuMTA5LTAuMDIxLDAuMjE3LTAuMDU1LDAuMzI0LTAuMDc4ICAgYzAuMTAyLTAuMDI1LDAuMTk5LTAuMDQ3LDAuMjk5LTAuMDc3YzAuMTA1LTAuMDMxLDAuMjA3LTAuMDcxLDAuMzEyLTAuMTA5YzAuMTAyLTAuMDMsMC4xOTUtMC4wNjIsMC4yOTUtMC4xMDUgICBjMC4wOTYtMC4wNDEsMC4xOTEtMC4wODcsMC4yODMtMC4xMzJjMC4xLTAuMDQ4LDAuMTk5LTAuMDkyLDAuMjk3LTAuMTQ3YzAuMDkxLTAuMDQ4LDAuMTc3LTAuMTA0LDAuMjY0LTAuMTUzICAgYzAuMDk4LTAuMDYsMC4xOTMtMC4xMSwwLjI4Ny0wLjE3NGMwLjA5Ni0wLjA2NCwwLjE4OS0wLjE0MSwwLjI4MS0wLjIwNmMwLjA3Ni0wLjA2MiwwLjE1Ni0wLjExMywwLjIzMy0wLjE3NiAgIGMwLjI0OS0wLjIwNCwwLjQ3OS0wLjQzNywwLjY5NC0wLjY3YzAuMDc2LTAuMDY3LDAuMTU0LTAuMTMxLDAuMjI5LTAuMjAzbDQzLjI5NC00My4yOTYgICBDMTIxLjU4MSw2NS40OTEsMTIxLjU4MSw2MS4zMzcsMTE5LjAxOSw1OC43NzYiLz48L2c+PC9zdmc+);background-size:20px}.spl-theme{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBoZWlnaHQ9IjI0cHgiIHZlcnNpb249IjEuMiIgdmlld0JveD0iMiAyIDIwIDIwIiB3aWR0aD0iMjRweCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMTIsNGMtNC40MTgsMC04LDMuNTgyLTgsOHMzLjU4Miw4LDgsOHM4LTMuNTgyLDgtOFMxNi40MTgsNCwxMiw0eiBNMTIsMThjLTMuMzE0LDAtNi0yLjY4Ni02LTZzMi42ODYtNiw2LTZzNiwyLjY4Niw2LDYgUzE1LjMxNCwxOCwxMiwxOHoiLz48cGF0aCBkPSJNMTIsN3YxMGMyLjc1NywwLDUtMi4yNDMsNS01UzE0Ljc1Nyw3LDEyLDd6Ii8+PC9nPjwvc3ZnPg==)}.spl-play{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSItMC41IC0wLjUgMjUgMjUiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwb2x5Z29uIGZpbGw9IiNmZmYiIHBvaW50cz0iMTAgOCAxNiAxMiAxMCAxNiAxMCA4Ii8+PC9zdmc+)}.spl-play.on{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSItMC41IC0wLjUgMjUgMjUiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIxMCIgeDI9IjEwIiB5MT0iMTUiIHkyPSI5Ii8+PGxpbmUgeDE9IjE0IiB4Mj0iMTQiIHkxPSIxNSIgeTI9IjkiLz48L3N2Zz4=);animation:pulsate 1s ease infinite}.spl-close{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIyIDIgMjAgMjAiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMTgiIHgyPSI2IiB5MT0iNiIgeTI9IjE4Ii8+PGxpbmUgeDE9IjYiIHgyPSIxOCIgeTE9IjYiIHkyPSIxOCIvPjwvc3ZnPg==)}.spl-next,.spl-prev{top:50%;width:50px;height:50px;opacity:.65;background-color:rgba(0,0,0,.45);border-radius:100%;cursor:pointer;margin-top:-25px;transform:translateX(-100px);background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSIxNSAxOCA5IDEyIDE1IDYiLz48L3N2Zz4=);background-size:30px}.spl-prev{left:20px}.spl-next{left:auto;right:20px;transform:translateX(100px) scaleX(-1)}#spotlight.menu .spl-prev{transform:translateX(0)}#spotlight.menu .spl-next{transform:translateX(0) scaleX(-1)}@media (hover:hover){.spl-page~div{cursor:pointer;transition:opacity .2s ease}.spl-next:hover,.spl-page~div:hover,.spl-prev:hover{opacity:1}}@media (max-width:500px){.spl-header div{width:44px}.spl-footer .spl-title{font-size:20px}.spl-footer{font-size:14px}.spl-next,.spl-prev{width:35px;height:35px;margin-top:-17.5px;background-size:15px 15px}.spl-spinner{background-size:30px 30px}}.hide-scrollbars{overflow:hidden!important}`;
    const path = location.pathname;
    console.log(path);
    const reg = /\.(png|jpg|jpeg|gif|webp)$/i;
    if (reg.test(path) || document.contentType.startsWith("image")) {
      console.log("开始预览");
      document.documentElement.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
      const gallery = [{
        src: location.href
      }];
      Spotlight.show(gallery /*, options */);
    }

})();
