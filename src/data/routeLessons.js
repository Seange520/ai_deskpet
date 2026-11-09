// 四条路线的课程内容集中维护。代码是教学示例，浏览器不编译、不烧录。
export const routeLessons = {
  classic: {
    title: '表情实验',
    control: '眨眼间隔',
    tip: '经典路线先把表情控制做好，再接入声音与 AI。ChecksumDemo.h 是教学占位 API，不能直接编译。',
    warnings: [
      {
        title: '接线警告',
        text: '接线警告：绝对不能把 VCC 和 GND 接反，通电瞬间主板芯片就会冒烟报废！',
        detail:
          '这是强化记忆的极端情景；真实损坏程度取决于供电与保护电路。先断电，核对模块极性后再通电。',
      },
    ],
  },
  quadruped: {
    title: '单关节角度实验',
    control: '关节角度',
    tip: '展示标准 Arduino 的 <Servo.h> 用法；ESP32-S3 分支使用 ESP32Servo.h。这里只控制 8 个 SG90 中的一个关节，非完整步态。模拟限定 45–135°，实际机械限位和脉宽必须先拆下连杆校准。',
    warnings: [
      {
        title: '接线警告',
        text: '接线警告：绝对不能把 VCC 和 GND 接反，通电瞬间主板芯片就会冒烟报废！',
        detail: '模拟烧板用来记住极性；先断电检查。舵机电源 VCC 在本练习接独立电源，不接主板 3V3。',
      },
      {
        title: '舵机干扰警告',
        text: '舵机干扰警告：8个舵机同时转动会导致电压骤降，ESP32 会疯狂重启，记得给舵机单独供电！',
        detail:
          '风险取决于电源容量和负载。独立稳压供电须匹配舵机规格与启动/堵转电流，并与主板共地。',
      },
      {
        title: '买线警告',
        text: '买线警告：别买公对公杜邦线！很多时候你的针脚根本插不进去，买公对母的！',
        detail:
          '先核对两端接头：排针对排针通常用母对母，排针对排母可用公对母；面包板等场景仍会用到公对公。不要只按这句口诀购买。',
      },
    ],
  },
  tracked: {
    title: 'L298N 正反转实验',
    control: '电机方向',
    tip: '示例控制 L298N 的一个 H 桥：IN1/IN2 决定方向，ENA 决定使能。停止时先关闭 ENA；反转前先停机，实际等待时间应按负载确定。另一侧履带和四轮麦轮需要额外驱动通道。',
    warnings: [
      {
        title: '买线警告',
        text: '买线警告：别买公对公杜邦线！很多时候你的针脚根本插不进去，买公对母的！',
        detail:
          '先核对 L298N 模块、主板与底盘端子的接头。排针对排针通常用母对母，排针对排母可用公对母，螺丝端子还需合适的线材。',
      },
      {
        title: '驱动供电警告',
        text: '电机不能直接接 ESP32 的 GPIO！先接匹配的 L298N 驱动，再核对电机电源与逻辑电源。',
        detail:
          '模块的 5V 跳帽、稳压器和电源接法各不相同。不要将模块 5V 输出接入 ESP32 的 3V3；负载电流、散热与芯片压降也要核对。',
      },
    ],
  },
  spherical: {
    title: 'MPU6050 姿态读取实验',
    control: '模拟俯仰角',
    tip: 'MPU6050 提供加速度（m/s²）与角速度（rad/s），并不直接输出可靠的姿态角。示例用重力方向估计静态俯仰角，运动时需滤波与传感器融合；这里没有实现自平衡闭环。',
    warnings: [
      {
        title: '传感器读数警告',
        text: '陀螺仪读到的是角速度，不是角度；直接累加会漂移，不能把一行读数当成自平衡算法。',
        detail:
          '先验证静止时的重力方向、量程与零偏，再设计融合与控制。确认 MPU6050 模块电源和 I²C 上拉兼容 3.3V。',
      },
    ],
  },
};

export function getLessonCode(routeId, { speed, color, expression, angle, direction, tilt }) {
  let code;
  if (routeId === 'quadruped')
    code = `// 8 × SG90：先验证一个关节；独立供电并共地
#if defined(ARDUINO_ARCH_ESP32)
#include <ESP32Servo.h> // ESP32-S3 使用此库
#else
#include <Servo.h> // 标准 Arduino Servo API
#endif
Servo myServo;
const int servoPin = 4;
void setup() {
  myServo.attach(servoPin);
}
void loop() {
  myServo.write(${angle}); // 当前关节目标角度，单位 °
  delay(20); // 不是八关节步态程序
}`;
  else if (routeId === 'tracked')
    code = `// L298N 单个 H 桥示意；ENA 跳帽与供电需核对
const int MotorA = 5; // IN1
const int MotorB = 6; // IN2
const int EnableA = 7; // ENA
enum Direction { STOP, FORWARD, REVERSE };
Direction mode = ${direction.toUpperCase()};
void setup() {
  pinMode(MotorA, OUTPUT);
  pinMode(MotorB, OUTPUT);
  pinMode(EnableA, OUTPUT);
}
void loop() {
  digitalWrite(EnableA, LOW); // 改向前先停机
  delay(200); // 示意等待，真实值按负载设计
  if (mode == FORWARD) {
    digitalWrite(MotorA, HIGH);
    digitalWrite(MotorB, LOW);
  } else if (mode == REVERSE) {
    digitalWrite(MotorA, LOW);
    digitalWrite(MotorB, HIGH);
  }
  digitalWrite(EnableA, mode == STOP ? LOW : HIGH);
  delay(1000); // 仅演示单通道正转/反转/滑行停机
}`;
  else if (routeId === 'spherical')
    code = `// MPU6050：传感器示例，不是平衡控制器
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
Adafruit_MPU6050 mpu;
void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9); // SDA / SCL，与接线练习一致
  if (!mpu.begin()) { while (true) delay(10); }
}
void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float roll = atan2(a.acceleration.y, a.acceleration.z) * 180 / PI;
  float pitch = atan2(-a.acceleration.x,
    sqrt(sq(a.acceleration.y) + sq(a.acceleration.z))) * 180 / PI;
  Serial.println(a.acceleration.x); // m/s²
  Serial.println(g.gyro.y); // rad/s；角速度不是角度
  Serial.println(pitch); // °；重力方向静态估计
  delay(100);
}
// 浏览器假定静止倾斜 ${tilt}°，并不读取真实传感器`;
  else
    code = `// 第七校验 表情实验 · Arduino 风格伪代码
// 参数通过下方控件修改，右侧立即预览
#include <ChecksumDemo.h>

void setup() {
  pet.begin();
  pet.setTheme("${color}");
}

void loop() {
  pet.setExpression("${expression}");
  pet.blinkEvery(${speed}); // 毫秒
  pet.update(); // 持续刷新
}`;
  return code
    .split('\n')
    .map((line) => [
      line.trim().startsWith('//')
        ? 'comment'
        : line.trim().startsWith('#')
          ? 'keyword'
          : line.includes('write(') ||
              line.includes('digitalWrite') ||
              line.includes('pet.') ||
              line.includes('pitch')
            ? 'value'
            : 'plain',
      line,
    ]);
}
