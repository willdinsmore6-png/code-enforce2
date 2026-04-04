import { handleCourtFileExport } from '../lib/courtFileExportHandler.ts';

/** Alternate deploy name — use if the platform still routes the old code to `exportCaseCourtFile`. */
Deno.serve((req) =>
  handleCourtFileExport(req, {
    packetVariant: 'full-8-altfn-20260404',
    documentTitlePrefix: 'FULL COURT PACKET (v2)',
    exportRoute: 'exportFullCourtPacket',
    pdfFilenameExtra: '-v2',
  })
);
