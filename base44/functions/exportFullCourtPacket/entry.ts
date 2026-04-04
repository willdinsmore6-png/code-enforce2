import { handleCourtFileExport } from '../exportCaseCourtFile/handler.ts';

/** Alternate invoke name — same PDF engine; options differ for labels / footer. */
Deno.serve((req) =>
  handleCourtFileExport(req, {
    packetVariant: 'full-8-altfn-20260404',
    documentTitlePrefix: 'FULL COURT PACKET (v2)',
    exportRoute: 'exportFullCourtPacket',
    pdfFilenameExtra: '-v2',
  })
);
