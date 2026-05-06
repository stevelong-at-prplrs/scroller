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
}

interface ScrollerProps {
    orientation: Orientation;
    title: string;
    children: React.ReactNode;
    contentSize?: number;
    viewWidth?: number;
    viewHeight?: number;
    theme?: ScrollerTheme;
}

const toLength = (v: string | number | undefined): string | undefined =>
    v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

const Scroller = ({
    orientation,
    title,
    children,
    contentSize,
    viewWidth,
    viewHeight,
    theme,
}: ScrollerProps): JSX.Element => {

    const isHorizontal = orientation === "horizontal";
    const contentId = React.useId();

    const [mouseDownVal, setMouseDownVal] = React.useState<number>();
    const [mouseDownOnSlider, setMouseDownOnSlider] = React.useState(false);
    const [contentScroll, setContentScroll] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const [isTrackFocused, setIsTrackFocused] = React.useState(false);
    const [measured, setMeasured] = React.useState({ width: 0, height: 0 });
    const [measuredContent, setMeasuredContent] = React.useState({ width: 0, height: 0 });

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
        const timeout = setTimeout(() => setIsScrolling(false), 1000);
        return () => clearTimeout(timeout);
    }, [contentScroll]);

    const dragRectRef = React.useRef<DOMRect | null>(null);
    const thumbClickOffsetRef = React.useRef(0);
    const contentScrollRef = React.useRef(contentScroll);
    contentScrollRef.current = contentScroll;

    const posInRect = (event: { clientX: number; clientY: number }, rect: DOMRect) =>
        isHorizontal ? event.clientX - rect.left : event.clientY - rect.top;

    const viewToSizeRatio = contentViewSize / effectiveContentSize;
    const totalOverflow = effectiveContentSize - contentViewSize;
    const sliderLength = sliderTrackLength * viewToSizeRatio;
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
            setContentScroll(next);
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
            setContentScroll(next);
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
        ? { width: contentSize ?? "max-content", left: -contentScroll }
        : { height: contentSize ?? "max-content", top: -contentScroll };
    const trackStyle: React.CSSProperties = isHorizontal
        ? { width: sliderTrackLength, position: "absolute", bottom: 0, left: 0 }
        : { height: sliderTrackLength, position: "absolute", top: 0, right: 0 };
    const sliderStyle: React.CSSProperties = {
        ...(isHorizontal
            ? { width: sliderLength, left: sliderPosition }
            : { height: sliderLength, top: sliderPosition }),
        opacity: canScroll && (isScrolling || isTrackFocused) ? 1 : 0,
        transition: "opacity 150ms",
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
                const newVal = Math.min(totalOverflow, mouseDownVal - posInRect(e, rect));
                setContentScroll(Math.max(0, newVal));
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
                setContentScroll(thumbStartToContentScroll(clickPos - offset));
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
                setContentScroll(thumbStartToContentScroll(cur - thumbClickOffsetRef.current));
            }}
            style={trackStyle}>
            <div className={classes.slider} style={sliderStyle} />
        </div>
    );

    return (
        <>
            <h1>{title}</h1>
            <div className={styles.scrollerArea} style={themeStyle}>
                {contentView}
                {sliderTrack}
            </div>
        </>
    );
};

export default Scroller;
