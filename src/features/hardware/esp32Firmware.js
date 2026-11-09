// Pure front-end template: simulated telemetry, no GPIO or actuator control.
export const ESP32_FIRMWARE = String.raw`// 第七校验 ESP32 telemetry demo — simulated data, no sensor required.
#include <Arduino.h>

constexpr unsigned long SERIAL_BAUD = 115200;

void setup() {
  Serial.begin(SERIAL_BAUD);
}

void loop() {
  // Change light to 50 to try the companion's dark-room sleep response.
  const int light = 300;
  const float temp = 25.0f;  // Simulated Celsius, not a real measurement.

  Serial.print("{\"light\":");
  Serial.print(light);
  Serial.print(",\"temp\":");
  Serial.print(temp, 1);
  Serial.println("}");  // One complete JSON line for the browser decoder.
  delay(1000);
}
`;
