// Prefer the selfie camera without requiring it; retry only constraint incompatibility.
export async function requestGestureCamera(mediaDevices, isLive) {
  try {
    return await mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 10, max: 10 },
      },
      audio: false,
    });
  } catch (error) {
    if (!isLive() || !['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(error?.name))
      throw error;
    return mediaDevices.getUserMedia({ video: true, audio: false });
  }
}
