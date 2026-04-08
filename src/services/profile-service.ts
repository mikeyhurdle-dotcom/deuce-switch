/**
 * Profile Service
 *
 * Handles profile updates and avatar upload via Supabase Storage.
 *
 * PREREQUISITE: A public Supabase Storage bucket named 'avatars' must exist.
 * Create it via: Supabase Dashboard → Storage → New Bucket → "avatars" (public).
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

const AVATAR_BUCKET = 'avatars';
const MAX_IMAGE_SIZE = 800; // px — picker will resize to this

// ─── Avatar Upload ───────────────────────────────────────────────────────────

/**
 * Launch the image picker (camera or library) and return the selected asset.
 */
export async function pickImage(
  source: 'camera' | 'library',
): Promise<ImagePicker.ImagePickerAsset | null> {
  // Camera requires explicit permission request
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'Please enable camera access in Settings to take a photo.',
      );
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Path: avatars/{userId}.jpg (overwrites previous avatar).
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string,
): Promise<string> {
  const filePath = `${userId}.jpg`;

  // Fetch the image as a blob
  const response = await fetch(imageUri);
  const blob = await response.blob();

  // Upload (upsert to overwrite previous avatar)
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  // Get the public URL
  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  // Append cache-buster so the app shows the new image immediately
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Full flow: pick image → upload → update profile → return new URL.
 */
export async function updateAvatar(
  userId: string,
  source: 'camera' | 'library',
): Promise<string | null> {
  const asset = await pickImage(source);
  if (!asset) return null;

  const publicUrl = await uploadAvatar(userId, asset.uri);

  // Update the profile record
  const { error } = await supabase
    .from('profiles')
    .update({ game_face_url: publicUrl })
    .eq('id', userId);

  if (error) throw error;

  return publicUrl;
}

// ─── Profile Updates ─────────────────────────────────────────────────────────

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'bio'
    | 'preferred_position'
    | 'racket_brand'
    | 'racket_model'
    | 'shoe_brand'
    | 'shoe_model'
    | 'location'
    | 'gender'
    | 'game_face_url'
    | 'smashd_level'
    | 'home_club_id'
    | 'tracking_tools'
  >
>;

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
