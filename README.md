# SolianCE

## English

This is an unofficial community client for the Solsynth platform. It is not affiliated with or endorsed by the platform operator. Use at your own discretion.

This project is built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/). You need [Node.js](https://nodejs.org/) (an active LTS release, for example Node.js 20 or 22) and npm.

### Setup

1. Clone this repository.
2. Install dependencies:

```bash
npm install
```

### Run in development

Start the Metro bundler (Expo dev server):

```bash
npm run start
```

Or start and open a specific platform (requires a simulator/emulator or device as appropriate):

```bash
npm run ios
npm run android
npm run web
```

### Type checking

```bash
npx tsc --noEmit
```

### Notes

- For iOS simulators you need Xcode on macOS. For Android emulators you need Android Studio and a configured virtual device.
- Native release builds (App Store, Play Store, or standalone binaries) are not covered here; they typically use EAS Build or platform-specific tooling when you add that workflow to the project.

---

## 中文

这是面向 Solsynth 平台的非官方社区客户端，与平台运营方无关联，亦不代表其立场。请自行评估风险后使用。

本项目使用 [Expo](https://expo.dev/) 与 [React Native](https://reactnative.dev/) 开发。你需要安装 [Node.js](https://nodejs.org/)（建议使用当前或近期的 LTS 版本，例如 Node.js 20 或 22）以及 npm。

### 环境准备

1. 克隆本仓库。
2. 安装依赖：

```bash
npm install
```

### 开发运行

启动 Metro（Expo 开发服务器）：

```bash
npm run start
```

也可以直接启动并尝试打开对应平台（需已配置模拟器/真机环境）：

```bash
npm run ios
npm run android
npm run web
```

### 类型检查

```bash
npx tsc --noEmit
```

### 说明

- 在 macOS 上使用 iOS 模拟器需要安装 Xcode；使用 Android 模拟器需要 Android Studio 及已配置的虚拟设备。
- 本文不涵盖上架商店或生成独立安装包等发布构建流程；若后续接入 EAS Build 或各端原生打包流程，请以其官方文档为准。
