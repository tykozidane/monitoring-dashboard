import React from "react";

const ListDeviceModal = ({ item,station, open, loading, onClose, funcClick }) => {
    console.log("DeviceListScreen", item)
    if (!open) return null;
    return (
        <div 
        className="fixed inset-0 bg-opacity-70 flex justify-center items-center z-9998"
        >
        <div className="bg-white text-black w-[70%] h-fit rounded-xl p-12 overflow-auto relative flex flex-col justify-center items-center">

            {/* Tombol Close */}
            <button
            className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={onClose}
            >
            Close
            </button>
            
            
            <h2 className="text-2xl  font-bold mb-4">List Device in {station.n_station}</h2>
               {/* Garis */}
                            <div className="w-[70%] border-b my-3" />
            <div className="grid grid-cols-5 justify-items-center content-center w-full min-h-24 px-5 py-3 rounded-lg cursor-pointer font-bold text-lg">
                                <div className="col-span-3 w-full h-full">
                                    Device Name
                                </div>
                                <div className="w-full border-l-2  h-full">
                                    Device Type
                                </div>
                                <div className="w-full border-l-2 h-full">
                                    Status
                                </div>
                            </div>
            {loading && <div className="flex justify-center items-center">Loading data...</div>}
            {!loading && item && (
                <>
                {
                    item.map((device, i) => (
                            <div key={i} className="grid grid-cols-5 text-lg font-semibold justify-items-center content-center w-full min-h-24 px-5 py-3 rounded-lg hover:bg-gray-200 cursor-pointer"
                            onClick={()=> funcClick({c_device: device.c_device, c_project:device.c_project})}
                            >
                                <div className="justify-self-start col-span-3 h-full" >
                                    {device.n_device_name}
                                </div>
                                <div className="w-full border-l-2 h-full">
                                    {device.n_device_subtype_name}
                                </div>
                                {
                                    device.status === "OK" ? (
                                        <div className="w-full border-l-2 border-black h-full text-green-600 font-bold">
                                            {device.status}
                                        </div>
                                    ) : device.status === "Warning" ? (
                                        <div className=" w-full border-l-2 border-black h-full text-yellow-600 font-bold">
                                            {device.status}
                                        </div>
                                    ) : device.status === "NOT OK" ? (
                                        <div className=" w-full border-l-2 border-black h-full text-red-600 font-bold">
                                            {device.status}
                                        </div>
                                    ) : (
                                        <div className=" w-full border-l-2 border-black h-full text-gray-600 font-bold">
                                            {device.status}
                                        </div>
                                    )
                                }
                            </div>
                    ))
                }
                
            </>
            )}
        </div>
    </div>
    );
};

export default ListDeviceModal;
