import Scroller from "./components/scroller/scroller";

const verticalContent = [...Array(40)].map(() => `${" "}Content`);
const horizontalContent = [...Array(11)].map(() => `${" "}Content`);

export const App = (): JSX.Element => {
    return (
        <div className="container">
            <Scroller
                orientation="vertical"
                title="Scroller - vertical"
                contentSize={verticalContent.length * 24}
                viewHeight={500}
            >
                {verticalContent.map((x, i) => (
                    <div key={i} className="content-item-vert">{x}</div>
                ))}
            </Scroller>
            <Scroller
                orientation="horizontal"
                title="Scroller - horizontal"
                contentSize={horizontalContent.length * 100}
                viewWidth={800}
                viewHeight={100}
            >
                {horizontalContent.map((x, i) => (
                    <div key={i} className="content-item">{x}</div>
                ))}
            </Scroller>
        </div>
    );
}
