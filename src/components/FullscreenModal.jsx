import React from "react";

const FullscreenModal = ({ item, open, loading, onClose }) => {
    console.log("fullScreen", item)
    if (!open) return null;
    
    const listShowDetailData = [
        {
            "Voltage AC": "voltageac",
            "Temperature": "temperature",
            "Humidity": "humidity",
            "Status" : "status"
        },
        {
            "voltage 1 Channel 1": "voltage10",
            "voltage 2 Channel 1": "voltage11",
            "voltage 3 Channel 1": "voltage12",
            "current 1 Channel 1": "current10",
            "current 2 Channel 1": "current11",
            "current 3 Channel 1": "current12",
        },
        {
            "voltage 1 Channel 2": "voltage20",
            "voltage 2 Channel 2": "voltage21",
            "voltage 3 Channel 2": "voltage22",
            "current 1 Channel 2": "current20",
            "current 2 Channel 2": "current21",
            "current 3 Channel 2": "current22",
        }
]
    return (
        <div 
        className="fixed inset-0 bg-opacity-70 flex justify-center items-center z-9999 overflow-auto"
        >
        <div className="bg-white text-black w-[65%] h-fit rounded-xl p-5 overflow-auto relative mt-10">

            {/* Tombol Close */}
            <button
            className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={onClose}
            >
            Close
            </button>
            
            
            <h2 className="text-2xl  font-bold mb-4">Detail Device</h2>
            {loading && <div className="flex justify-center items-center">Loading data...</div>}
            {!loading && item && (
                <div>
                <div className="grid grid-cols-4">
                    <div className="flex flex-col ">
                        <div className="text-xl font-bold">PROJECT</div>
                        <div className="text-2xl "> {item.n_project_desc} </div>
                    </div>
                    <div className="flex flex-col ">
                        <div className="text-xl font-bold">DEVICE NAME</div>
                        <div className="text-2xl "> {item.n_device_name} </div>
                    </div>
                    <div className="flex flex-col ">
                        <div className="text-xl font-bold">DEVICE CODE</div>
                        <div className="text-2xl "> {item.c_device} </div>
                    </div>
                    <div className="flex flex-col ">
                        <div className="text-xl font-bold">STATION CODE</div>
                        <div className="text-2xl "> {item.n_station} </div>
                    </div>
                </div>
                {
                    listShowDetailData.map((list, i) => (
                        <div key={i} className="flex flex-col justify-center items-center">
                            {/* Garis */}
                            <div className="w-[50%] border-b my-3" />
                            <div className="flex flex-wrap justify-center">
                            {Object.entries(list).map(([key, value]) => (
                                <div key={key} className="border rounded-xl p-4 shadow h-fit w-fit mx-5 my-2 bg-white min-w-40">
                                    <h2 className="text-lg font-semibold mb-2">
                                        {key || "Untitled"}
                                    </h2>

                                    {/* Garis */}
                                    <div className="w-full border-b mb-3" />

                                    {/* Value */}
                                    <div className=" text-xl"> {item.data[value]} </div>
                                </div>
                            ))}
                            </div>
                        </div>
                    ))
                }
                
            </div>
            )}
        </div>
    </div>
    );
};

export default FullscreenModal;
