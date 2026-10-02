import { FloodEvent } from '../types';
import { HcmcQuadrant } from './weatherService';

export interface VulnerableCorridor {
  id: string;
  streetName: string;
  district: string;
  city: string;
  quadrant: HcmcQuadrant;
  rainThresholdMm: number; // Precipitation threshold in mm/h that overwhelms drainage
  baseDepthCm: number;     // Standard depth in cm during typical overflow
  coordinate: [number, number]; // [lng, lat]
  description: string;
}

export const HCMC_VULNERABLE_CORRIDORS: VulnerableCorridor[] = [
  {
    id: 'corridor-phan-huy-ich',
    streetName: 'Phan Huy Ích',
    district: 'Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'northwest',
    rainThresholdMm: 30,
    baseDepthCm: 45,
    coordinate: [106.6340, 10.8350],
    description: 'Vùng trũng ảnh hưởng thoát nước lưu vực kênh Tham Lương',
  },
  {
    id: 'corridor-le-duc-tho',
    streetName: 'Lê Đức Thọ',
    district: 'Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'northwest',
    rainThresholdMm: 35,
    baseDepthCm: 40,
    coordinate: [106.6710, 10.8450],
    description: 'Điểm trũng ngập đoạn ngã tư Lê Đức Thọ - Nguyễn Oanh',
  },
  {
    id: 'corridor-nguyen-van-khoi',
    streetName: 'Nguyễn Văn Khối',
    district: 'Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'northwest',
    rainThresholdMm: 25,
    baseDepthCm: 45,
    coordinate: [106.6540, 10.8480],
    description: 'Đoạn công viên Làng Hoa trũng thấp kinh niên',
  },
  {
    id: 'corridor-nguyen-van-qua',
    streetName: 'Nguyễn Văn Quá',
    district: 'Quận 12',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'northwest',
    rainThresholdMm: 30,
    baseDepthCm: 55,
    coordinate: [106.6273, 10.8415],
    description: 'Đoạn chợ Cầu quá tải cống hộp thường xuyên tê liệt khi mưa to',
  },
  {
    id: 'corridor-song-hanh-ql22',
    streetName: 'Song Hành Quốc Lộ 22',
    district: 'Quận 12',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'northwest',
    rainThresholdMm: 35,
    baseDepthCm: 40,
    coordinate: [106.6110, 10.8570],
    description: 'Khu vực giáp Hóc Môn thu nước mặt đường diện rộng',
  },
  {
    id: 'corridor-vo-van-ngan',
    streetName: 'Võ Văn Ngân',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'east',
    rainThresholdMm: 35,
    baseDepthCm: 50,
    coordinate: [106.7570, 10.8520],
    description: 'Độ dốc địa hình lớn tạo dòng nước xiết từ chợ Thủ Đức',
  },
  {
    id: 'corridor-to-ngoc-van',
    streetName: 'Tô Ngọc Vân',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'east',
    rainThresholdMm: 30,
    baseDepthCm: 40,
    coordinate: [106.7450, 10.8650],
    description: 'Điểm trũng đoạn giao cắt đường sắt Bắc Nam',
  },
  {
    id: 'corridor-quoc-huong',
    streetName: 'Quốc Hương',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'east',
    rainThresholdMm: 25,
    baseDepthCm: 45,
    coordinate: [106.7326, 10.8038],
    description: 'Khu vực Thảo Điền hạ tầng trũng thấp',
  },
  {
    id: 'corridor-ung-van-khiem',
    streetName: 'Ung Văn Khiêm',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'east',
    rainThresholdMm: 30,
    baseDepthCm: 45,
    coordinate: [106.7170, 10.8080],
    description: 'Đoạn ngã ba Ung Văn Khiêm - D2 Nguyễn Gia Trí',
  },
  {
    id: 'corridor-nguyen-huu-canh',
    streetName: 'Nguyễn Hữu Cảnh',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'center',
    rainThresholdMm: 35,
    baseDepthCm: 40,
    coordinate: [106.7180, 10.7915],
    description: 'Lòng chảo chân cầu Thủ Thiêm',
  },
  {
    id: 'corridor-tran-xuan-soan',
    streetName: 'Trần Xuân Soạn',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'south',
    rainThresholdMm: 30,
    baseDepthCm: 45,
    coordinate: [106.7082, 10.7485],
    description: 'Khu vực bờ kè Kênh Tẻ ngập sâu khi mưa kết hợp triều',
  },
  {
    id: 'corridor-huynh-tan-phat',
    streetName: 'Huỳnh Tấn Phát',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'south',
    rainThresholdMm: 30,
    baseDepthCm: 45,
    coordinate: [106.7325, 10.7349],
    description: 'Đoạn giao cắt Nguyễn Thị Thập và cầu Phú Xuân',
  },
  {
    id: 'corridor-le-van-luong',
    streetName: 'Lê Văn Lương',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'south',
    rainThresholdMm: 25,
    baseDepthCm: 40,
    coordinate: [106.7011, 10.7412],
    description: 'Đoạn qua các cầu Rạch Đỉa và Long Kiểng trũng thấp',
  },
  {
    id: 'corridor-ho-hoc-lam',
    streetName: 'Hồ Học Lãm',
    district: 'Bình Tân',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'center',
    rainThresholdMm: 25,
    baseDepthCm: 50,
    coordinate: [106.6180, 10.7220],
    description: 'Đoạn nối An Dương Vương ra đại lộ Võ Văn Kiệt',
  },
  {
    id: 'corridor-an-duong-vuong',
    streetName: 'An Dương Vương',
    district: 'Quận 8',
    city: 'TP. Hồ Chí Minh',
    quadrant: 'center',
    rainThresholdMm: 30,
    baseDepthCm: 40,
    coordinate: [106.6250, 10.7300],
    description: 'Vùng trũng giáp ranh Quận 8 và Bình Tân',
  },
];

/**
 * Evaluates real-time precipitation against vulnerable corridors and produces active FloodEvents.
 */
export function getRainInducedFloodEvents(
  targetDate: Date,
  rainByQuadrant: Record<HcmcQuadrant, number>
): FloodEvent[] {
  const events: FloodEvent[] = [];

  for (const corridor of HCMC_VULNERABLE_CORRIDORS) {
    const quadrantRain = rainByQuadrant[corridor.quadrant] || 0;

    // Trigger flood obstacle if quadrant precipitation meets or exceeds corridor threshold
    if (quadrantRain >= corridor.rainThresholdMm) {
      const rainRatio = quadrantRain / corridor.rainThresholdMm;
      // Inundation depth scales smoothly with rain intensity, up to 75cm maximum
      const estimatedDepthCm = Math.min(75, Math.round(corridor.baseDepthCm * Math.sqrt(rainRatio)));

      // Active rainfall flood lifecycle: starts 30m prior, peaks at target, recedes over 90m
      const startTime = new Date(targetDate.getTime() - 30 * 60 * 1000);
      const peakTime = new Date(targetDate.getTime());
      const endTime = new Date(targetDate.getTime() + 90 * 60 * 1000);

      events.push({
        id: `rain-${corridor.id}`,
        title: `Mưa lớn gây ngập: ${corridor.streetName} (${corridor.district})`,
        sourceType: 'weather_radar',
        cause: 'heavy_rain',
        streetName: corridor.streetName,
        district: corridor.district,
        city: corridor.city,
        startTime,
        peakTime,
        endTime,
        estimatedDepthCm,
        confidenceScore: Math.min(1.0, 0.85 + 0.05 * Math.min(3, rainRatio)),
        geometry: {
          type: 'Point',
          coordinates: corridor.coordinate,
        },
      });
    }
  }

  return events;
}
