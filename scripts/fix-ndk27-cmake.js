#!/usr/bin/env node
// Patches react-native-screens and react-native-worklets CMakeLists.txt
// to explicitly link libc++_shared, required for NDK 27+.
const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: path.join(__dirname, '../node_modules/react-native-screens/android/CMakeLists.txt'),
    search: '            fbjni::fbjni\n            android\n        )',
    replace: '            fbjni::fbjni\n            android\n            c++_shared\n        )',
  },
  {
    file: path.join(__dirname, '../node_modules/expo-modules-core/android/CMakeLists.txt'),
    search: '  android\n  ${JSEXECUTOR_LIB}\n  ${NEW_ARCHITECTURE_DEPENDENCIES}\n)',
    replace: '  android\n  ${JSEXECUTOR_LIB}\n  ${NEW_ARCHITECTURE_DEPENDENCIES}\n  c++_shared\n)',
  },
  {
    file: path.join(__dirname, '../node_modules/expo-sqlite/android/CMakeLists.txt'),
    search: '  fbjni::fbjni\n  android\n)',
    replace: '  fbjni::fbjni\n  android\n  c++_shared\n)',
  },
  {
    file: path.join(__dirname, '../node_modules/react-native-reanimated/android/CMakeLists.txt'),
    search: 'target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni android\n                      worklets)',
    replace: 'target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni android\n                      worklets c++_shared)',
  },
  {
    file: path.join(__dirname, '../node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt'),
    search: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  ReactAndroid::reactnative\n  ReactAndroid::jsi\n  fbjni::fbjni\n)',
    replace: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  ReactAndroid::reactnative\n  ReactAndroid::jsi\n  fbjni::fbjni\n  c++_shared\n)',
  },
  {
    file: path.join(__dirname, '../node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt'),
    search: '  target_link_libraries(\n          ${LIB_TARGET_NAME}\n          fbjni\n          jsi\n          reactnative\n  )',
    replace: '  target_link_libraries(\n          ${LIB_TARGET_NAME}\n          fbjni\n          jsi\n          reactnative\n          c++_shared\n  )',
  },
  {
    // react-native-worklets 0.7.x / 0.8.x format
    file: path.join(__dirname, '../node_modules/react-native-worklets/android/CMakeLists.txt'),
    search: 'target_link_libraries(worklets log ReactAndroid::reactnative ReactAndroid::jsi\n                      fbjni::fbjni)',
    replace: 'target_link_libraries(worklets log ReactAndroid::reactnative ReactAndroid::jsi\n                      fbjni::fbjni c++_shared)',
  },
  {
    // react-native-worklets 0.5.x format (fallback)
    file: path.join(__dirname, '../node_modules/react-native-worklets/android/CMakeLists.txt'),
    search: 'target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni)',
    replace: 'target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni c++_shared)',
  },
];

const seen = new Set();
let allOk = true;
for (const { file, search, replace } of fixes) {
  if (!fs.existsSync(file)) {
    if (!seen.has(file)) console.log(`[fix-ndk27] Skipping (not found): ${path.relative(process.cwd(), file)}`);
    seen.add(file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(replace)) {
    if (!seen.has(file)) console.log(`[fix-ndk27] Already patched: ${path.relative(process.cwd(), file)}`);
    seen.add(file);
    continue;
  }
  if (!content.includes(search)) {
    if (!seen.has(file)) {
      console.warn(`[fix-ndk27] WARNING: Expected pattern not found in ${path.relative(process.cwd(), file)}`);
    }
    continue;
  }
  content = content.replace(search, replace);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[fix-ndk27] Patched: ${path.relative(process.cwd(), file)}`);
  seen.add(file);
}

if (!allOk) process.exit(1);
