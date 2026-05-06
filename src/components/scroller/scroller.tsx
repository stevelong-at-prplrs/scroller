import * as React from "react";
import styles from "./scroller.module.css";

type Orientation = "horizontal" | "vertical";

interface ScrollerProps {
    orientation: Orientation;
    title: string;
    children: React.ReactNode;
    contentSize: number;
    viewWidth?: number;
    viewHeight?: number;
}

const Scroller = ({
    orientation,
    title,
    children,
    contentSize,
    viewWidth,
    viewHeight,
}: ScrollerProps): JSX.Element => {

    const isHorizontal = orientation === "horizontal";

    const [mouseDownVal, setMouseDownVal] = React.useState<number>();
    const [mouseDownOnSlider, setMouseDownOnSlider] = React.useState(false);
    const [contentScroll, setContentScroll] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const [measured, setMeasured] = React.useState({ width: 0, height: 0 });

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

    const posInRect = (event: { clientX: number; clientY: number }, rect: DOMRect) =>
        isHorizontal ? event.clientX - rect.left : event.clientY - rect.top;

    const viewToSizeRatio = contentViewSize / contentSize;
    const totalOverflow = contentSize - contentViewSize;
    const sliderLength = sliderTrackLength * viewToSizeRatio;
    const maxSlideableDist = sliderTrackLength - sliderLength;
    const halfSliderLength = sliderLength / 2;
    const maxSliderVal = sliderTrackLength - halfSliderLength;
    const adjSliderRange = maxSliderVal - halfSliderLength;
    const sliderRangeToOverflow = adjSliderRange / totalOverflow;
    const fractionScrolled = contentScroll < totalOverflow ? contentScroll / totalOverflow : 1;
    const sliderPosition = Math.max(0, fractionScrolled * maxSlideableDist);

    const transformSliderBarVal = (num: number) =>
        ((num <= halfSliderLength ? halfSliderLength : num >= maxSliderVal ? maxSliderVal : num) - halfSliderLength) / sliderRangeToOverflow;

    React.useEffect(() => {
        const el = contentViewRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = isHorizontal ? e.deltaX : e.deltaY;
            setContentScroll((prev) => Math.max(0, Math.min(totalOverflow, prev + delta)));
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [isHorizontal, totalOverflow]);

    const classes = isHorizontal
        ? { view: styles.view, wrapper: styles.wrapper, slider: styles.slider }
        : { view: styles.viewVert, wrapper: styles.wrapperVert, slider: styles.sliderVert };

    const isDragging = mouseDownVal !== undefined;
    const widthStyle: React.CSSProperties = viewWidth !== undefined
        ? { width: viewWidth }
        : isHorizontal
            ? { width: "100%", maxWidth: contentSize }
            : { width: "100%" };
    const heightStyle: React.CSSProperties = viewHeight !== undefined
        ? { height: viewHeight }
        : isHorizontal
            ? { height: "100%" }
            : { height: "100%", maxHeight: contentSize };
    const viewStyle: React.CSSProperties = {
        ...widthStyle,
        ...heightStyle,
        cursor: isDragging ? "grabbing" : "grab",
    };
    const wrapperStyle: React.CSSProperties = isHorizontal
        ? { width: contentSize, left: -contentScroll }
        : { height: contentSize, top: -contentScroll };
    const trackStyle: React.CSSProperties = isHorizontal
        ? { width: sliderTrackLength, position: "absolute", bottom: 0, left: 0 }
        : { height: sliderTrackLength, position: "absolute", top: 0, right: 0 };
    const sliderStyle: React.CSSProperties = {
        ...(isHorizontal
            ? { width: sliderLength, left: sliderPosition }
            : { height: sliderLength, top: sliderPosition }),
        opacity: isScrolling ? 1 : 0,
        transition: "opacity 150ms",
    };

    const contentView = (
        <div
            ref={contentViewRef}
            className={classes.view}
            onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                dragRectRef.current = rect;
                setMouseDownVal(posInRect(e, rect) + contentScroll);
            }}
            onMouseUp={() => {
                setMouseDownVal(undefined);
                dragRectRef.current = null;
            }}
            onMouseMove={(e) => {
                const rect = dragRectRef.current;
                if (rect && mouseDownVal !== undefined && mouseDownVal >= 0) {
                    const newVal = Math.min(totalOverflow, mouseDownVal - posInRect(e, rect));
                    setContentScroll(Math.max(0, newVal));
                }
            }}
            style={viewStyle}>
                <div className={classes.wrapper} style={wrapperStyle}>
                    {children}
                </div>
        </div>
    );

    const sliderTrack = (
        <div
            onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                dragRectRef.current = rect;
                setMouseDownOnSlider(true);
                setContentScroll(transformSliderBarVal(posInRect(e, rect)));
            }}
            onMouseUp={() => {
                setMouseDownOnSlider(false);
                dragRectRef.current = null;
            }}
            onMouseMove={(e) => {
                const rect = dragRectRef.current;
                if (rect && mouseDownOnSlider) {
                    setContentScroll(transformSliderBarVal(posInRect(e, rect)));
                }
            }}
            style={trackStyle}>
            <div className={classes.slider} style={sliderStyle} />
        </div>
    );

    return (
        <>
            <h1>{title}</h1>
            <div className={styles.scrollerArea}>
                {contentView}
                {sliderTrack}
            </div>
        </>
    );
};

export default Scroller;
