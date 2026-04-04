import { handleCourtFileExport } from '../lib/courtFileExportHandler.ts';

Deno.serve((req) =>
  handleCourtFileExport(req, {
    packetVariant: 'full-8-20260404',
    documentTitlePrefix: 'Court File Export (full packet)',
    exportRoute: 'exportCaseCourtFile',
  })
);
