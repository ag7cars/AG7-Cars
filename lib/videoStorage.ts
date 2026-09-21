// Videos were the first thing to move off Supabase Storage onto this
// server's own disk — lib/localStorage.ts then generalized the same
// idea to cover images too. This file now just re-exports that under
// the original video-specific names so nothing that already imports
// from here (app/api/admin/deliveries/*, app/api/media) needs to
// change.
export {
  localMediaUrlPrefix as localVideoUrlPrefix,
  isLocalMediaUrl as isLocalVideoUrl,
  filenameFromLocalMediaUrl as filenameFromLocalVideoUrl,
  localMediaPath as videoStoragePath,
  saveLocalMediaFile as saveVideoFile,
  deleteLocalMediaFile as deleteVideoFile,
} from "./localStorage";
