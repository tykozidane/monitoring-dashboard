export const calculateTotalDistance = (coords) => {
    const R = 6371000; // Radius bumi dalam meter

    function toRad(deg) {
        return deg * Math.PI / 180;
    }

    function haversine(p1, p2) {
        const lat1 = toRad(p1[0]);
        const lon1 = toRad(p1[1]);
        const lat2 = toRad(p2[0]);
        const lon2 = toRad(p2[1]);

        const dlat = lat2 - lat1;
        const dlon = lon2 - lon1;

        const a = Math.sin(dlat / 2) ** 2 +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dlon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // hasil dalam meter
    }

    let total = 0;

    for (let i = 0; i < coords.length - 1; i++) {
        total += haversine(coords[i], coords[i + 1]);
    }

    return total; // meter
}
