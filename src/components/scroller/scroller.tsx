import * as React from "react";
import styles from "./scroller.module.css";

type Orientation = "horizontal" | "vertical";

export interface ScrollerTheme {
    backgroundColor?: string;
    thumbColor?: string;
    thumbThickness?: string | number;
    thumbBorderRadius?: string | number;
    thumbInset?: string | number;
    focusColor?: string;
    /** Milliseconds before the thumb auto-hides after a scroll. Default 1000. */
    hideDelayMs?: number;
    /** Thumb fade in/out duration in milliseconds. Default 150. */
    fadeMs?: number;
    /** Minimum thumb length in pixels — keeps the thumb grabbable for very long content. Default 30. */
    minThumbLength?: number;
}

export interface ScrollerHandle {
    scrollTo: (position: number) => void;
    scrollBy: (delta: number) => void;
    scrollToIndex: (index: number) => void;
    getScrollPosition: () => number;
}

interface ScrollerProps {
    orientation: Orientation;
    children: React.ReactNode;
    contentSize?: number;
    viewWidth?: number;
    viewHeight?: number;
    theme?: ScrollerTheme;
    /** Controlled-mode scroll position. When provided, the component does not own scroll state. */
    scrollPosition?: number;
    /** Fires on every scroll position change, in both controlled and uncontrolled modes. */
    onScroll?: (position: number) => void;
    /** Fires when the scroll position transitions to the start. */
    onReachStart?: () => void;
    /** Fires when the scroll position transitions to the end. */
    onReachEnd?: () => void;
    /** Show the thumb continuously instead of auto-hiding. Default false. */
    alwaysShowThumb?: boolean;
}

const toLength = (v: string | number | undefined): string | undefined =>
    v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

const Scroller = React.forwardRef<ScrollerHandle, ScrollerProps>(({
    orientation,
    children,
    contentSize,
    viewWidth,
    viewHeight,
    theme,
    scrollPosition,
    onScroll,
    onReachStart,
    onReachEnd,
    alwaysShowThumb,
}, ref): JSX.Element => {

    const isHorizontal = orientation === "horizontal";
    const contentId = React.useId();

    const [mouseDownVal, setMouseDownVal] = React.useState<number>();
    const [mouseDownOnSlider, setMouseDownOnSlider] = React.useState(false);
    const [internalScroll, setInternalScroll] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const [isTrackFocused, setIsTrackFocused] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const [measured, setMeasured] = React.useState({ width: 0, height: 0 });
    const [measuredContent, setMeasuredContent] = React.useState({ width: 0, height: 0 });

    const hideDelayMs = theme?.hideDelayMs ?? 1000;
    const fadeMs = theme?.fadeMs ?? 150;
    const minThumbLength = theme?.minThumbLength ?? 30;

    const isControlled = scrollPosition !== undefined;
    const contentScroll = isControlled ? scrollPosition : internalScroll;

    const contentViewRef = React.useRef<HTMLDivElement>(null);
    React.useLayoutEffect(() => {
        const el = contentViewRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setMeasured({ width, height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    React.useLayoutEffect(() => {
        if (contentSize !== undefined) return;
        const el = wrapperRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setMeasuredContent({ width: rect.width, height: rect.height });
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setMeasuredContent({ width, height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [contentSize]);

    const effectiveContentSize = contentSize !== undefined
        ? contentSize
        : (isHorizontal ? measuredContent.width : measuredContent.height);

    const contentViewSize = isHorizontal
        ? (measured.width || viewWidth || 0)
        : (measured.height || viewHeight || 0);
    const sliderTrackLength = contentViewSize;

    const isFirstRender = React.useRef(true);
    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setIsScrolling(true);
        const timeout = setTimeout(() => setIsScrolling(false), hideDelayMs);
        return () => clearTimeout(timeout);
    }, [contentScroll, hideDelayMs]);

    const dragRectRef = React.useRef<DOMRect | null>(null);
    const thumbClickOffsetRef = React.useRef(0);
    const contentScrollRef = React.useRef(contentScroll);
    contentScrollRef.current = contentScroll;

    const posInRect = (event: { clientX: number; clientY: number }, rect: DOMRect) =>
        isHorizontal ? event.clientX - rect.left : event.clientY - rect.top;

    const viewToSizeRatio = contentViewSize / effectiveContentSize;
    const totalOverflow = effectiveContentSize - contentViewSize;
    // Clamp thumb to a minimum length so it stays grabbable on very long content.
    // The clamp is capped at the track length itself (defensive — math falls out cleanly when no overflow).
    const naturalSliderLength = sliderTrackLength * viewToSizeRatio;
    const sliderLength = Math.min(sliderTrackLength, Math.max(minThumbLength, naturalSliderLength));
    const maxSlideableDist = sliderTrackLength - sliderLength;
    const halfSliderLength = sliderLength / 2;
    const fractionScrolled = contentScroll < totalOverflow ? contentScroll / totalOverflow : 1;
    const sliderPosition = Math.max(0, fractionScrolled * maxSlideableDist);

    const thumbStartToContentScroll = (thumbStart: number) => {
        if (maxSlideableDist <= 0) return 0;
        const clamped = Math.max(0, Math.min(maxSlideableDist, thumbStart));
        return (clamped / maxSlideableDist) * totalOverflow;
    };

    const canScroll = totalOverflow > 0 && contentViewSize > 0;
    const ariaValueMax = Math.max(0, totalOverflow);
    const ariaValueNow = Math.max(0, Math.min(contentScroll, ariaValueMax));

    const commitScroll = (next: number | ((prev: number) => number)) => {
        const prev = contentScrollRef.current;
        const raw = typeof next === "function" ? next(prev) : next;
        const clamped = Math.max(0, Math.min(totalOverflow, raw));
        if (clamped === prev) return;
        // Optimistic update so rapid back-to-back commits read fresh values
        // before React re-renders.
        contentScrollRef.current = clamped;
        if (!isControlled) {
            setInternalScroll(clamped);
        }
        onScroll?.(clamped);
    };
    const commitScrollRef = React.useRef(commitScroll);
    commitScrollRef.current = commitScroll;

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!canScroll) return;
        const lineSize = 40;
        const pageSize = contentViewSize;
        const clamp = (v: number) => Math.max(0, Math.min(totalOverflow, v));
        let next: number | null = null;

        switch (e.key) {
            case "ArrowLeft":  if (isHorizontal)  next = clamp(contentScroll - lineSize); break;
            case "ArrowRight": if (isHorizontal)  next = clamp(contentScroll + lineSize); break;
            case "ArrowUp":    if (!isHorizontal) next = clamp(contentScroll - lineSize); break;
            case "ArrowDown":  if (!isHorizontal) next = clamp(contentScroll + lineSize); break;
            case "PageUp":     next = clamp(contentScroll - pageSize); break;
            case "PageDown":   next = clamp(contentScroll + pageSize); break;
            case " ":          if (!isHorizontal) next = clamp(contentScroll + (e.shiftKey ? -pageSize : pageSize)); break;
            case "Home":       next = 0; break;
            case "End":        next = totalOverflow; break;
        }

        if (next !== null) {
            e.preventDefault();
            commitScroll(next);
        }
    };

    React.useEffect(() => {
        const el = contentViewRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (totalOverflow <= 0) return;
            // Horizontal mode: prefer the dominant axis so wheels without an X axis still scroll,
            // and shift+wheel (which the browser already swaps to deltaX) keeps working.
            const delta = isHorizontal
                ? (Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY)
                : e.deltaY;
            if (delta === 0) return;
            const cur = contentScrollRef.current;
            const next = Math.max(0, Math.min(totalOverflow, cur + delta));
            if (next === cur) return; // at boundary; let the page scroll instead
            e.preventDefault();
            commitScrollRef.current(next);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [isHorizontal, totalOverflow]);

    const verticalMod = isHorizontal ? "" : ` ${styles.vertical}`;
    const classes = {
        view: styles.view + verticalMod,
        wrapper: styles.wrapper + verticalMod,
        slider: styles.slider + verticalMod,
    };

    const isDragging = mouseDownVal !== undefined;
    const widthStyle: React.CSSProperties = viewWidth !== undefined
        ? { width: viewWidth }
        : isHorizontal
            ? { width: "100%", maxWidth: effectiveContentSize || undefined }
            : { width: "100%" };
    const heightStyle: React.CSSProperties = viewHeight !== undefined
        ? { height: viewHeight }
        : isHorizontal
            ? { height: "100%" }
            : { height: "100%", maxHeight: effectiveContentSize || undefined };
    const viewStyle: React.CSSProperties = {
        ...widthStyle,
        ...heightStyle,
        cursor: !canScroll ? "default" : isDragging ? "grabbing" : "grab",
    };
    const wrapperStyle: React.CSSProperties = isHorizontal
        ? { width: contentSize ?? "max-content", transform: `translate3d(${-contentScroll}px, 0, 0)` }
        : { height: contentSize ?? "max-content", transform: `translate3d(0, ${-contentScroll}px, 0)` };
    const trackStyle: React.CSSProperties = isHorizontal
        ? { width: sliderTrackLength, position: "absolute", bottom: 0, left: 0 }
        : { height: sliderTrackLength, position: "absolute", top: 0, right: 0 };
    const thumbVisible = canScroll && (alwaysShowThumb || isScrolling || isTrackFocused || isHovered);
    const sliderStyle: React.CSSProperties = {
        ...(isHorizontal
            ? { width: sliderLength, left: sliderPosition }
            : { height: sliderLength, top: sliderPosition }),
        opacity: thumbVisible ? 1 : 0,
        transition: `opacity ${fadeMs}ms`,
    };
    const themeStyle = {
        "--scroller-bg": theme?.backgroundColor,
        "--scroller-thumb-color": theme?.thumbColor,
        "--scroller-thumb-thickness": toLength(theme?.thumbThickness),
        "--scroller-thumb-radius": toLength(theme?.thumbBorderRadius),
        "--scroller-thumb-inset": toLength(theme?.thumbInset),
        "--scroller-focus": theme?.focusColor,
    } as React.CSSProperties;

    const contentView = (
        <div
            ref={contentViewRef}
            id={contentId}
            className={classes.view}
            onPointerDown={(e) => {
                if (!canScroll) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                dragRectRef.current = rect;
                setMouseDownVal(posInRect(e, rect) + contentScroll);
            }}
            onPointerUp={() => {
                setMouseDownVal(undefined);
                dragRectRef.current = null;
            }}
            onPointerCancel={() => {
                setMouseDownVal(undefined);
                dragRectRef.current = null;
            }}
            onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const rect = dragRectRef.current;
                if (!rect || mouseDownVal === undefined) return;
                commitScroll(mouseDownVal - posInRect(e, rect));
            }}
            style={viewStyle}>
                <div ref={wrapperRef} className={classes.wrapper} style={wrapperStyle}>
                    {children}
                </div>
        </div>
    );

    const sliderTrack = (
        <div
            className={styles.track}
            role="scrollbar"
            aria-orientation={orientation}
            aria-valuemin={0}
            aria-valuemax={ariaValueMax}
            aria-valuenow={ariaValueNow}
            aria-controls={contentId}
            tabIndex={canScroll ? 0 : -1}
            onFocus={() => setIsTrackFocused(true)}
            onBlur={() => setIsTrackFocused(false)}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => {
                if (!canScroll) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                dragRectRef.current = rect;
                setMouseDownOnSlider(true);
                const clickPos = posInRect(e, rect);
                const thumbEnd = sliderPosition + sliderLength;
                const isOnThumb = clickPos >= sliderPosition && clickPos <= thumbEnd;
                // On the thumb: preserve the cursor's offset within it so it doesn't jump.
                // On empty track: cursor maps to thumb midpoint, so we still feel "centered."
                const offset = isOnThumb ? clickPos - sliderPosition : halfSliderLength;
                thumbClickOffsetRef.current = offset;
                commitScroll(thumbStartToContentScroll(clickPos - offset));
            }}
            onPointerUp={() => {
                setMouseDownOnSlider(false);
                dragRectRef.current = null;
            }}
            onPointerCancel={() => {
                setMouseDownOnSlider(false);
                dragRectRef.current = null;
            }}
            onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const rect = dragRectRef.current;
                if (!rect || !mouseDownOnSlider) return;
                const cur = posInRect(e, rect);
                commitScroll(thumbStartToContentScroll(cur - thumbClickOffsetRef.current));
            }}
            style={trackStyle}>
            <div className={classes.slider} style={sliderStyle} />
        </div>
    );

    const reachedStartRef = React.useRef(true);
    const reachedEndRef = React.useRef(false);
    React.useEffect(() => {
        const isAtStart = contentScroll <= 0;
        const isAtEnd = totalOverflow > 0 && contentScroll >= totalOverflow;
        if (isAtStart && !reachedStartRef.current) onReachStart?.();
        if (isAtEnd && !reachedEndRef.current) onReachEnd?.();
        reachedStartRef.current = isAtStart;
        reachedEndRef.current = isAtEnd;
    }, [contentScroll, totalOverflow, onReachStart, onReachEnd]);

    React.useImperativeHandle(ref, () => ({
        scrollTo: (position: number) => commitScroll(position),
        scrollBy: (delta: number) => commitScroll((prev) => prev + delta),
        scrollToIndex: (index: number) => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const item = wrapper.children[index] as HTMLElement | undefined;
            if (!item) return;
            commitScroll(isHorizontal ? item.offsetLeft : item.offsetTop);
        },
        getScrollPosition: () => contentScrollRef.current,
    }));

    return (
        <div
            className={styles.scrollerArea}
            style={themeStyle}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setIsHovered(true); }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") setIsHovered(false); }}
        >
            {contentView}
            {sliderTrack}
        </div>
    );
});

Scroller.displayName = "Scroller";

export default Scroller;
