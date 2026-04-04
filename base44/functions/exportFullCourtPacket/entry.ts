import { handleCourtFileExport } from './exportCaseCourtFile.ts';

/** Same PDF engine as exportCaseCourtFile; different labels for debugging / routing. */
if (import.meta.main) {
  Deno.serve((req) =>
    handleCourtFileExport(req, {
      packetVariant: 'full-8-altfn-20260404',
      documentTitlePrefix: 'FULL COURT PACKET (v2)',
      exportRoute: 'exportFullCourtPacket',
      pdfFilenameExtra: '-v2',
    })
  );
}
