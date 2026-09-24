import React, { useRef, useState } from "react";
import {
  View, Text, Image, Pressable, FlatList, StyleSheet,
  useWindowDimensions, Alert, StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sharing from "expo-sharing";

// Expo Go doesn't include the media library native module.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Put your transparent PNG pose silhouettes in /assets/poses and list them here.
const POSES = [
  { id: "1", name: "Hands up", src: require("./assets/poses/pose1.png") },
  { id: "2", name: "Lean back", src: require("./assets/poses/pose2.png") },
  { id: "3", name: "Walking", src: require("./assets/poses/pose3.png") },
];

const OPACITIES = [0.2, 0.3, 0.45]; // tap the opacity chip to cycle

export default function App() {
  const cameraRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [facing, setFacing] = useState("front");
  const [poseIndex, setPoseIndex] = useState(0);
  const [opacityIndex, setOpacityIndex] = useState(1);
  const [showPose, setShowPose] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!camPerm) return <View style={styles.root} />;

  if (!camPerm.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.msg}>Camera access is needed to show the pose guide.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestCamPerm}>
          <Text style={styles.primaryTxt}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const pose = POSES[poseIndex];

  const saveToGallery = async (uri) => {
    if (IS_EXPO_GO) {
      // Expo Go fallback: open the share sheet, then tap "Save image" / "Save to Photos".
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert("Can't save", "Sharing isn't available on this device.");
      return;
    }
    const MediaLibrary = require("expo-media-library"); // only loaded in dev/production builds
    const perm = await MediaLibrary.requestPermissionsAsync(true); // write-only access
    if (!perm.granted) {
      Alert.alert("Photo not saved", "Allow photo access to save pictures.");
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert("Saved", "Photo added to your gallery.");
  };

  const takePhoto = async () => {
    if (!cameraRef.current || saving) return;
    try {
      setSaving(true);
      // The overlay is a separate view, so it is NOT part of the captured photo.
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      await saveToGallery(photo.uri);
    } catch (e) {
      Alert.alert("Couldn't take photo", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Pose outline: sits above the live preview, ignores touches */}
      {showPose && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
          <Image
            source={pose.src}
            resizeMode="contain"
            style={{
              width: width * 0.9,
              height: height * 0.72,
              opacity: OPACITIES[opacityIndex],
            }}
          />
        </View>
      )}

      {/* Top controls */}
      <View style={styles.top}>
        <Pressable style={styles.chip} onPress={() => setShowPose((v) => !v)}>
          <Text style={styles.chipTxt}>{showPose ? "Guide on" : "Guide off"}</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => setOpacityIndex((i) => (i + 1) % OPACITIES.length)}
        >
          <Text style={styles.chipTxt}>Opacity {Math.round(OPACITIES[opacityIndex] * 100)}%</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
        >
          <Text style={styles.chipTxt}>Flip</Text>
        </Pressable>
      </View>

      {/* Bottom: pose picker + shutter */}
      <View style={styles.bottom}>
        <Text style={styles.poseName}>{pose.name}</Text>
        <FlatList
          data={POSES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setPoseIndex(index)}
              style={[styles.thumb, index === poseIndex && styles.thumbActive]}
            >
              <Image source={item.src} resizeMode="contain" style={styles.thumbImg} />
            </Pressable>
          )}
        />
        <Pressable onPress={takePhoto} style={styles.shutterOuter} disabled={saving}>
          <View style={[styles.shutterInner, saving && { opacity: 0.4 }]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  msg: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 16 },
  primaryBtn: { backgroundColor: "#fff", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  primaryTxt: { color: "#000", fontWeight: "600" },
  top: {
    position: "absolute", top: 56, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  chip: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipTxt: { color: "#fff", fontSize: 13, fontWeight: "500" },
  bottom: { position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center", gap: 14 },
  poseName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  thumb: {
    width: 58, height: 72, borderRadius: 10, padding: 6,
    backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 2, borderColor: "transparent",
  },
  thumbActive: { borderColor: "#fff" },
  thumbImg: { width: "100%", height: "100%", tintColor: "#fff" },
  shutterOuter: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" },
});