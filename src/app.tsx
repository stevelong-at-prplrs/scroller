import Scroller from "./components/scroller/scroller";

const verticalContent = [...Array(40)].map(() => `${" "}Content`);
const horizontalContent = [...Array(11)].map(() => `${" "}Content`);

export const App = (): JSX.Element => {
    return (
        <div className="container">
            <Scroller
                orientation="vertical"
                title="Scroller - vertical"
                viewHeight={500}
                theme={{
                    backgroundColor: "#0d3b3a",
                    thumbColor: "rgba(255, 255, 255, 0.6)",
                    thumbThickness: 14,
                    thumbBorderRadius: 7,
                    thumbInset: 4,
                }}
            >
                {verticalContent.map((x, i) => (
                    <div key={i} className="content-item-vert">{x}</div>
                ))}
            </Scroller>
            <Scroller
                orientation="horizontal"
                title="Scroller - horizontal"
                viewWidth={800}
                viewHeight={100}
                theme={{
                    backgroundColor: "#2d1b3d",
                    thumbColor: "rgba(255, 152, 0, 0.75)",
                    thumbThickness: 12,
                    thumbBorderRadius: 2,
                    thumbInset: 5,
                }}
            >
                {horizontalContent.map((x, i) => (
                    <div key={i} className="content-item">{x}</div>
                ))}
            </Scroller>
        </div>
    );
}
