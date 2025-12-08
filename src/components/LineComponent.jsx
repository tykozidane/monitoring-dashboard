import { Polyline, Tooltip } from "react-leaflet"

const LineComponent = ({item}) => {
    // console.log("Item", item)
    return (
        <Polyline pathOptions={{color: item.color}} positions={item.lines}>
                    <Tooltip direction="top" offset={[0, -30]}>
                        {item.desc}
                    </Tooltip>
        </Polyline>
    );
    
};

export default LineComponent