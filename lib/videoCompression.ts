import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Re-encodes a video to H.264/AAC at a high-quality CRF (18 — widely
 * treated as visually indistinguishable from the source) with no
 * resolution change, so file size drops without any visible quality
 * loss. Phone cameras typically record at a fixed high bitrate rather
 * than an efficient one, so this usually shrinks the file a lot even
 * though nothing about how it looks is being reduced.
 *
 * Throws if ffmpeg isn't available/working in this environment or the
 * encode fails — callers should fall back to the original file rather
 * than let an upload fail outright over this.
 */
export async function compressVideo(buffer: Buffer, extension: string): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available for this platform.");
  }

  const dir = await mkdtemp(path.join(tmpdir(), "ag7-video-"));
  const inputPath = path.join(dir, `input.${extension}`);
  const outputPath = path.join(dir, "output.mp4");

  try {
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath as string, [
        "-y",
        "-i", inputPath,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        outputPath,
      ]);

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error("ffmpeg timed out."));
      }, TIMEOUT_MS);

      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
