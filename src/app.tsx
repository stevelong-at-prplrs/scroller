import Scroller from "./scroller";

const verticalContent = [...Array(40)].map(() => `${'\u00A0'}Content`);
const horizontalContent = [...Array(11)].map(() => `${'\u00A0'}Content`);

export const App = (): JSX.Element => {
    return (
        <div className="container">
            <Scroller
                orientation="vertical"
                title="Scroller - vertical"
                contentItems={verticalContent}
                contentSize={verticalContent.length * 24}
                viewHeight={500}
            />
            <Scroller
                orientation="horizontal"
                title="Scroller - horizontal"
                contentItems={horizontalContent}
                contentSize={horizontalContent.length * 100}
                viewWidth={800}
                viewHeight={100}
            />
        </div>
    );
}
