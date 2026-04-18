/**
 * Fraud-check photo: taken when the kiosk sees RunSession as **running** (start of the physical run),
 * uploaded to the backend as pending; persisted on the `runs` row when the result is submitted.
 *
 * Requires a secure context (HTTPS or localhost) for getUserMedia on most browsers.
 */
export async function captureFrontCameraJpegDataUrl(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 200));
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w < 32 || h < 32) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    ctx.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    stream?.getTracks().forEach((t) => t.stop());
    return null;
  }
}
