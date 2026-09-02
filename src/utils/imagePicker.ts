import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PickedImage {
  /** Local file uri — light, use it for previews. */
  uri: string;
  /** Compressed JPEG base64 — use it for upload. */
  base64: string;
  mimeType: string;
}

/** Resize + compress so the base64 stays small (avoids memory crashes). */
async function compress(uri: string): Promise<PickedImage | null> {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], {
    compress: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) return null;
  return { uri: out.uri, base64: out.base64, mimeType: 'image/jpeg' };
}

export async function takePhoto(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  return compress(res.assets[0].uri);
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  return compress(res.assets[0].uri);
}
