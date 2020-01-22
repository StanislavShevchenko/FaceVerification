import React from "react";
import { StyleSheet, Text, View } from "react-native";
import FaceCapture from "./src/faceVerification/FaceCapture";
export default function App() {
  const onFaces = (faces, camera, captured) => {
    // camera.pausePreview();
    console.log("Valid face:", { faces, images: captured.length });
  };

  return (
    <View style={styles.container}>
      <FaceCapture onFaces={onFaces} onError={e => console.log("onError", e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%"
  }
});
