import {
  ArrowRight,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  Search,
  Train
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import heroRailwaySceneImg from "../assets/hero-railway-scene.png";
import "./Home.css";

function Home({
  trains = [],
  etaData,
  selectTrain,
  setActivePage,
  liveTrainData
}) {
  const currentSpeed =
    liveTrainData?.currentSpeed ??
    etaData?.currentSpeed ??
    0;

  const confidence =
    liveTrainData?.confidenceScore ??
    etaData?.confidenceScore ??
    0;

  const predictedDelay =
    liveTrainData?.futureDelay ??
    etaData?.futureDelay ??
    0;

  const [heroSearchQuery, setHeroSearchQuery] = useState("");

  const openSearch = () => {
    setActivePage("search");
  };

  const openMap = () => {
    setActivePage("map");
  };

  const openDashboard = () => {
    setActivePage("dashboard");
  };

  const trainList = useMemo(() => {
    if (!trains || !Array.isArray(trains) || trains.length === 0) return [];
    return trains.map((t, i) => {
      const currentDel = Number(t.currentDelay ?? 0);
      const isDelayed = currentDel > 0;
      const isEarly = currentDel < 0;
      const themeColors = ["indigo", "rose", "cyan", "emerald", "amber", "purple"];
      const theme = themeColors[i % themeColors.length];

      return {
        ...t,
        number: t.number || t.trainNumber,
        trainNumber: t.trainNumber || t.number,
        name: t.name || t.trainName || `Train ${t.number || t.trainNumber}`,
        trainName: t.trainName || t.name || `Train ${t.number || t.trainNumber}`,
        source: t.source || t.currentLocation || t.currentStation || "En Route",
        destination: t.destination || t.nextStation || "Next Station",
        status: t.status || (isEarly ? "Early" : (isDelayed ? "Delayed" : "On Time")),
        delay: t.delay || (isEarly ? `Early by ${Math.abs(Math.round(currentDel))} min` : (isDelayed ? `+${Math.round(currentDel)} min` : "On Time")),
        speed: t.currentSpeed != null ? `${Math.round(t.currentSpeed)} km/h` : "-- km/h",
        platform: t.platform || "",
        category: t.category || (isEarly ? "EARLY" : (isDelayed ? "DELAYED" : "ON TIME")),
        categoryColor: isEarly ? "#2563eb" : (isDelayed ? "#e11d48" : "#059669"),
        theme,
      };
    });
  }, [trains]);

  const [activeTrain, setActiveTrain] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const hasMovedRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const wheelTimeout = useRef(null);

  // Hero 3D interactive tilt & layered depth effect
  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroTitleSpanRef = useRef(null);
  const heroDescRef = useRef(null);

  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const state = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      isHovered: false,
      rafId: null,
      idleTime: 0,
    };

    const handleMouseMove = (e) => {
      const rect = heroEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      state.targetX = Math.max(-1, Math.min(1, normX));
      state.targetY = Math.max(-1, Math.min(1, normY));
      state.isHovered = true;
    };

    const handleMouseLeave = () => {
      state.targetX = 0;
      state.targetY = 0;
      state.isHovered = false;
    };

    const animate = () => {
      state.idleTime += 0.016;

      // Gentle ambient idle micro-drift
      const idleFactor = state.isHovered ? 0.35 : 1.0;
      const idleX = Math.sin(state.idleTime * 0.9) * 0.12 * idleFactor;
      const idleY = Math.cos(state.idleTime * 0.7) * 0.09 * idleFactor;

      // Premium smooth lerp easing for restrained response
      const lerpSpeed = state.isHovered ? 0.075 : 0.045;
      state.currentX += (state.targetX - state.currentX) * lerpSpeed;
      state.currentY += (state.targetY - state.currentY) * lerpSpeed;

      const totalX = state.currentX + idleX;
      const totalY = state.currentY + idleY;

      // 1. Primary Headline: Subtle 3D rotation and parallax translation
      const titleRotY = totalX * 3.6;
      const titleRotX = -totalY * 2.6;
      const titleTransX = totalX * 6.0;
      const titleTransY = totalY * 4.0;
      const titleTransZ = 14;

      if (heroTitleRef.current) {
        heroTitleRef.current.style.transform = `perspective(1000px) translate3d(${titleTransX.toFixed(2)}px, ${titleTransY.toFixed(2)}px, ${titleTransZ}px) rotateX(${titleRotX.toFixed(2)}deg) rotateY(${titleRotY.toFixed(2)}deg)`;
      }

      // 2. Blue highlight span: subtle depth elevation & light sheen response
      if (heroTitleSpanRef.current) {
        const lightShadowX = (-totalX * 2.5).toFixed(1);
        const lightShadowY = (-totalY * 2.5 + 1).toFixed(1);
        heroTitleSpanRef.current.style.transform = `translate3d(${(totalX * 1.4).toFixed(2)}px, ${(totalY * 1.0).toFixed(2)}px, 8px)`;
        heroTitleSpanRef.current.style.textShadow = `${lightShadowX}px ${lightShadowY}px 12px rgba(29, 104, 216, 0.28)`;
      }

      // 3. Supporting Description: Layered depth (moves ~55% of headline)
      const descRotY = totalX * 2.0;
      const descRotX = -totalY * 1.4;
      const descTransX = totalX * 3.2;
      const descTransY = totalY * 2.2;
      const descTransZ = 6;

      if (heroDescRef.current) {
        heroDescRef.current.style.transform = `perspective(1000px) translate3d(${descTransX.toFixed(2)}px, ${descTransY.toFixed(2)}px, ${descTransZ}px) rotateX(${descRotX.toFixed(2)}deg) rotateY(${descRotY.toFixed(2)}deg)`;
      }

      state.rafId = requestAnimationFrame(animate);
    };

    heroEl.addEventListener("mousemove", handleMouseMove, { passive: true });
    heroEl.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    state.rafId = requestAnimationFrame(animate);

    return () => {
      heroEl.removeEventListener("mousemove", handleMouseMove);
      heroEl.removeEventListener("mouseleave", handleMouseLeave);
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
      }
    };
  }, []);

  // ==========================================
  // INTELLIGENCE PIPELINE 3D COVERFLOW CAROUSEL
  // ==========================================
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  const pipelineSteps = useMemo(
    () => [
      {
        id: "step-01",
        number: "01",
        icon: <Radio size={19} />,
        label: "LIVE INPUT",
        title: "Train Signals",
        desc: "Speed, location, current delay and operational conditions continuously enter the prediction pipeline.",
        metricLabel: "Speed",
        metricValue: `${Number(currentSpeed).toFixed(0)} km/h`,
        themeClass: "step-input",
        color: "#2878d4",
      },
      {
        id: "step-02",
        number: "02",
        icon: <BrainCircuit size={19} />,
        label: "PREDICTION",
        title: "Delay Intelligence",
        desc: "Current and previous delay conditions are evaluated to estimate how the delay may evolve ahead.",
        metricLabel: "Future Delay",
        metricValue: `${predictedDelay > 0 ? "+" : ""}${Number(predictedDelay).toFixed(1)} min`,
        themeClass: "step-prediction",
        color: "#7656d8",
      },
      {
        id: "step-03",
        number: "03",
        icon: <Clock3 size={19} />,
        label: "OUTPUT",
        title: "Dynamic ETA",
        desc: "Predicted future delay is combined with travel conditions to continuously update expected arrival information.",
        metricLabel: "Confidence",
        metricValue: `${Number(confidence).toFixed(0)}%`,
        themeClass: "step-output",
        color: "#15966d",
      },
    ],
    [currentSpeed, predictedDelay, confidence]
  );

  const lastActiveCarouselRef = useRef("pipeline");

  const nextPipelineStep = () => {
    lastActiveCarouselRef.current = "pipeline";
    setActivePipelineStep((prev) => (prev + 1) % 3);
  };

  const prevPipelineStep = () => {
    lastActiveCarouselRef.current = "pipeline";
    setActivePipelineStep((prev) => (prev - 1 + 3) % 3);
  };

  const pipelineStartX = useRef(0);
  const pipelineStartY = useRef(0);
  const pipelineHasMovedRef = useRef(false);
  const isPipelinePointerDown = useRef(false);
  const pipelineWheelTimeout = useRef(null);

  const handlePipelinePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isPipelinePointerDown.current = true;
    pipelineHasMovedRef.current = false;
    pipelineStartX.current = e.clientX;
    pipelineStartY.current = e.clientY;
    lastActiveCarouselRef.current = "pipeline";
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePipelinePointerMove = (e) => {
    if (!isPipelinePointerDown.current) return;
    const diffX = e.clientX - pipelineStartX.current;
    const diffY = e.clientY - pipelineStartY.current;

    if (Math.abs(diffX) > 6) {
      pipelineHasMovedRef.current = true;
    }

    // Don't intercept vertical page scroll on touch
    if (!pipelineHasMovedRef.current && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
      return;
    }

    const threshold = isMobile ? 32 : 42;
    if (diffX < -threshold) {
      nextPipelineStep();
      pipelineStartX.current = e.clientX;
      pipelineStartY.current = e.clientY;
      isPipelinePointerDown.current = false;
    } else if (diffX > threshold) {
      prevPipelineStep();
      pipelineStartX.current = e.clientX;
      pipelineStartY.current = e.clientY;
      isPipelinePointerDown.current = false;
    }
  };

  const handlePipelinePointerUp = (e) => {
    if (isPipelinePointerDown.current && e?.currentTarget) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
    isPipelinePointerDown.current = false;
    setTimeout(() => {
      pipelineHasMovedRef.current = false;
    }, 120);
  };

  const handlePipelineWheel = (e) => {
    if (Math.abs(e.deltaX) < 18 && !e.shiftKey) return;
    if (pipelineWheelTimeout.current) return;

    const delta = e.shiftKey ? e.deltaY : e.deltaX;
    if (delta > 0) {
      nextPipelineStep();
    } else {
      prevPipelineStep();
    }

    pipelineWheelTimeout.current = setTimeout(() => {
      pipelineWheelTimeout.current = null;
    }, 240);
  };

  const handlePipelineCardClick = (index) => {
    if (pipelineHasMovedRef.current) return;
    lastActiveCarouselRef.current = "pipeline";
    setActivePipelineStep(index);
  };

  const getPipelineCardStyle = (index) => {
    let offset = index - activePipelineStep;
    if (offset > 1) offset -= 3;
    if (offset < -1) offset += 3;

    // Mobile (< 640px)
    if (isMobile) {
      if (offset === 0) {
        return {
          transform: "translateX(0px) translateZ(45px) rotateY(0deg) scale(1)",
          zIndex: 10,
          opacity: 1,
          filter: "brightness(1.04)",
          pointerEvents: "auto",
          cursor: "default",
        };
      }
      const sign = Math.sign(offset);
      const transX = sign * (windowWidth < 400 ? 150 : 175);
      return {
        transform: `translateX(${transX}px) translateZ(-25px) rotateY(${-sign * 12}deg) scale(0.80)`,
        zIndex: 5,
        opacity: 0.55,
        filter: "brightness(0.86)",
        pointerEvents: "auto",
        cursor: "pointer",
      };
    }

    // Tablet (640px - 1023px)
    if (isTablet) {
      if (offset === 0) {
        return {
          transform: "translateX(0px) translateZ(65px) rotateY(0deg) scale(1.04)",
          zIndex: 10,
          opacity: 1,
          filter: "brightness(1.05)",
          pointerEvents: "auto",
          cursor: "default",
        };
      }
      const sign = Math.sign(offset);
      return {
        transform: `translateX(${sign * 255}px) translateZ(-25px) rotateY(${-sign * 14}deg) scale(0.84)`,
        zIndex: 5,
        opacity: 0.65,
        filter: "brightness(0.88)",
        pointerEvents: "auto",
        cursor: "pointer",
      };
    }

    // Laptop & Desktop (1024px+)
    if (offset === 0) {
      return {
        transform: "translateX(0px) translateZ(80px) rotateY(0deg) scale(1.06)",
        zIndex: 10,
        opacity: 1,
        filter: "brightness(1.06)",
        pointerEvents: "auto",
        cursor: "default",
      };
    }

    const sign = Math.sign(offset);
    return {
      transform: `translateX(${sign * 315}px) translateZ(-25px) rotateY(${-sign * 14}deg) scale(0.88)`,
      zIndex: 5,
      opacity: 0.72,
      filter: "brightness(0.90)",
      pointerEvents: "auto",
      cursor: "pointer",
    };
  };

  // Responsive device detection across Mobile, Tablet, Laptop, Desktop
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const moveTrain = (direction) => {
    lastActiveCarouselRef.current = "trains";
    if (!trainList.length) return;
    setActiveTrain((current) => {
      const next = direction === "next" ? current + 1 : current - 1;
      return (next + trainList.length) % trainList.length;
    });
  };

  // Pointer Down (Mouse & Touch unified)
  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    lastActiveCarouselRef.current = "trains";
    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Pointer Move (Mouse Drag & Touch Move)
  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const diffX = e.clientX - pointerStartX.current;
    const diffY = e.clientY - pointerStartY.current;

    if (Math.abs(diffX) > 6) {
      hasMovedRef.current = true;
    }

    // Don't intercept vertical page scroll on touch
    if (!hasMovedRef.current && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
      return;
    }

    const threshold = isMobile ? 32 : 42;
    if (diffX < -threshold) {
      moveTrain("next");
      pointerStartX.current = e.clientX;
      pointerStartY.current = e.clientY;
    } else if (diffX > threshold) {
      moveTrain("prev");
      pointerStartX.current = e.clientX;
      pointerStartY.current = e.clientY;
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e) => {
    if (isPointerDownRef.current && e?.currentTarget) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
    isPointerDownRef.current = false;
    setIsDragging(false);
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 120);
  };

  // Mouse Wheel & Trackpad horizontal/vertical swipe
  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) < 18 && !e.shiftKey) return;
    if (wheelTimeout.current) return;

    const delta = e.shiftKey ? e.deltaY : e.deltaX;
    if (delta > 0) {
      moveTrain("next");
    } else {
      moveTrain("prev");
    }

    wheelTimeout.current = setTimeout(() => {
      wheelTimeout.current = null;
    }, 240);
  };

  // Track scroll position to determine which carousel is currently in focus for keyboard arrows
  useEffect(() => {
    const handleScroll = () => {
      const pipelineEl = document.querySelector(".home-intelligence");
      const explorerEl = document.querySelector(".home-train-explorer");
      if (!pipelineEl || !explorerEl) return;

      const pipelineRect = pipelineEl.getBoundingClientRect();
      const explorerRect = explorerEl.getBoundingClientRect();
      const midScreen = window.innerHeight / 2;

      const pipelineDist = Math.abs((pipelineRect.top + pipelineRect.bottom) / 2 - midScreen);
      const explorerDist = Math.abs((explorerRect.top + explorerRect.bottom) / 2 - midScreen);

      if (explorerDist < pipelineDist) {
        lastActiveCarouselRef.current = "trains";
      } else {
        lastActiveCarouselRef.current = "pipeline";
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Left / right keyboard arrow navigation for both carousels
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        if (lastActiveCarouselRef.current === "pipeline") {
          setActivePipelineStep((prev) => (prev - 1 + 3) % 3);
        } else {
          moveTrain("prev");
        }
      } else if (e.key === "ArrowRight") {
        if (lastActiveCarouselRef.current === "pipeline") {
          setActivePipelineStep((prev) => (prev + 1) % 3);
        } else {
          moveTrain("next");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trainList.length]);

  const handleCardClick = (train, index) => {
    if (hasMovedRef.current) return;
    lastActiveCarouselRef.current = "trains";

    if (index === activeTrain) {
      if (selectTrain) {
        selectTrain(train);
      } else {
        openSearch();
      }
    } else {
      setActiveTrain(index);
    }
  };

  const getCardStyle = (index) => {
    const total = trainList.length;
    let offset = index - activeTrain;

    // Continuous circular wrap-around calculation
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    // ==========================================
    // MOBILE PHONES (< 640px)
    // ==========================================
    if (isMobile) {
      if (absOffset > 2) {
        return {
          transform: `translateX(${sign * 280}px) translateZ(-160px) scale(0.5)`,
          zIndex: 1,
          opacity: 0,
          pointerEvents: "none",
          visibility: "hidden",
        };
      }
      if (offset === 0) {
        return {
          transform: "translateX(0px) translateZ(45px) rotateY(0deg) scale(1)",
          zIndex: 10,
          opacity: 1,
          filter: "brightness(1.06)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
      if (absOffset === 1) {
        const rotY = -sign * 12;
        const transX = sign * (windowWidth < 400 ? 105 : 125);
        return {
          transform: `translateX(${transX}px) translateZ(-25px) rotateY(${rotY}deg) scale(0.84)`,
          zIndex: 6,
          opacity: 0.72,
          filter: "brightness(0.82)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
      if (absOffset === 2) {
        const rotY = -sign * 18;
        const transX = sign * (windowWidth < 400 ? 190 : 215);
        return {
          transform: `translateX(${transX}px) translateZ(-70px) rotateY(${rotY}deg) scale(0.68)`,
          zIndex: 3,
          opacity: 0.28,
          filter: "brightness(0.65)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
    }

    // ==========================================
    // TABLET (640px - 1023px)
    // ==========================================
    if (isTablet) {
      if (absOffset > 2) {
        return {
          transform: `translateX(${sign * 420}px) translateZ(-180px) scale(0.55)`,
          zIndex: 1,
          opacity: 0,
          pointerEvents: "none",
          visibility: "hidden",
        };
      }
      if (offset === 0) {
        return {
          transform: "translateX(0px) translateZ(70px) rotateY(0deg) scale(1.04)",
          zIndex: 10,
          opacity: 1,
          filter: "brightness(1.08)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
      if (absOffset === 1) {
        const rotY = -sign * 14;
        const transX = sign * 180;
        return {
          transform: `translateX(${transX}px) translateZ(-20px) rotateY(${rotY}deg) scale(0.88)`,
          zIndex: 7,
          opacity: 0.82,
          filter: "brightness(0.86)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
      if (absOffset === 2) {
        const rotY = -sign * 24;
        const transX = sign * 325;
        return {
          transform: `translateX(${transX}px) translateZ(-80px) rotateY(${rotY}deg) scale(0.72)`,
          zIndex: 4,
          opacity: 0.44,
          filter: "brightness(0.7)",
          pointerEvents: "auto",
          visibility: "visible",
        };
      }
    }

    // ==========================================
    // LAPTOP & DESKTOP (1024px+)
    // ==========================================
    if (absOffset > 3) {
      return {
        transform: `translateX(${sign * 660}px) translateZ(-220px) scale(0.5)`,
        zIndex: 1,
        opacity: 0,
        pointerEvents: "none",
        visibility: "hidden",
      };
    }

    if (offset === 0) {
      return {
        transform: "translateX(0px) translateZ(85px) rotateY(0deg) scale(1.06)",
        zIndex: 10,
        opacity: 1,
        filter: "brightness(1.08)",
        pointerEvents: "auto",
        visibility: "visible",
      };
    }

    if (absOffset === 1) {
      const rotY = -sign * 14;
      const transX = sign * 210;
      return {
        transform: `translateX(${transX}px) translateZ(-15px) rotateY(${rotY}deg) scale(0.90)`,
        zIndex: 8,
        opacity: 0.82,
        filter: "brightness(0.88)",
        pointerEvents: "auto",
        visibility: "visible",
      };
    }

    if (absOffset === 2) {
      const rotY = -sign * 22;
      const transX = sign * 390;
      return {
        transform: `translateX(${transX}px) translateZ(-75px) rotateY(${rotY}deg) scale(0.78)`,
        zIndex: 5,
        opacity: 0.52,
        filter: "brightness(0.74)",
        pointerEvents: "auto",
        visibility: "visible",
      };
    }

    if (absOffset === 3) {
      const rotY = -sign * 28;
      const transX = sign * 545;
      return {
        transform: `translateX(${transX}px) translateZ(-140px) rotateY(${rotY}deg) scale(0.66)`,
        zIndex: 2,
        opacity: 0.22,
        filter: "brightness(0.58)",
        pointerEvents: "auto",
        visibility: "visible",
      };
    }
  };
  return (
    <main className="home-page">

      {/* =====================================================
    PROFESSIONAL RAILWAY INTELLIGENCE BACKGROUND
    CSS-driven — no image required
    ===================================================== */}

      <div className="home-background-layer" aria-hidden="true">

        {/* Technical grid */}
        <div className="home-background-grid" />

        {/* Atmospheric light */}
        <div className="home-background-glow glow-one" />
        <div className="home-background-glow glow-two" />

        {/* Top intelligence network */}
        <div className="home-hero-tech-header">

          <div className="tech-label">
            <span className="tech-line tech-line-left" />
            <span>LIVE DATA</span>
            <span className="tech-node" />
          </div>

          <div className="tech-label">
            <span className="tech-line" />
            <span>AI INSIGHTS</span>
            <span className="tech-node" />
          </div>

          <div className="tech-label">
            <span className="tech-line" />
            <span>SMARTER JOURNEYS</span>
          </div>

        </div>

        {/* Railway network */}
        <div className="home-hero-network">

          <span className="network-line network-line-1" />
          <span className="network-line network-line-2" />
          <span className="network-line network-line-3" />
          <span className="network-line network-line-4" />

          <span className="network-node node-1" />
          <span className="network-node node-2" />
          <span className="network-node node-3" />
          <span className="network-node node-4" />
          <span className="network-node node-5" />

        </div>

        {/* Existing background railway routes */}
        <div className="home-background-route route-one">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="home-background-route route-two">
          <span />
          <span />
          <span />
        </div>

        {/* Railway signal nodes */}
        <div className="home-background-signal signal-one" />
        <div className="home-background-signal signal-two" />
        <div className="home-background-signal signal-three" />

        {/* Bottom railway track */}
        <div className="home-background-track">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* Hero bottom railway line */}
        <div className="home-hero-bottom-rail">

          <div className="bottom-rail-line" />

          <div className="bottom-rail-node node-a" />
          <div className="bottom-rail-node node-b" />

          <div className="bottom-rail-copy">
            <span>SMART RAILWAYS</span>
            <span>BRIGHTER TOMORROWS</span>
          </div>

        </div>

      </div>
      {/* =====================================================
          HERO — IMMERSIVE FULL-WIDTH RAILWAY SCENE
          ===================================================== */}

      <section className="home-hero" ref={heroRef}>

        <div className="home-hero-backdrop" aria-hidden="true">
          <img
            src={heroRailwaySceneImg}
            alt="Modern Indian passenger train on railway corridor"
            className="home-hero-scene-img"
          />
          <div className="home-hero-scene-overlay" />
        </div>

        <div className="home-hero-content">

          <h1 ref={heroTitleRef}>
            Predict the journey
            <span ref={heroTitleSpanRef}> before it happens.</span>
          </h1>

          <p className="home-hero-description" ref={heroDescRef}>
            AI-powered dynamic train ETA and future-delay prediction for smarter, more reliable railway journeys.
          </p>

          <div className="home-hero-search-wrapper">
            <form
              className="home-hero-search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                openSearch();
              }}
            >
              <Search size={18} className="home-hero-search-icon" />
              <input
                type="text"
                className="home-hero-search-input"
                placeholder="Search train by name or number..."
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="home-hero-search-btn"
                title="Search train"
                onClick={openSearch}
              >
                <span>Search Train</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>

        </div>

      </section>


      {/* =====================================================
          INTELLIGENCE PIPELINE
          ===================================================== */}

      <section className="home-intelligence">

        {/* Intelligence Pipeline Container Backdrop */}
        <div className="home-pipeline-container-backdrop" aria-hidden="true">
          <div className="pipeline-container-border" />
          <div className="pipeline-container-fill" />
        </div>

        <div className="home-section-heading intelligence-heading">

          <div className="intelligence-heading-top">

            <div className="intelligence-system-label">
              <span className="intelligence-label-icon"></span>
              <small>THE INTELLIGENCE PIPELINE</small>
            </div>

          </div>

          <h2>
            From live data to a
            <span className="intelligence-highlight"> smarter ETA.</span>
          </h2>

          <p>
            Our system transforms continuously changing train conditions into
            future delay intelligence and dynamic arrival estimates.
          </p>

        </div>


        {/* 3D COVERFLOW CAROUSEL FOR THE 3 PIPELINE STEPS */}
        <div
          className="pipeline-coverflow-wrapper"
          onMouseEnter={() => { lastActiveCarouselRef.current = "pipeline"; }}
        >
          {/* Left Stage Navigation Arrow */}
          <button
            type="button"
            className="pipeline-carousel-arrow arrow-left"
            onClick={prevPipelineStep}
            aria-label="Previous pipeline step"
            title="Previous step"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            className="pipeline-coverflow-stage"
            onPointerDown={handlePipelinePointerDown}
            onPointerMove={handlePipelinePointerMove}
            onPointerUp={handlePipelinePointerUp}
            onPointerLeave={handlePipelinePointerUp}
            onPointerCancel={handlePipelinePointerUp}
            onWheel={handlePipelineWheel}
          >
            {pipelineSteps.map((step, index) => {
              const cardStyle = getPipelineCardStyle(index);
              const isActive = index === activePipelineStep;

              return (
                <article
                  key={step.id}
                  className={`pipeline-card pipeline-coverflow-card ${step.themeClass} ${
                    isActive ? "is-active" : "is-receded"
                  }`}
                  style={cardStyle}
                  onClick={() => handlePipelineCardClick(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${step.number} — ${step.title}`}
                >
                  <div className="pipeline-number">
                    {step.number}
                  </div>

                  <div className="pipeline-icon">
                    {step.icon}
                  </div>

                  <div>
                    <span className="pipeline-label">
                      {step.label}
                    </span>

                    <h3>
                      {step.title}
                    </h3>

                    <p>
                      {step.desc}
                    </p>
                  </div>

                  <div className="pipeline-data">
                    <span>
                      {step.metricLabel}
                    </span>

                    <strong>
                      {step.metricValue}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right Stage Navigation Arrow */}
          <button
            type="button"
            className="pipeline-carousel-arrow arrow-right"
            onClick={nextPipelineStep}
            aria-label="Next pipeline step"
            title="Next step"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </section>


      {/* =====================================================
          RAILWAY DIVIDER
          ===================================================== */}

      <div className="home-track-divider">
        <span />
        <i />
        <span />
      </div>


      {/* =====================================================
          TRAIN EXPLORER
          ===================================================== */}

      {/* =====================================================
          TRAIN EXPLORER — 3D COVERFLOW CAROUSEL
          ===================================================== */}

      <section className="home-train-explorer">

        {/* Explore Trains Container Backdrop */}
        <div className="home-trains-container-backdrop" aria-hidden="true" />

        <div className="home-section-heading train-explorer-heading">

          <div className="home-heading-row">

            <div className="train-explorer-heading-content">

              <div className="train-explorer-label">
                <span className="train-explorer-label-icon"></span>
                <small>QUICK ACCESS</small>
              </div>

              <h2 className="train-explorer-title">
                <span className="train-explorer-title-main">Explore</span>
                <span className="train-explorer-title-accent"> Trains</span>
              </h2>
              <p>
                Select a train to begin your live journey analysis.
              </p>

            </div>

          </div>

        </div>

        {/* 3D Cover Flow Stage — Controlled via Mouse Pointer Movement & Drag */}
        <div className="train-coverflow-wrapper">
          {trainList.length > 0 ? (
            <>
              {trainList.length > 1 && (
                <button
                  type="button"
                  className="train-carousel-arrow arrow-left"
                  onClick={() => moveTrain("prev")}
                  aria-label="Previous train"
                  title="Previous train"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

          <div
            className={`train-coverflow-stage ${isDragging ? "is-dragging" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {trainList.map((train, index) => {
              const cardStyle = getCardStyle(index);
              const isActive = index === activeTrain;

              return (
                <article
                  key={train.number || index}
                  className={`train-coverflow-card theme-${train.theme || "indigo"} ${
                    isActive ? "is-active" : ""
                  }`}
                  style={cardStyle}
                  onClick={() => handleCardClick(train, index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${train.name} - Train ${train.number}`}
                >
                  <div className="card-ambient-glow" />
                  <div className="card-mesh-pattern" />

                  {/* Header: Category pill & live status */}
                  <div className="coverflow-card-header">
                    <span
                      className="coverflow-category-tag"
                      style={{ backgroundColor: train.categoryColor }}
                    >
                      {train.category}
                    </span>

                    <span
                      className={`coverflow-status-badge ${
                        train.status === "Early" || train.category === "EARLY"
                          ? "status-early"
                          : (train.status === "On Time" ? "status-ontime" : "status-delayed")
                      }`}
                    >
                      <span className="status-pulse-dot" />
                      {train.status === "On Time" ? "ON TIME" : train.delay || (train.status === "Early" ? "EARLY" : "DELAYED")}
                    </span>
                  </div>

                  {/* Body: Train Number, Name, Route, Telemetry */}
                  <div className="coverflow-card-body">
                    <div className="train-num-row">
                      <span className="train-num-badge">
                        <Train size={12} />
                        TRAIN {train.number}
                      </span>
                      {train.platform && (
                        <span className="train-platform-badge">{train.platform}</span>
                      )}
                    </div>

                    <h3 className="coverflow-train-name">{train.name}</h3>

                    <div className="coverflow-route">
                      <div className="route-point">
                        <MapPin size={11} className="route-icon" />
                        <span className="station-name">{train.source}</span>
                      </div>
                      <div className="route-connector">
                        <span className="route-dot" />
                        <span className="route-line" />
                        <ArrowRight size={12} className="route-arrow" />
                      </div>
                      <div className="route-point">
                        <span className="station-name">{train.destination}</span>
                      </div>
                    </div>

                    <div className="coverflow-telemetry">
                      <div className="telemetry-item">
                        <span className="tel-label">CRUISING</span>
                        <span className="tel-value">{train.speed || "-- km/h"}</span>
                      </div>
                      <div className="telemetry-divider" />
                      <div className="telemetry-item">
                        <span className="tel-label">AI TRACKING</span>
                        <span className="tel-value active-green">ACTIVE</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Action button */}
                  <div className="coverflow-card-footer">
                    <span className="footer-action-text">
                      {isActive ? "Open journey analysis" : "Click to select"}
                    </span>
                    <button
                      type="button"
                      tabIndex={0}
                      className="footer-arrow-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectTrain) {
                          selectTrain(train);
                        } else {
                          openSearch();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectTrain) {
                            selectTrain(train);
                          } else {
                            openSearch();
                          }
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label={`Open journey analysis for ${train.name} (Train ${train.number})`}
                      title="Open journey analysis"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

              {trainList.length > 1 && (
                <button
                  type="button"
                  className="train-carousel-arrow arrow-right"
                  onClick={() => moveTrain("next")}
                  aria-label="Next train"
                  title="Next train"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: "580px",
                margin: "32px auto",
                padding: "36px 24px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(12px)",
                borderRadius: "20px",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "rgba(37, 99, 235, 0.08)",
                  color: "#2563eb",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px",
                }}
              >
                <Train size={26} />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Awaiting Monitored Trains
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#64748b",
                  lineHeight: "1.5",
                  maxWidth: "420px",
                  margin: "0 auto",
                }}
              >
                No live trains are currently active in the real backend feed. Monitored trains will automatically appear here once polled by the server.
              </p>
            </div>
          )}
        </div>

        {/* Existing "Start with a train." section inside Explore Trains container */}
        <section className="home-final-cta">

          <div className="cta-orbit orbit-one" />
          <div className="cta-orbit orbit-two" />

          <div className="cta-content">

            <span className="cta-label">
              READY TO EXPLORE
            </span>

            <h2>
              Start with a train.
            </h2>

            <button onClick={openSearch}>
              Search a Train
              <ArrowRight size={13} />
            </button>

          </div>

        </section>

      </section>

    </main>
  );
}

export default Home;
