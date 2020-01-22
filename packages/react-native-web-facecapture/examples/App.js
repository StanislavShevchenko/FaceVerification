import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FaceCapture } from "@gooddollar/react-native-web-facecapture";
export default function App() {
  const [overlayColor, setOverlayColor] = useState("rgba(100,100,100,0.7)");
  const onFaces = (faces, camera, captured) => {
    // camera.pausePreview();
    setOverlayColor("rgba(0,250,50,0.5)");
    console.log("Valid face:", { faces, images: captured.length });
  };

  return (
    <View style={styles.container}>
      <FaceCapture
        //override the default valid face check
        //isValidFace = (viewport :{width,height}, face:mlkitface) => ({ok:true, error:""}),
        //override the default image quality check (brightness)
        //isQualityImage= (base64) => ({ok:true, brightness:0}),
        //add styles to the camera View container
        cameraContainerStyle={{}}
        //add styles to the main View container
        containerStyle={{}}
        //props to react-native-camera component RNCamera
        cameraProps={{}}
        //overlay color:string "rgba(1,253,153,0.5", svg Ellipse props and svg Rect props
        //overlayProps = {ellipseProps, rectProps, color},
        overlayProps={{ color: overlayColor }}
        //override react-native-camera options to takePicture
        pictureOptions={{
          width: 640,
          orientation: "portrait",
          quality: 0.9,
          base64: true,
          doNotSave: true,
          forceOrientation: true,
          fixOrientation: true,
          exif: true
        }}
        onFaces={onFaces}
        onError={e => console.log("onError", e)}
      />
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
