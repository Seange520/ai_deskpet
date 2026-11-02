// 单一硬件配置源。价格均为演示单价，不作为真实采购报价。
// hardwareImage 是本地代码生成的 SVG，不依赖素材网络或用户上传。
const svg = (label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${label}"><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const face =
  '<rect x="114" y="48" width="92" height="65" rx="15" fill="#203c36"/><g fill="#b9dfc7"><rect x="134" y="67" width="9" height="18" rx="4"/><rect x="177" y="67" width="9" height="18" rx="4"/></g><path d="M152 94q8 9 16 0" fill="none" stroke="#b9dfc7" stroke-width="3"/>';
const board = {
  id: 'board',
  name: 'ESP32-S3 开发板',
  description: '运行程序、处理指令，是整个作品的大脑。',
  price: 49,
  quantity: 1,
  visual: 'cpu',
  tag: '负责思考',
};
const screen = {
  id: 'screen',
  name: '兼容显示屏',
  description: '显示表情与状态；驱动、接口与供电需匹配具体型号。',
  price: 39,
  quantity: 1,
  visual: 'screen',
  tag: '负责表达',
};
const cables = {
  id: 'cables',
  name: '杜邦线与 USB 数据线',
  description: '连接部件并下载程序，USB 线需支持数据传输。',
  price: 16,
  quantity: 1,
  visual: 'cable',
  tag: '负责连接',
};
const part = (id, type, label, width, x, y, z, expandedZ, dx = 0, dy = 0) => ({
  id,
  type,
  label,
  width,
  x,
  y,
  z,
  expandedZ,
  dx,
  dy,
});
const wiring = (
  sourceName,
  sourceTitle,
  pairs,
  description,
  note,
  hud,
  success = '连线正确！下一步已解锁。',
  options = {},
) => ({ sourceName, sourceTitle, pairs, description, note, hud, success, ...options });

export const hardwareRoutes = [
  {
    id: 'classic',
    name: '经典方块桌宠',
    description:
      '从一块屏幕、一对小耳朵开始，做一个安静陪伴你的桌面伙伴。没有舵机，适合第一次创造。',
    difficulty: '入门 · 1 / 4',
    components: [
      board,
      screen,
      {
        id: 'mic',
        name: 'I2S 数字麦克风',
        description: '采集声音；供电接线之外还需音频时钟、字选择与数据线路。',
        price: 15,
        quantity: 1,
        visual: 'microphone',
        tag: '负责倾听',
      },
      cables,
    ],
    hardwareImage: svg(
      '经典方块桌宠路线示意图',
      '<rect x="97" y="31" width="126" height="125" rx="27" fill="#d8d5bd" stroke="#eee8d0" stroke-width="2"/>' +
        face +
        '<path d="M118 158v10h22v-10m42 0v10h22v-10" fill="#9faa93"/><text x="160" y="140" text-anchor="middle" font-size="10" fill="#6b7b66">sparkmate</text>',
    ),
    explodedView: {
      parts: [
        part('board', 'board', 'ESP32-S3 / 大脑', 150, 0, 0, 0, -35),
        part('screen', 'screen', '显示屏 / 表情窗口', 137, 6, 32, 36, 160, 0, -28),
        part('mic', 'microphone', 'I2S 麦克风 / 耳朵', 65, 114, 151, 15, 80, 35, 32),
      ],
    },
    wiring: wiring(
      '麦克风',
      'MICROPHONE',
      [
        ['VCC', '3V3'],
        ['GND', 'GND'],
      ],
      '为麦克风连接电源：VCC → 3V3，GND → GND。',
      'GND 是电压比较的共同基准。真实接线前先断电，并核对具体开发板和麦克风的数据手册；不要把 VCC 接到未知 GPIO 或直接接 5V。本练习仅验证电源概念，不代表完整音频接线。',
      'GPIO 是可编程输入/输出引脚。I²C 使用 SDA、SCL 两根信号线；这里的 I2S 麦克风则另需 BCLK、WS、数据线。',
      '电源连接正确！下一步已解锁。',
    ),
  },
  {
    id: 'quadruped',
    name: '迷你四足机器狗',
    description: '用 8 个 SG90 舵机搭起四条腿，再用小屏幕表达心情。先认识关节，再探索步态。',
    difficulty: '进阶 · 3 / 4',
    components: [
      board,
      { ...screen },
      {
        id: 'servos',
        name: 'SG90 舵机',
        quantity: 8,
        price: 12,
        visual: 'servo',
        description: '每条腿两个关节，共 8 个。先在软件里练习单个舵机的信号与共地。',
        tag: '负责迈步',
      },
      {
        id: 'frame',
        name: '四足机身与连杆',
        quantity: 1,
        price: 45,
        visual: 'chassis',
        description: '支撑八个关节，固定主板与屏幕。几何尺寸需要与舵机匹配。',
        tag: '负责支撑',
      },
      {
        id: 'power',
        name: '舵机独立电源与分配板',
        quantity: 1,
        price: 35,
        visual: 'power',
        description: '按舵机规格选择独立稳压电源与足够电流容量；不能由主板 3V3 给八个舵机供电。',
        tag: '负责供能',
      },
      cables,
    ],
    hardwareImage: svg(
      '迷你四足机器狗路线示意图',
      '<g fill="none" stroke="#c1cdbd" stroke-width="12"><path d="M116 114L83 141l-7 28m128-55l33 27 7 28M140 120l-17 28 7 27m50-55l17 28-7 27"/></g><rect x="91" y="66" width="138" height="69" rx="22" fill="#b7c8bd"/><g fill="#e4bc7e"><circle cx="99" cy="117" r="9"/><circle cx="221" cy="117" r="9"/><circle cx="128" cy="139" r="7"/><circle cx="192" cy="139" r="7"/></g>' +
        face,
    ),
    explodedView: {
      parts: [
        part('frame', 'dogFrame', '四足机身与连杆', 190, -20, 105, 0, -30, 0, 30),
        part('board', 'board', 'ESP32-S3 主控', 100, 25, 22, 20, 35, -35, -10),
        part('servos', 'servoBank', 'SG90 舵机 × 8', 180, -10, 90, 32, 100, 30, 20),
        part('screen', 'screen', '显示屏', 110, 25, 0, 55, 165, 0, -25),
      ],
    },
    wiring: wiring(
      '舵机',
      'SG90 × 8',
      [
        ['VCC', 'EXT5V'],
        ['GND', 'GND'],
        ['PWM', 'GPIO4'],
      ],
      '单关节供电与信号：VCC → 独立电源 EXT5V，GND → GND，PWM → GPIO4。',
      '这是一个舵机信号与共地的示意练习，不是八舵机完整接线。舵机使用按规格选定的独立电源；其地与主板共地。GPIO4 仅为示例分配，真实系统还需其余关节的 PWM 通道、屏幕接口和供电设计。',
      'PWM 脉冲用来表达关节目标位置；GND 提供共同参考。舵机电源不接主板 3V3。',
      '连线正确！下一步已解锁。',
      { targetNames: { EXT5V: '独立电源' }, targetTitle: 'ESP32-S3 + EXT5V' },
    ),
  },
  {
    id: 'tracked',
    name: '履带/麦轮小车',
    description:
      '让创意动起来。本练习以双电机履带底盘为例；麦轮扩展需要四轮独立驱动与额外控制通道。',
    difficulty: '探索 · 2 / 4',
    components: [
      board,
      {
        id: 'chassis',
        name: '履带底盘（默认方案）',
        quantity: 1,
        price: 79,
        visual: 'chassis',
        description: '包含左右履带与减速电机。切换麦轮机械方案时须重新匹配电机数量与驱动通道。',
        tag: '负责移动',
      },
      {
        id: 'driver',
        name: 'L298N 电机驱动模块',
        quantity: 1,
        price: 25,
        visual: 'driver',
        description: '将主板控制信号转换为电机驱动；需核对额定电压、电流和逻辑门限。',
        tag: '负责驱动',
      },
      {
        id: 'power',
        name: '电机独立供电与保护模块',
        quantity: 1,
        price: 35,
        visual: 'power',
        description: '按电机和驱动规格匹配供电与保护，不让电机负载经过主板 GPIO。',
        tag: '负责供能',
      },
      cables,
    ],
    hardwareImage: svg(
      '履带麦轮小车路线示意图',
      '<rect x="54" y="78" width="49" height="97" rx="21" fill="#40544d" stroke="#94a99e" stroke-width="3"/><rect x="217" y="78" width="49" height="97" rx="21" fill="#40544d" stroke="#94a99e" stroke-width="3"/><g stroke="#94a99e" stroke-width="3"><path d="M59 98h38m-38 18h38m-38 18h38m-38 18h38m126-54h38m-38 18h38m-38 18h38m-38 18h38"/></g><rect x="94" y="84" width="132" height="67" rx="17" fill="#b7c8bd"/><rect x="130" y="65" width="60" height="55" rx="9" fill="#587665"/><rect x="142" y="76" width="36" height="26" rx="3" fill="#b7c3bc"/>',
    ),
    explodedView: {
      parts: [
        part('chassis', 'tracks', '履带底盘与减速电机', 210, -30, 65, 0, -25, 0, 30),
        part('board', 'board', 'ESP32-S3 主控', 100, 8, 10, 20, 65, -35, -15),
        part('driver', 'driver', 'L298N 电机驱动', 100, 70, 55, 45, 145, 35, -15),
      ],
    },
    wiring: wiring(
      '电机驱动',
      'MOTOR DRIVER',
      [
        ['IN1', 'GPIO5'],
        ['IN2', 'GPIO6'],
        ['ENA', 'GPIO7'],
        ['GND', 'GND'],
      ],
      'L298N 的一个 H 桥：IN1 → GPIO5、IN2 → GPIO6、ENA → GPIO7、GND → GND。',
      '本练习验证单个 H 桥的方向、使能与共地。L298N 逻辑电源、电机电源和输出端仍需按具体模块接好；ENA 跳帽与 GPIO 控制方案须核对。麦轮需要四轮独立控制，不能直接照搬双电机配置。',
      'GPIO 提供控制信号，不直接驱动电机。IN1 是本练习的示意输入，具体模块的引脚名称与逻辑门限以资料为准。',
    ),
  },
  {
    id: 'spherical',
    name: '球形自平衡机器人',
    description: '用 IMU 感知姿态，在球壳内探索平衡与运动。需要执行机构和闭环控制，适合继续挑战。',
    difficulty: '挑战 · 4 / 4',
    components: [
      board,
      {
        id: 'imu',
        name: 'MPU6050 六轴陀螺仪模块',
        quantity: 1,
        price: 25,
        visual: 'imu',
        description: '通过 I²C 读取加速度与角速度；需确认模块供电、上拉电阻与逻辑电平。',
        tag: '负责感知',
      },
      {
        id: 'shell',
        name: '球形外壳与内部支架',
        quantity: 1,
        price: 69,
        visual: 'shell',
        description: '容纳主控、传感器与内部执行机构，便于观察重心与结构。',
        tag: '负责承载',
      },
      {
        id: 'actuator',
        name: '内部执行机构与匹配驱动',
        quantity: 1,
        price: 89,
        visual: 'motors',
        description: '通过内部电机与机构改变运动状态。IMU 本身不能让球体自动平衡。',
        tag: '负责调节',
      },
      {
        id: 'power',
        name: '独立供电与保护模块',
        quantity: 1,
        price: 35,
        visual: 'power',
        description: '根据执行机构规格匹配供电、保护及稳压，避免把负载接到主板 GPIO。',
        tag: '负责供能',
      },
      cables,
    ],
    hardwareImage: svg(
      '球形自平衡机器人路线示意图',
      '<circle cx="160" cy="100" r="78" fill="#b3d0c01a" stroke="#b9cbbc" stroke-width="3"/><ellipse cx="160" cy="100" rx="36" ry="78" fill="none" stroke="#9eb7a780" stroke-width="2"/><ellipse cx="160" cy="100" rx="78" ry="25" fill="none" stroke="#9eb7a780" stroke-width="2"/><rect x="128" y="73" width="64" height="50" rx="9" fill="#7c9a88"/><rect x="143" y="86" width="34" height="24" rx="4" fill="#d9d8bd"/><circle cx="131" cy="139" r="13" fill="#d2b582"/><circle cx="189" cy="139" r="13" fill="#d2b582"/>',
    ),
    explodedView: {
      parts: [
        part('actuator', 'actuator', '内部执行机构与支架', 150, 0, 92, 0, -25, 0, 25),
        part('board', 'board', 'ESP32-S3 主控', 100, 25, 20, 15, 40, -40, 0),
        part('imu', 'imu', 'MPU6050 六轴传感器', 80, 85, 80, 35, 105, 40, 5),
        part('shell', 'shell', '球形外壳', 210, -30, -10, 70, 170, -15, -30),
      ],
    },
    wiring: wiring(
      'IMU',
      'MPU6050 / I²C',
      [
        ['VCC', '3V3'],
        ['GND', 'GND'],
        ['SDA', 'GPIO8'],
        ['SCL', 'GPIO9'],
      ],
      '认识 I²C：VCC → 3V3、GND → GND、SDA → GPIO8、SCL → GPIO9。',
      '本练习使用可配置的示例 I²C 引脚，需在固件中设置相同 SDA/SCL。IMU 电平须与主板兼容；练习不包含执行机构接线、姿态解算和闭环平衡算法。完成四根线不等于完成自平衡机器人。',
      'I²C 的 SDA 传输数据、SCL 提供时钟；它们不同于供电引脚。这里 GPIO8/9 是示例选择，实际分配应避开其他外设并核对开发板资料。',
    ),
  },
];

export const DEFAULT_ROUTE_ID = 'classic';
export function isRouteId(id) {
  return hardwareRoutes.some((route) => route.id === id);
}
export function getHardwareRoute(id) {
  return hardwareRoutes.find((route) => route.id === id) || hardwareRoutes[0];
}
export function getRoutePrice(route) {
  return route.components.reduce((total, item) => total + item.price * item.quantity, 0);
}
