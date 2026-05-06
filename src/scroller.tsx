import * as React from "react";

type Orientation = "horizontal" | "vertical";

interface ScrollerProps {
    orientation: Orientation;
    title: string;
    contentItems: string[];
    contentSize: number;
    viewWidth?: number;
    viewHeight?: number;
}

const Scroller = ({
    orientation,
    title,
    contentItems,
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

    const getMousePosInBoundingRect = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return isHorizontal ? event.clientX - rect.left : event.clientY - rect.top;
    };

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
        ? { view: "content-view-container", wrapper: "content-wrapper", item: "content-item", track: "slider-track", slider: "slider" }
        : { view: "content-view-container-vert", wrapper: "content-wrapper-vert", item: "content-item-vert", track: "slider-track-vert", slider: "slider-vert" };

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
            onMouseDown={(e) => setMouseDownVal(getMousePosInBoundingRect(e) + contentScroll)}
            onMouseUp={() => setMouseDownVal(undefined)}
            onMouseMove={(e) => {
                if (mouseDownVal !== undefined && mouseDownVal >= 0) {
                    const newVal = Math.min(totalOverflow, mouseDownVal - getMousePosInBoundingRect(e));
                    setContentScroll(Math.max(0, newVal));
                }
            }}
            style={viewStyle}>
                <div className={classes.wrapper} style={wrapperStyle}>
                    {contentItems.map((x, i) => (
                        <div key={i} className={classes.item}>{x}</div>
                    ))}
                </div>
        </div>
    );

    const sliderTrack = (
        <div
            className={classes.track}
            onMouseDown={(e) => {
                setMouseDownOnSlider(true);
                // set content scroll such that the slider's midpoint will be where the user clicked, if possible
                // the only time val will be something besides the min or max will be when the slider midpoint is able to where the user clicked.
                // which means the mid point (i.e., the clicked point) should be on [sliderLength / 2, tracklength - (sliderlength / 2)]
                setContentScroll(transformSliderBarVal(getMousePosInBoundingRect(e)));
            }}
            onMouseUp={() => setMouseDownOnSlider(false)}
            onMouseMove={(e) => {
                if (mouseDownOnSlider) {
                    setContentScroll(transformSliderBarVal(getMousePosInBoundingRect(e)));
                }
            }}
            style={trackStyle}>
            <div className={classes.slider} style={sliderStyle} />
        </div>
    );

    return (
        <>
            <h1>{title}</h1>
            <br />
            <br />
            <br />
            <br />
            <div style={{ position: "relative", display: "block" }}>
                {contentView}
                {sliderTrack}
            </div>
        </>
    );
};

export default Scroller;
