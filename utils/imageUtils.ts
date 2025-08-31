/**
 * A collection of utility functions for handling image data.
 */

/**
 * Converts a data URL string (e.g., from a canvas) into a pure Base64 string
 * by stripping the prefix.
 * @param dataUrl The full data URL (e.g., "data:image/jpeg;base64,...").
 * @returns The Base64 encoded data string.
 */
export const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};
