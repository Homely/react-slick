'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {getTrackCSS, getTrackLeft, getTrackAnimateCSS} from './trackHelper';
import assign from 'object-assign';

var helpers = {
  initialize: function (props) {
    var slideCount = React.Children.count(props.children);
    var listWidth = this.getWidth(ReactDOM.findDOMNode(this.refs.list));
    var trackWidth = this.getWidth(ReactDOM.findDOMNode(this.refs.track));
    var slideWidth = trackWidth/props.slidesToShow;

    var currentSlide = props.rtl ? slideCount - 1 - props.initialSlide : props.initialSlide;

    this.setState({
      slideCount: slideCount,
      slideWidth: slideWidth,
      listWidth: listWidth,
      trackWidth: trackWidth,
      currentSlide: currentSlide
    }, function () {

      var targetLeft = getTrackLeft(assign({
        slideIndex: this.state.currentSlide,
        trackRef: this.refs.track
      }, props, this.state));
      // getCSS function needs previously set state
      var trackStyle = getTrackCSS(assign({left: targetLeft}, props, this.state));

      this.setState({trackStyle: trackStyle});

      this.autoPlay(); // once we're set up, trigger the initial autoplay.
    });
  },
  update: function (props) {
    // This method has mostly same code as initialize method.
    // Refactor it
    var slideCount = React.Children.count(props.children);
    var listWidth = this.getWidth(ReactDOM.findDOMNode(this.refs.list));
    var trackWidth = this.getWidth(ReactDOM.findDOMNode(this.refs.track));
    var slideWidth = this.getWidth(ReactDOM.findDOMNode(this))/props.slidesToShow;

    // pause slider if autoplay is set to false
    if(!props.autoplay)
      this.pause();

    this.setState({
      slideCount: slideCount,
      slideWidth: slideWidth,
      listWidth: listWidth,
      trackWidth: trackWidth
    }, function () {

      var targetLeft = getTrackLeft(assign({
        slideIndex: this.state.currentSlide,
        trackRef: this.refs.track
      }, props, this.state));
      // getCSS function needs previously set state
      var trackStyle = getTrackCSS(assign({left: targetLeft}, props, this.state));

      this.setState({trackStyle: trackStyle});
    });
  },
  getWidth: function getWidth(elem) {
    return elem.getBoundingClientRect().width || elem.offsetWidth;
  },
  adaptHeight: function () {
    if (this.props.adaptiveHeight) {
      var selector = '[data-index="' + this.state.currentSlide +'"]';
      if (this.refs.list) {
        var slickList = ReactDOM.findDOMNode(this.refs.list);
        slickList.style.height = slickList.querySelector(selector).offsetHeight + 'px';
      }
    }
  },
  slideHandler: function (index) {
    // Functionality of animateSlide and postSlide is merged into this function
    var targetSlide, currentSlide;
    var targetLeft, currentLeft;
    var callback;

    if (this.props.waitForAnimate && this.state.animating) {
      return;
    }

    if (this.props.fade) {
      currentSlide = this.state.currentSlide;

      // Don't change slide if it's not infite and current slide is the first or last slide.
      if(this.props.infinite === false &&
        (index < 0 || index >= this.state.slideCount)) {
        return;
      }

      //  Shifting targetSlide back into the range
      if (index < 0) {
        targetSlide = index + this.state.slideCount;
      } else if (index >= this.state.slideCount) {
        targetSlide = index - this.state.slideCount;
      } else {
        targetSlide = index;
      }

      var updatedLazyLoadedList = this.props.lazyLoad
        ? this.updateLazyLoadList(index)
        : this.state.lazyLoadedList;

      callback = () => {
        if (!this.isMounted()) {
          return;
        }
        this.setState({
          animating: false,
        });
        if (this.props.afterChange) {
          this.props.afterChange(targetSlide);
        }
        delete this.animationEndCallback;
      };

      this.setState({
        animating: true,
        currentSlide: targetSlide,
        lazyLoadedList: updatedLazyLoadedList
      }, function () {
        this.animationEndCallback = setTimeout(callback, this.props.speed);
      });

      if (this.props.beforeChange) {
        this.props.beforeChange(this.state.currentSlide, targetSlide);
      }

      this.autoPlay();
      return;
    }

    targetSlide = index;
    if (targetSlide < 0) {
      if(this.props.infinite === false) {
        currentSlide = 0;
      } else if (this.state.slideCount % this.props.slidesToScroll !== 0) {
        currentSlide = this.state.slideCount - (this.state.slideCount % this.props.slidesToScroll);
      } else {
        currentSlide = this.state.slideCount + targetSlide;
      }
    } else if (targetSlide >= this.state.slideCount) {
      if(this.props.infinite === false) {
        currentSlide = this.state.slideCount - this.props.slidesToShow;
      } else if (this.state.slideCount % this.props.slidesToScroll !== 0) {
        currentSlide = 0;
      } else {
        currentSlide = targetSlide - this.state.slideCount;
      }
    } else {
      currentSlide = targetSlide;
    }

    // Don't change slide if it's not infite and current slide is the first or last slide page.
    if(currentSlide === this.state.currentSlide && this.props.infinite === false) {
      return;
    }

    targetLeft = getTrackLeft(assign({
      slideIndex: targetSlide,
      trackRef: this.refs.track
    }, this.props, this.state));

    currentLeft = getTrackLeft(assign({
      slideIndex: currentSlide,
      trackRef: this.refs.track
    }, this.props, this.state));

    if (this.props.infinite === false) {
      targetLeft = currentLeft;
    }

    if (this.props.beforeChange) {
      this.props.beforeChange(this.state.currentSlide, currentSlide);
    }

    var updatedLazyLoadedList = this.props.lazyLoad
      ? this.updateLazyLoadList(index)
      : this.state.lazyLoadedList;

    // Slide Transition happens here.
    // animated transition happens to target Slide and
    // non - animated transition happens to current Slide
    // If CSS transitions are false, directly go the current slide.

    if (this.props.useCSS === false) {

      this.setState({
        currentSlide: currentSlide,
        lazyLoadedList: updatedLazyLoadedList,
        trackStyle: getTrackCSS(assign({left: currentLeft}, this.props, this.state))
      }, function () {
        if (this.props.afterChange) {
          this.props.afterChange(currentSlide);
        }
      });

    } else {

      var nextStateChanges = {
        animating: false,
        currentSlide: currentSlide,
        trackStyle: getTrackCSS(assign({left: currentLeft}, this.props, this.state)),
        swipeLeft: null
      };

      callback = () => {
        if (!this.isMounted()) {
          return;
        }
        this.setState(nextStateChanges);
        if (this.props.afterChange) {
          this.props.afterChange(currentSlide);
        }
        delete this.animationEndCallback;
      };

      this.setState({
        animating: true,
        currentSlide: currentSlide,
        lazyLoadedList: updatedLazyLoadedList,
        trackStyle: getTrackAnimateCSS(assign({left: targetLeft}, this.props, this.state))
      }, function () {
        this.animationEndCallback = setTimeout(callback, this.props.speed);
      });

    }

    this.autoPlay();
  },
  swipeDirection: function (touchObject) {
    var xDist, yDist, r, swipeAngle;

    xDist = touchObject.startX - touchObject.curX;
    yDist = touchObject.startY - touchObject.curY;
    r = Math.atan2(yDist, xDist);

    swipeAngle = Math.round(r * 180 / Math.PI);
    if (swipeAngle < 0) {
        swipeAngle = 360 - Math.abs(swipeAngle);
    }
    if ((swipeAngle <= 45) && (swipeAngle >= 0) || (swipeAngle <= 360) && (swipeAngle >= 315)) {
        return (this.props.rtl === false ? 'left' : 'right');
    }
    if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
        return (this.props.rtl === false ? 'right' : 'left');
    }

    return 'vertical';
  },
  autoPlay: function () {
    if (this.state.autoPlayTimer) {
      return;
    }
    var play = () => {
      if (this.state.mounted) {
        var nextIndex = this.props.rtl ?
        this.state.currentSlide - this.props.slidesToScroll:
        this.state.currentSlide + this.props.slidesToScroll;
        this.slideHandler(nextIndex);
      }
    };
    if (this.props.autoplay) {
      this.setState({
        autoPlayTimer: window.setInterval(play, this.props.autoplaySpeed)
      });
    }
  },
  pause: function () {
    if (this.state.autoPlayTimer) {
      window.clearInterval(this.state.autoPlayTimer);
      this.setState({
        autoPlayTimer: null
      });
    }
  },

  updateLazyLoadList: function(index) {
    return Array.from(new Set(this.state.lazyLoadedList.concat(this.getLazyLoadList(index))));
  },

  setLazyLoadList: function(index) {
    var newLazyLoadedList = this.updateLazyLoadList(index);
    if (newLazyLoadedList !== this.state.lazyLoadedList) {
      this.setState({
        lazyLoadedList: newLazyLoadedList
      });
    }
  },

  getLazyLoadList: function(currentSlideIndex) {
    var lazyLoadedList = [];
    var loopIndex = currentSlideIndex + this.props.children.length;
    for (var h = loopIndex - this.props.lazyLoadOffset; h <= loopIndex + this.props.lazyLoadOffset; h++) {
      lazyLoadedList.push(h % this.props.children.length);
    }
    return lazyLoadedList;
  }
};

export default helpers;
