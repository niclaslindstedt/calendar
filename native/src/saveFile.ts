// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Answers the page's save-file requests (`saveFileBridge.ts`): write the bytes
// to the cache, open the share sheet, tell the page how it went. The native
// half of oss-framework's `save-file` contract, as its `docs/native-shell.md`
// gives it.
//
// The payload is the reader's whole calendar backup, so it is handled like
// the notes it is: never logged, handed to nothing but the share sheet, and
// kept on disk only until the next export clears it (in the cache directory,
// which the OS may purge sooner).

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  bareName,
  saveFileResultScript,
  UTI,
  type SaveFileRequest,
} from "./saveFileBridge";

/** Write the bytes to the cache, open the share sheet, answer. */
export async function answerSaveFile(
  request: SaveFileRequest,
  inject: (script: string) => void,
): Promise<void> {
  if (request.version !== 1) {
    inject(saveFileResultScript(request.id, false, "Unsupported version."));
    return;
  }
  // One directory per request, so the file keeps exactly the name the reader
  // sees in the sheet. The previous export's directory goes first: it is not
  // deleted when its sheet closes, because an Android target may still be
  // reading it after the chooser has returned.
  const root = `${FileSystem.cacheDirectory}exports/`;
  const dir = `${root}${request.id.replace(/[^\w-]/g, "_")}/`;
  const uri = dir + bareName(request.filename);
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }
    await FileSystem.deleteAsync(root, { idempotent: true });
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(uri, request.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri, {
      mimeType: request.mimeType,
      UTI: UTI[request.mimeType],
      dialogTitle: bareName(request.filename),
    });
    inject(saveFileResultScript(request.id, true));
  } catch (error) {
    inject(
      saveFileResultScript(
        request.id,
        false,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
}
