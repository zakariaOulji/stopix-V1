import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SignaturePad } from './SignaturePad';
import { storageService } from '@/services';
import { takePhoto } from '@/utils/imagePicker';
import { colors, fonts, radius, spacing } from '@/theme';

export interface ProofSheetProps {
  visible: boolean;
  onClose: () => void;
  stopId: string;
  recipient: string;
  /** Marks the stop delivered immediately (no upload wait). */
  onConfirmed: (proof: { proofUrl?: string; signatureUrl?: string }) => void;
  /** Called later, once the background upload finishes, to attach the URLs. */
  onUploaded?: (stopId: string, proof: { proofUrl?: string; signatureUrl?: string }) => void;
}

export function ProofSheet({ visible, onClose, stopId, recipient, onConfirmed, onUploaded }: ProofSheetProps) {
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mime: string } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [sigOpen, setSigOpen] = useState(false);

  const reset = () => {
    setPhoto(null);
    setSignature(null);
  };

  const onTakePhoto = async () => {
    const img = await takePhoto();
    if (img) {
      Haptics.selectionAsync();
      setPhoto({ uri: img.uri, base64: img.base64, mime: img.mimeType });
    }
  };

  const confirm = () => {
    // Deliver + advance to the next stop IMMEDIATELY. The upload runs detached
    // in the background so nothing blocks the transition.
    const sid = stopId;
    const p = photo;
    const s = signature;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirmed({});
    reset();
    onClose();

    if (!p && !s) return;
    void (async () => {
      try {
        const proofUrl = p ? (await storageService.uploadProof(sid, { uri: p.uri, mime: p.mime }, 'photo')) ?? undefined : undefined;
        const signatureUrl = s ? (await storageService.uploadProof(sid, { text: s, mime: 'image/svg+xml' }, 'signature')) ?? undefined : undefined;
        if (proofUrl || signatureUrl) onUploaded?.(sid, { proofUrl, signatureUrl });
      } catch (e) {
        console.warn('[PROOF] upload failed', e);
      }
    })();
  };

  const deliverWithout = () => {
    onConfirmed({});
    reset();
    onClose();
  };

  return (
    <>
      <BottomSheet visible={visible && !sigOpen} onClose={onClose} title="Preuve de livraison">
        <Text style={styles.recipient} numberOfLines={1}>{recipient}</Text>

        <View style={styles.row}>
          <ProofButton
            icon={photo ? 'checkmark-circle' : 'camera-outline'}
            label={photo ? 'Photo prise' : 'Photo'}
            active={!!photo}
            onPress={onTakePhoto}
          />
          <ProofButton
            icon={signature ? 'checkmark-circle' : 'create-outline'}
            label={signature ? 'Signée' : 'Signature'}
            active={!!signature}
            onPress={() => setSigOpen(true)}
          />
        </View>

        {(photo || signature) && (
          <View style={styles.previews}>
            {photo && <Image source={{ uri: photo.uri }} style={styles.preview} />}
            {signature && (
              <View style={[styles.preview, styles.sigPreview]}>
                <SvgXml xml={signature} width="100%" height="100%" />
              </View>
            )}
          </View>
        )}

        <Button
          label="Confirmer la livraison"
          icon="checkmark"
          size="lg"
          onPress={confirm}
          style={styles.confirm}
        />
        <Pressable onPress={deliverWithout} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>Livrer sans preuve</Text>
        </Pressable>
      </BottomSheet>

      <SignaturePad visible={sigOpen} onClose={() => setSigOpen(false)} onSave={setSignature} />
    </>
  );
}

function ProofButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.proofBtn, active && styles.proofBtnActive]}>
      <Ionicons name={icon} size={24} color={active ? colors.primary : colors.white} />
      <Text style={[styles.proofLabel, active && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recipient: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  proofBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  proofBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  proofLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  previews: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  preview: { width: 80, height: 80, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sigPreview: { backgroundColor: colors.surface },
  confirm: { marginTop: spacing.lg },
  skip: { alignItems: 'center', paddingVertical: spacing.md },
  skipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
});
