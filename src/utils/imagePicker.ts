import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  base64: string;
  mimeType: string;
}

function toPicked(res: ImagePicker.ImagePickerResult): PickedImage | null {
  if (res.canceled) return null;
  const asset = res.assets?.[0];
  if (!asset?.base64) return null;
  return { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' };
}

export async function takePhoto(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, allowsEditing: false });
  return toPicked(res);
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.5,
    allowsEditing: false,
  });
  return toPicked(res);
}
