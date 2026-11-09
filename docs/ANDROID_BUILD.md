# 安卓（Capacitor 6）构建说明

> Web 仍是唯一代码源；安卓包是 Capacitor WebView 壳。构建机器需自备 JDK17 与 Android SDK 34（本仓库不提交 SDK）。

## 前置
- Node 22+（本机 Node 24 验证）
- JDK 17（`JAVA_HOME`）
- Android SDK：`platforms;android-34`、`build-tools;34.0.0`、`platform-tools`，`ANDROID_HOME` 指向 SDK 根
- 首次需接受 SDK licenses（`sdkmanager --licenses`）

## 构建
```powershell
npm ci
npm run build:local          # 产出 dist/
npx cap sync android         # 复制 dist 到 android/app/src/main/assets/public
cd android
gradlew.bat assembleDebug    # 或 gradlew assembleDebug
```
产物：`android/app/build/outputs/apk/debug/app-debug.apk`

## 本机环境注意（Windows）
本机对 `C:\Users\<用户>\.gradle`、`.android`、`%TEMP%` 的写入被系统策略拒绝，构建时需重定向：
```powershell
$env:GRADLE_USER_HOME='D:\deepseek_file\work\android\gradle-home'
$env:ANDROID_USER_HOME='D:\deepseek_file\work\android\android-home'
$env:TEMP='D:\deepseek_file\work\android\tmp-java'; $env:TMP=$env:TEMP
$env:GRADLE_OPTS="-Djava.io.tmpdir=$env:TEMP -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=7897 -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=7897"
```
代理仅本机需要，不要写进 `android/gradle.properties`（该文件随仓库提交，保持可移植）。

## 版本与签名
- `@capacitor/core|cli|android` 固定 6.2.3（对应 JDK17 + SDK34）
- 当前仅 debug 签名（本机自动生成 debug.keystore），不可公开发布；release 签名与上架需单独配置。
